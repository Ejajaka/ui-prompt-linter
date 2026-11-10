# UI Prompt Linter

**Live demo:** <https://infrastructure-dts-gathering-analyst.trycloudflare.com>
(temporary tunnel from the author's machine; if it is offline, run
`streamlit run app.py` locally — everything works offline after install).

**Source:** <https://github.com/Ejajaka/ui-prompt-linter>

[![Deploy to Streamlit](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://share.streamlit.io/deploy?repository=https://github.com/Ejajaka/ui-prompt-linter&branch=main&mainModule=app.py)

The badge opens Streamlit Community Cloud with this repository pre-filled, which
is the easiest permanent deployment (a Dockerfile is also included).

A UI prompt is often sent to a code/UI generator while important details are missing
("Add a red button" — where? what does it do? what text goes on it?). This project
reads the prompt **before** generation, detects the UI elements, links every
colour/location/action/label to the right element, compares the result to a
required-attribute schema, and tells the user exactly what is still missing —
with a suggested rewrite.

Two interchangeable backends are compared:

| Backend | What it is | Speed |
|---|---|---|
| **Rules** | Deterministic Python lexicons, regexes and heuristics | instant, CPU |
| **BERT** | Fine-tuned `distilbert-base-uncased` BIO token classifier | ~50 ms, CPU |

Both feed the same linking, vague-phrase detection, checking and UI code.

---

## Quick start

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
```

Run the app:

```bash
streamlit run app.py
```

Run the CLI:

```bash
python cli.py "Add a red button at the top right corner that opens the signup form." --backend rules
python cli.py "Add a button." --backend bert --json
```

Train and evaluate BERT (optional; the app disables BERT without the model):

```bash
python train_bert.py --model distilbert-base-uncased --epochs 5 --lr 5e-5 \
    --batch 16 --max_len 128 --out models/bert_tagger --seed 42

python evaluate.py --backend both --split all
```

`train_bert.py` takes about 7 minutes on a laptop CPU and uses a GPU automatically
if one is available. `evaluate.py` writes `results/metrics_*.json`,
`results/errors_*.jsonl` and `results/RESULTS.md`.

Run the tests:

```bash
pytest -q
```

---

## Dataset

`data/` is the provided dataset. It is **not regenerated or edited**;
`generate_dataset.py` is included only for reproducibility.

| Split | Prompts | Purpose |
|---|---|---|
| `train.jsonl` | 800 | training and rule tuning |
| `dev.jsonl` | 150 | development / checkpoint selection |
| `test.jsonl` | 200 | final reporting only (unseen vocabulary/phrasings) |
| `handwritten_test.jsonl` | 30 | natural hand-written prompts, final reporting |
| `schema.json` | — | 11 BIO tags and the element schema |

Each line is one prompt with aligned `tokens`, `labels` (BIO), `elem_ids`
(token → element id, 0 = none), gold `elements` (attributes and `missing`), and
`has_missing`.

### Element schema

| Element | Required attributes |
|---|---|
| button | LABEL, ACTION, COLOR, LOCATION |
| navbar | COLOR, LOCATION, LABEL |
| input | LABEL, LOCATION |
| card | COLOR, LOCATION, LABEL |
| modal | ACTION, LABEL, COLOR |
| image | LOCATION, LABEL |
| dropdown | LABEL, LOCATION, ACTION |
| sidebar | LOCATION, COLOR, LABEL |
| footer | COLOR, LABEL |
| checkbox | LABEL, LOCATION |

LABEL means the text on a button, the links of a navbar/sidebar, the purpose of an
input, the title of a card/modal, what an image shows, what a dropdown selects,
the content of a footer, or the text next to a checkbox. ACTION means what a
button click does, what opens a modal, or what selecting a dropdown option does.

### Annotation rules (the code follows these)

1. **No implicit inference.** "a login button" does not imply an ACTION.
2. **Vague values are not labelled** ("some nice colour", "somewhere on the side",
   "that does something useful", "with some text"). The attribute counts as
   missing and the UI says it was *too vague*.
3. **Landmark references are not elements.** In "above the footer" or
   "under the hero image", the noun belongs to a LOCATION span.
4. An attribute belongs to the element in whose clause it appears.
5. Only the words themselves are labelled; quotes, "that/which", "labelled",
   "colour" stay `O`.
6. Coreference ("make it blue", "another one next to it") is out of scope.

The tokenizer is fixed by the dataset:

```python
TOKEN_RE = re.compile(r"\w+(?:'\w+)?|[^\w\s]")
```

A test verifies that all 1180 dataset records reproduce their stored tokens.

---

## Architecture

```
                       ┌──────────────────────────────┐
 prompt text  ───────► │ tokenize_with_offsets        │  (regex, char offsets)
                       └──────────────┬───────────────┘
                                      ▼
                    ┌─────────────────────────────────┐
                    │ backend.predict(text)           │
                    │   RulesTagger  │  BertTagger    │  BIO tags
                    └────────────────┬────────────────┘
                                     ▼
                    repair_bio → bio_to_spans (Span objects)
                                     ▼
                    link_spans_to_elements
                      · elements left-to-right
                      · sentence boundaries ( . ! ? )
                      · adjacent COLOR/LABEL → element
                      · otherwise nearest left, else first right
                                     ▼
                    annotate_vague (clause windows + regex cues)
                                     ▼
                    check_elements (schema diff, messages, suggestion)
                                     ▼
                ┌───────────────┬───────────────┬──────────────┐
                │ Streamlit app │ CLI (pretty/JSON) │ evaluate.py │
                └───────────────┴───────────────┴──────────────┘
```

### Module map

| File | Responsibility |
|---|---|
| `src/schema.py` | paths, tag list, element schema, `Span`/`Element`, `NOUN_TO_TYPE` |
| `src/tokenization.py` | the shared tokenizer |
| `src/bio.py` | `repair_bio`, `bio_to_spans` |
| `src/rules_tagger.py` | six-pass rule baseline |
| `src/bert_tagger.py` | inference wrapper for the saved DistilBERT model |
| `src/linking.py` | attribute → element linking and the gold-tag linking metric |
| `src/vague.py` | vague-phrase detection over element clause windows |
| `src/messages.py` | message templates and suggested rewrites |
| `src/checker.py` | schema comparison and final JSON result |
| `src/pipeline.py` | `analyze(text, backend)` orchestration |
| `train_bert.py` | DistilBERT fine-tuning (first sub-token labels, `-100` elsewhere) |
| `evaluate.py` | entity, element, linking, missing and prompt-level metrics |
| `cli.py` | command-line interface |
| `app.py` | Streamlit app with batch and live modes |

### How the rules backend works

Each pass labels only unclaimed tokens, in this order:

1. quoted text → LABEL (quotes stay `O`)
2. UI nouns → ELEMENT, longest phrase first, with a landmark guard
   (a noun within three tokens after a relational preposition is not an element)
3. colours → COLOR (modifiers, joined forms like `off-white`, `#RRGGBB`)
4. locations → LOCATION (absolute `in/at/on the ...` and relational
   `below/next to/... the ...`)
5. action clauses → ACTION (a cue `that/which/to/and` followed by a finite verb)
6. remaining labels → LABEL (type-specific cues such as `with links`, `for`,
   `titled`, `showing`, plus a single-word prefix rule like "search input field")

The rules were tuned on `train` + `dev` only. Test sets were used for reporting,
never for adjusting lexicons or stop lists.

---

## Results

The table below is pasted from [`results/RESULTS.md`](results/RESULTS.md).
All numbers are micro-averaged; test sets were **not** used for tuning.

### Token-level entity F1 (seqeval)

| split | BERT | Rules |
|---|---|---|
| dev | **1.000** | 0.993 |
| test | 0.900 | **0.971** |
| handwritten_test | 0.718 | **0.831** |

### End metric — missing-attribute detection F1

| split | BERT | Rules |
|---|---|---|
| dev | 1.000 | 1.000 |
| test | 0.977 | **0.986** |
| handwritten_test | 0.926 | **0.967** |

### Prompt-level exact missing-set accuracy

| split | BERT | Rules |
|---|---|---|
| dev | 1.000 | 1.000 |
| test | 0.910 | **0.960** |
| handwritten_test | 0.800 | **0.900** |

### Other metrics

* **Element detection F1:** 1.000 (BERT) / 0.995 (Rules) on test; 1.000 / 0.986 on handwritten.
* **Attribute linking with gold tags:** 1.000 accuracy on every split for both
  backends (447/447 dev, 627/627 test, 63/63 handwritten). The linking heuristic
  is therefore not the bottleneck.
* **Synthetic vs handwritten gap:** BERT drops from 0.900 → 0.718 entity F1 and
  Rules from 0.971 → 0.831. Hand-written prompts use freer phrasing and also
  mark locations without the leading "at the" (gold spans there are often just
  "top right corner"), which is why sequence-level LOCATION F1 is 0.129 on that
  split even though attribute detection and missing detection stay high.

### Honest reading of the results

* **Rules beat BERT on the synthetic test set.** The test set deliberately adds
  unseen vocabulary (hex colours such as `#2E86C1`, `maroon`, `sky blue`,
  `off-white`). The rule lexicon contains all of them; DistilBERT never saw them
  in training, so its COLOR F1 falls to 0.837. This is a genuine generalisation
  finding, not a bug: BERT is perfect on dev (1.000) where vocabulary is shared.
* **The end metric is much more stable than token F1.** Missing-attribute F1 is
  0.986 for Rules and 0.977 for BERT on test, because linking and the schema check
  recover most boundary errors.
* **Data-size experiment.** We additionally generated 1,595 synthetic training
  prompts using the same held-out vocabulary and retrained. Test F1 moved from
  0.900 to 0.879, i.e. more data of the same templated distribution did not help
  and slightly hurt; we reverted to the provided 800-example training set.
* We do **not** hide the poor numbers: handwritten LOCATION F1 is 0.129 for both
  backends, and the per-label table in `results/RESULTS.md` shows every label.

---

## Streamlit app

`streamlit run app.py` gives:

* backend radio (Rules / BERT, with an explanation if the model is missing)
* live mode using `st_keyup` with a 400 ms debounce, or a text area + button
* example prompts loaded from `data/handwritten_test.jsonl`
* a colour-highlighted prompt with tooltips (purple ELEMENT, orange COLOR,
  blue LOCATION, green ACTION, pink LABEL)
* a green/amber summary banner
* one card per element with status, attribute chips, missing-detail messages
  (vague ones marked) and a suggested rewrite

The app escapes all user text before inserting HTML, truncates prompts over 1000
characters with a warning, and handles empty/emoji/unusual input without crashing.
The BERT model is cached with `st.cache_resource`.

For a hosted deployment the model is not committed to Git (too large). Set
`BERT_MODEL_URL` to a release asset containing `bert_tagger/` and the app
downloads it once on first run; otherwise BERT is disabled and Rules still work.
The default URL points at the `model-v1` GitHub release, so a fresh clone with
network access gets BERT automatically.

### Docker deployment

A `Dockerfile` is included:

```bash
docker build -t ui-prompt-linter .
docker run -p 8501:8501 ui-prompt-linter
```

The container installs CPU-only PyTorch, runs Streamlit on port 8501, and uses the
same `BERT_MODEL_URL` behaviour described above.

---

## Tests

`pytest -q` covers:

1. tokenisation of every dataset record;
2. BIO repair and span extraction;
3. an **oracle test** that feeds gold tags through linking + checking and requires
   ≥95% element-level agreement on dev and handwritten (currently 100%);
4. pipeline smoke tests (empty input, a bare button, a fully specified prompt);
5. the landmark guard (`Add a blue card above the footer.` → one card only).

---

## Limitations

* Synthetic prompts are templated; the handwritten split is small (30 prompts).
* English only; 10 element types; no coreference or implicit inference.
* Vague-phrase detection uses a fixed cue list.
* Linking is a sentence/adjacency heuristic, not a dependency parse.
* The rules encode the task's vocabulary by design; this makes them a strong,
  explainable baseline but also explains why they beat BERT on unseen-vocabulary
  synthetic test data.
* DistilBERT is trained on 800 examples and has no colour/number prior; unseen
  hex colours are the main source of its COLOR errors.
* The BERT checkpoint is not committed to Git; train it or provide `BERT_MODEL_URL`.

## Future work

* Dependency-parse or span-based linking; compare with the current heuristic.
* Span classification (RoBERTa/DeBERTa) and character-level colour features.
* Better handling of held-out vocabulary (data augmentation for colour forms).
* Follow-up clarification questions generated from `missing`.
* Multilingual prompts, more element types, and a FastAPI `/analyze` endpoint.
* Optional zero-shot LLM baseline behind an explicit flag.
