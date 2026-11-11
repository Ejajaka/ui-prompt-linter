# UI Prompt Linter

**Permanent Rules demo:** <https://ejajaka.github.io/ui-prompt-linter/>  
Runs the actual Python rules engine in your browser via Pyodide ? no server needed.

**Full Streamlit app (BERT + LLM):** deploy or refresh with the badge below.  
If you already deployed it on Streamlit Community Cloud, open the app and click **Rerun / Reboot app**; it auto-redeploys from `main`.


**Source:** <https://github.com/Ejajaka/ui-prompt-linter>

[![Deploy to Streamlit](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://share.streamlit.io/deploy?repository=https://github.com/Ejajaka/ui-prompt-linter&branch=main&mainModule=app.py)

The badge opens Streamlit Community Cloud with this repository pre-filled, which
is the easiest permanent deployment (a Dockerfile is also included).

A UI prompt is often sent to a code/UI generator while important details are missing
("Add a red button" — where? what does it do? what text goes on it?). This project
reads the prompt **before** generation, detects the UI elements, links every
colour/location/action/label to the right element, asks about anything ambiguous,
scores the prompt's risk, and produces a validated final recommendation.

Three detection methods share the same checker and UI:

| Method | What it is | When it is used |
|---|---|---|
| **Rules** | Deterministic Python lexicons, regexes and heuristics | Default; strongest on this dataset |
| **BERT** | Fine-tuned `distilbert-base-uncased` BIO token classifier | Free-form/repeated-noun cases where it beats Rules |
| **LLM** | Grounded JSON extraction via local Ollama | Free-form prompts with no known UI noun, or when Rules/BERT are uncertain |

The **Auto** router chooses one of the three from prompt features. After detection,
a blocking clarification loop asks about missing/unknown/vague/low-confidence
details. A shared deterministic **risk score** (0–100) is shown before and after
clarification. Finally, the LLM can explain the score and recommend next steps;
if it is unavailable, deterministic templates are used.

---

## Quick start

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt        # app only
# or, for training and evaluation:
pip install -r requirements-dev.txt
```

Run the app:

```bash
streamlit run app.py
```

Run the CLI:

```bash
python cli.py "Add a red button at the top right corner that opens the signup form." --backend auto
python cli.py "Add a button." --backend rules --interactive
python cli.py "Add a button." --backend auto --no-llm --json
```

Optional LLM layer (free, local, no API key):

```bash
# Install Ollama, then:
ollama pull qwen2.5:3b-instruct
ollama serve
```

The app and CLI use local Ollama by default. If it is not running, LLM features
are skipped and deterministic explanations are used. An OpenAI-compatible
endpoint can be selected with `LLM_BASE_URL`, `LLM_MODEL` and `LLM_API_KEY`.

Train and evaluate BERT (optional; the app disables BERT without the model):

```bash
python train_bert.py --model distilbert-base-uncased --epochs 5 --lr 5e-5 \
    --batch 16 --max_len 128 --out models/bert_tagger --seed 42

python evaluate.py --backend both --split all
python evaluate.py --backend auto --split all
python evaluate_router.py
```

`train_bert.py` takes about 7 minutes on a laptop CPU and uses a GPU automatically
if one is available. `evaluate.py` writes `results/metrics_*.json`,
`results/errors_*.jsonl` and `results/RESULTS.md`.

Regenerate the browser-demo Python mirror after changing `src/`:

```bash
python sync_docs.py
```

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
 prompt text
     │
     ▼
 tokenize_with_offsets
     │
     ▼
 ┌──────────────────────────────┐
 │ router.route(text)           │  prompt-only features
 │ Rules / BERT / LLM           │  (hex colours, repeated nouns,
 └──────────────┬───────────────┘   landmarks, lexicon coverage, lists)
                ▼
       run chosen detector completely
       ┌──────────┬──────────┬──────────┐
       ▼          ▼          ▼
    Rules       BERT       LLM (grounded JSON)
       └──────────┴──────────┴──────────┘
                │
                ▼
   low detector confidence? ──► LLM extraction fallback
                │
                ▼
   check_elements (schema diff, messages, suggestions)
                │
                ▼
   clarification loop (missing / vague / unknown / low-confidence)
       ask → merge answers → re-validate (max 3 rounds)
                │
                ▼
   shared deterministic risk score (initial → final)
                │
                ▼
   LLM explanation + recommendations + validated best prompt
   (deterministic fallback if Ollama is unavailable)
                │
                ▼
        Streamlit app / CLI / JSON
```

### Module map

| File | Responsibility |
|---|---|
| `src/schema.py` | paths, tag list, element schema, `Span`/`Element`, `NOUN_TO_TYPE` |
| `src/tokenization.py` | the shared tokenizer |
| `src/bio.py` | `repair_bio`, `bio_to_spans` |
| `src/rules_tagger.py` | six-pass rule baseline |
| `src/bert_tagger.py` | inference wrapper + entity confidence for the saved DistilBERT model |
| `src/router.py` | prompt features and the Rules/BERT/LLM decision |
| `src/linking.py` | attribute → element linking and the gold-tag linking metric |
| `src/vague.py` | vague-phrase detection over element clause windows |
| `src/clarification.py` | deterministic questions, answer merge, unresolved tracking |
| `src/risk.py` | shared deterministic 0–100 risk score and levels |
| `src/llm_backend.py` | Ollama/OpenAI-compatible client, grounded extraction, explanation |
| `src/messages.py` | message templates and suggested rewrites |
| `src/checker.py` | schema comparison and final JSON result |
| `src/pipeline.py` | `analyze`, `analyze_full` orchestration |
| `train_bert.py` | DistilBERT fine-tuning (first sub-token labels, `-100` elsewhere) |
| `evaluate.py` | entity, element, linking, missing, risk and routing metrics |
| `cli.py` | command-line interface with interactive clarification |
| `app.py` | Streamlit app with Auto mode, risk gauge and clarification form |

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

### How Auto routing works

The router looks at the prompt before running a heavy backend:

- hex/held-out colours, `CTA`, known UI nouns and explicit cues → **Rules**
- repeated UI nouns, landmark patterns, list-like labels without a cue → **BERT**
- no known UI noun, heavy OOV or vague language → **LLM**
- unclear margin → LLM when enabled, otherwise Rules

BERT must beat Rules by a margin of **1.25** before it is selected; otherwise Rules
is used. This is deliberately conservative: on the provided train/dev splits the
two backends never disagree, so the router is validated on a separate
`router_data/test.jsonl` set and is reported as a heuristic, not a learned model.

### Clarification and risk

Missing required attributes, vague values, unknown element types, low-confidence
detections and unresolved references become deterministic questions. The final
recommendation is blocked until the loop ends (max 3 rounds, 6 questions per
round). Answers are merged structurally and the checker re-runs. “I don’t know”
is allowed and keeps the item unresolved.

The risk score is shared across all detectors:

```
risk = 100 × (0.40·completeness + 0.20·vagueness
            + 0.20·detection_quality + 0.20·unresolved)
```

Levels: Low 0–24, Medium 25–49, High 50–74, Critical 75–100. The UI shows the
initial score and the score after clarification.

### Optional LLM layer

- `LLM` detection is used when the router selects it or when the chosen
  Rules/BERT detector has low confidence.
- The LLM returns strict JSON; attribute values must be copied verbatim from the
  prompt. Ungrounded values are dropped and become clarification questions.
- **Safety gate:** the LLM result is accepted only if it finds more grounded
  elements/attributes than Rules. Otherwise the deterministic result is kept.
- The LLM explains the already-computed risk and recommends next steps. The
  deterministic checklist and placeholders remain the source of truth.
- If Ollama is unavailable, invalid output is rejected and deterministic
  explanations/recommendations are used.
- Recommended local model: `qwen2.5:3b-instruct`. `qwen2.5:1.5b-instruct` is
  faster but noticeably weaker at structured extraction; both are optional.

---

## Results

The table below is pasted from [`results/RESULTS.md`](results/RESULTS.md).
All numbers are micro-averaged; test sets were **not** used for tuning.

### Token-level entity F1 (seqeval)

| split | BERT | Rules | Auto |
|---|---|---|---|
| dev | **1.000** | 0.993 | 0.993 |
| test | 0.900 | **0.973** | 0.971 |
| handwritten_test | 0.718 | **0.837** | 0.828 |

### End metric — missing-attribute detection F1

| split | BERT | Rules | Auto |
|---|---|---|---|
| dev | 1.000 | 1.000 | 1.000 |
| test | 0.977 | **0.989** | **0.989** |
| handwritten_test | 0.926 | **0.978** | 0.968 |

### Prompt-level exact missing-set accuracy

| split | BERT | Rules | Auto |
|---|---|---|---|
| dev | 1.000 | 1.000 | 1.000 |
| test | 0.910 | **0.975** | **0.975** |
| handwritten_test | 0.800 | **0.933** | **0.933** |

### Auto routing

| split | prompts | Rules | BERT | LLM fallback |
|---|---:|---:|---:|---:|
| dev | 150 | 148 | 2 | 0 |
| test | 200 | 197 | 3 | 0 |
| handwritten_test | 30 | 27 | 3 | 0 |

The Auto router requires BERT to beat Rules by a margin of 1.25. It is
deliberately conservative: on the provided data it usually matches Rules, and it
only gave a small gain on the separate `router_data` validation set. LLM
fallback is off in these metrics because no local Ollama model was installed at
evaluation time.

### Other metrics

* **Element detection F1:** 1.000 (BERT) / 0.995 (Rules) on test; 1.000 / 0.986 on handwritten.
* **Attribute linking with gold tags:** 1.000 accuracy on every split for both
  backends (447/447 dev, 627/627 test, 63/63 handwritten). The linking heuristic
  is therefore not the bottleneck.
* **Risk score:** the shared risk formula is deterministic; its components and
  mean values per split are in `results/RESULTS.md`. Risk is higher for prompts
  whose gold analysis has missing attributes and lower for complete prompts.
* **Synthetic vs handwritten gap:** BERT drops from 0.900 → 0.718 entity F1 and
  Rules from 0.973 → 0.837. Hand-written prompts use freer phrasing and also
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
  0.989 for Rules and 0.977 for BERT on test, because linking and the schema check
  recover most boundary errors.
* **Auto is conservative, not magic.** Train/dev have zero Rules/BERT
  disagreements, so the router is tuned on a separate `router_data` set. With
  BERT requiring a 1.25 margin, Auto matches Rules on exact accuracy and gives a
  small gain on `router_data`; it is not a learned model and does not claim to
  pick the oracle winner.
* **Data-size experiment.** We additionally generated 1,595 synthetic training
  prompts using the same held-out vocabulary and retrained. Test F1 moved from
  0.900 to 0.879, i.e. more data of the same templated distribution did not help
  and slightly hurt; we reverted to the provided 800-example training set.
* **LLM features are optional and unproven on this dataset.** No Ollama model was
  installed during final evaluation, so the LLM detection/explanation path is
  reported as implemented with deterministic fallback, not as a measured win.
* We do **not** hide the poor numbers: handwritten LOCATION F1 is 0.129 for both
  backends, and the per-label table in `results/RESULTS.md` shows every label.

---

## Streamlit app

`streamlit run app.py` gives:

* engine radio: **Auto (choose best)**, Rules, BERT (disabled if the model is missing)
* optional LLM toggle for Ollama-backed fallback/explanation
* live mode using `st_keyup` with a 400 ms debounce, or a text area + button
* example prompts loaded from `data/handwritten_test.jsonl`
* a colour-highlighted prompt with tooltips (purple ELEMENT, orange COLOR,
  blue LOCATION, green ACTION, pink LABEL)
* **initial → final risk gauge** with component bars and a grounded explanation
* a green/amber summary banner and one card per element
* a **blocking clarification form** for missing/vague/unknown details
* a final **Best prompt**, recommendations, and unresolved-item list
* a collapsed “Why this engine?” panel with router scores and LLM diagnostics

The app escapes all user text before inserting HTML, truncates prompts over 1000
characters with a warning, and handles empty/emoji/unusual input without crashing.
The BERT model and LLM client are cached with `st.cache_resource`.

For a hosted deployment the model is not committed to Git (too large). Set
`BERT_MODEL_URL` to a release asset containing `bert_tagger/` and the app
downloads it once on first run; otherwise BERT is disabled and Rules still work.
The default URL points at the `model-v1` GitHub release, so a fresh clone with
network access gets BERT automatically. LLM features require a reachable Ollama
or OpenAI-compatible endpoint via `LLM_BASE_URL`; if unavailable, the app still
works with deterministic explanations.

### Permanent full app (Streamlit Community Cloud)

The GitHub Pages demo is Rules-only. For a permanent **BERT + LLM** app:

1. Open the deploy link:
   <https://share.streamlit.io/deploy?repository=https://github.com/Ejajaka/ui-prompt-linter&branch=main&mainModule=app.py>
2. Sign in with GitHub, choose the repository, branch `main`, main file `app.py`,
   and click **Deploy**.
3. BERT works automatically: the app downloads `models/bert_tagger` from the
   `model-v1` release on first use.
4. For LLM features, open **App settings ? Secrets** and add any
   OpenAI-compatible endpoint (see `.streamlit/secrets.toml.example`):

   ```toml
   # OpenCode Go (uses your existing OpenCode key):
   LLM_BASE_URL = "https://opencode.ai/zen/go/v1"
   LLM_MODEL = "deepseek-v4.1-flash"
   LLM_API_KEY = "oc_..."
   LLM_SESSION = "ui-prompt-linter"

   # Or any other OpenAI-compatible provider, e.g. Groq:
   # LLM_BASE_URL = "https://api.groq.com/openai/v1"
   # LLM_MODEL = "llama-3.1-8b-instant"
   # LLM_API_KEY = "your-api-key"
   ```

   Without a key, LLM detection/explanation falls back to the deterministic
   templates; BERT and the risk/clarification flow still work.

Streamlit Community Cloud cannot run Ollama, so a local Ollama model is not
available there. For a fully self-hosted Ollama setup, use the Dockerfile on a
server with enough RAM, or keep the app on a machine that runs Ollama.

#### Hugging Face Docker Space (one command)

If you have a Hugging Face **write** token:

```bash
HF_TOKEN=hf_xxx python deploy_hf_space.py --use-opencode-key
```

This creates a public Docker Space, uploads the app, downloads BERT at runtime
and stores the OpenCode Go key as a Space secret (never in the repository). The
script prints the Space URL.

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
5. the landmark guard (`Add a blue card above the footer.` → one card only);
6. the shared risk score (monotonicity, levels, no-element case);
7. router decisions (hex → Rules, repeated noun/list → BERT, no UI noun → LLM);
8. clarification blocking, structured answer merge, vague-answer follow-up;
9. mocked LLM extraction/explanation (no network) and graceful fallback.

---

## Limitations

* Synthetic prompts are templated; the handwritten split is small (30 prompts).
* English only; 10 element types; complex coreference remains out of scope.
* Vague-phrase detection uses a fixed cue list.
* Linking is a sentence/adjacency heuristic, not a dependency parse.
* The rules encode the task's vocabulary by design; this makes them a strong,
  explainable baseline and explains why they beat BERT on unseen-vocabulary
  synthetic test data.
* DistilBERT is trained on 800 examples and has no colour/number prior; unseen
  hex colours are the main source of its COLOR errors.
* The Auto router is a heuristic. Train/dev have zero Rules/BERT disagreements,
  so it is validated on a separate synthetic `router_data` set and tends to match
  Rules; it is not an oracle.
* The risk score is a hand-weighted heuristic, not a calibrated probability.
* LLM detection/explanation is optional and not yet evaluated at scale here; it
  requires Ollama and degrades to deterministic output when unavailable.
* The BERT checkpoint is not committed to Git; train it or provide `BERT_MODEL_URL`.

## Future work

* Dependency-parse or span-based linking; compare with the current heuristic.
* Span classification (RoBERTa/DeBERTa) and character-level colour features.
* Better handling of held-out vocabulary (data augmentation for colour forms).
* Evaluate the LLM detection branch on a larger human-written set before enabling
  it as a primary router choice.
* Calibrate the risk weights against human judgements of prompt risk.
* Multilingual prompts, more element types, and a FastAPI `/analyze` endpoint.
