# BUILD SPEC — UI/UX Prompt Completeness Checker ("Vector")

> Reconstructed project specification. The user writes a natural-language UI
> prompt; before it reaches a UI generator the system detects elements, extracts
> attributes, links attributes to elements, checks a required-attribute schema,
> and reports exactly what is missing. Two interchangeable backends are compared:
> a deterministic **rules** baseline and a fine-tuned **DistilBERT** BIO tagger.

## 1. Goal

Given a prompt such as

> Add a red button at the top right corner labelled "Sign Up" that opens the signup form.

report per element which required details are absent, for example:

> Button #1 ("red button"): you didn't say what happens when it is clicked.

The project is graded on novelty (new dataset + problem), implementation (50%)
and a viva; correctness, honest evaluation and clean structure matter more than
extra features.

## 2. Constraints

* Python 3.10+, laptop CPU; GPU auto-detected but optional.
* No paid APIs or API keys. Network only for `pip install` and the one-time
  `distilbert-base-uncased` download.
* The provided `data/` must not be regenerated or edited. `tools/generate_dataset.py`
  is for reproducibility only.
* **No test leakage.** Tune rules/hyperparameters on `train.jsonl` and
  `dev.jsonl` only. `test.jsonl` and `handwritten_test.jsonl` are for final
  reporting; error analysis on them belongs in the report, not in tuning.
* Use the exact tokenizer below everywhere.
* Docstrings on modules; type hints on public functions; seed 42.

## 3. Files

```
BUILD_SPEC.md  tools/generate_dataset.py  requirements.txt  README.md
data/{train,dev,test,handwritten_test}.jsonl  data/schema.json
engine/src/
  __init__.py  schema.py  tokenization.py  bio.py  rules_tagger.py
  bert_tagger.py  linking.py  vague.py  messages.py  checker.py  pipeline.py
engine/eval/train_bert.py  engine/eval/evaluate.py  engine/cli/cli.py  app.py
engine/test/{test_tokenization,test_bio,test_linking_checker,test_pipeline}.py
models/  results/
```

## 4. Data format

One JSON object per line:

```json
{
  "id": "train-0000",
  "source": "synthetic",
  "text": "Create a picture on the right side of a coffee cup.",
  "tokens": ["Create","a","picture","on","the","right","side","of","a","coffee","cup","."],
  "labels": ["O","O","B-ELEMENT","B-LOCATION","I-LOCATION","I-LOCATION","I-LOCATION","O","B-LABEL","I-LABEL","I-LABEL","O"],
  "elem_ids": [0,0,1,1,1,1,1,0,1,1,1,0],
  "elements": [{"id":1,"type":"image",
                "attributes":{"LOCATION":"on the right side","LABEL":"a coffee cup"},
                "missing":[]}],
  "has_missing": false
}
```

Tags are `O` plus `B-`/`I-` for ELEMENT, COLOR, LOCATION, ACTION, LABEL (11 tags,
order in `schema.json`). `elem_ids[i]` is the element a token belongs to (0 =
none) and is used to evaluate linking.

## 5. Schema

| Element | Required |
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

LABEL: button text; navbar/sidebar links; input purpose; card/modal title; image
subject; dropdown choice; footer content; checkbox text. ACTION: button click;
modal trigger; dropdown selection.

## 6. Annotation rules

1. No implicit inference.
2. Vague values are not labelled; the attribute is missing and reported as vague.
3. Landmark nouns inside a location are not elements.
4. An attribute belongs to the element in whose clause it appears.
5. Only the words are labelled; quotes and function words stay `O`.
6. Coreference is out of scope.

## 7. Tokenizer

```python
TOKEN_RE = re.compile(r"\w+(?:'\w+)?|[^\w\s]")
def tokenize_with_offsets(text):
    return [(m.group(), m.start(), m.end()) for m in TOKEN_RE.finditer(text)]
```

A test must reproduce every stored token list.

## 8. Shared structures and utilities

* `Span(label, start, end, text, char_start, char_end)`.
* `Element(id, type, span, attributes, missing, vague)`.
* `repair_bio(tags)` turns stray `I-X` into `B-X`.
* `bio_to_spans(tokens_with_offsets, tags)` returns spans.
* `NOUN_TO_TYPE(span_text)` maps nouns to the 10 element types; unmapped elements
  are ignored with a warning.

## 9. Rules backend

`RulesTagger.predict(text) -> (tokens_with_offsets, tags)` in ordered passes, never
overwriting a claimed token:

1. quoted text → LABEL;
2. UI nouns → ELEMENT (longest phrase, landmark guard);
3. colours → COLOR (modifiers, joined forms, hex);
4. locations → LOCATION (absolute and relational patterns);
5. actions → ACTION (cue + finite verb);
6. remaining labels → LABEL (type-specific cues, prefix labels).

Stop lists and ordering are tuned on train/dev only.

## 10. Linking

`link_spans_to_elements(spans, tokens_with_offsets, text) -> list[Element]`:

* ELEMENT spans with known types become elements id 1..n left-to-right;
* sentences split at `. ! ?`;
* a COLOR/LABEL directly left of an element attaches to it;
* otherwise nearest element to the left in the same sentence, else first right;
* keep multiple spans per attribute; first is displayed.
* `linking_accuracy` evaluates linking with gold tags against gold `elem_ids`.

## 11. Vague detection

`find_vague(clause_text) -> {attribute: phrase}` with regex cues for COLOR,
LOCATION, ACTION and LABEL. The checker runs it on the element clause window
(first token → next element or sentence end). A missing attribute with a cue is
added to `vague`.

## 12. Checker and messages

`check_elements(elements)` computes `missing = required - present`, status,
messages and a suggested rewrite. JSON shape:

```json
{"elements": [{"id":1,"type":"button","text":"red button",
  "attributes":{"COLOR":"red"},
  "missing":["ACTION","LABEL"],"vague":[],"status":"incomplete",
  "messages":["..."],"suggestion":"..."}],
 "summary":{"n_elements":1,"n_incomplete":1,"complete":false,
            "message":"1 of 1 elements has missing details."}}
```

Message wording depends on attribute and element type; vague attributes use
"the {attribute} is too vague ('{phrase}'); please be specific." If no elements
exist: "No UI elements detected. Try mentioning things like a button, navbar or
input field."

## 13. Pipeline

```python
def analyze(text, backend="rules"):
    # tokenise → predict → repair_bio → bio_to_spans →
    # link_spans_to_elements → annotate_vague → check_elements
    return {"tokens": [...], "tags": [...], "spans": [...], "result": {...}}
```

Backends share `predict(text) -> (tokens_with_offsets, tags)` and are cached.

## 14. BERT backend

* Train with `is_split_into_words=True`, first sub-token gets the label, others
  and special tokens get `-100`.
* `Trainer` + `DataCollatorForTokenClassification`, seqeval metrics, best dev F1,
  weight decay 0.01, warmup 0.1, fp16 only on CUDA.
* Save model, tokenizer and `label_map.json`; log per-epoch metrics to
  `results/train_log.json` and plot `results/training_curve.png`.
* Inference wrapper raises a clear error when the model is missing.

## 15. Evaluation

For each (backend, split) save `results/metrics_<backend>_<split>.json` with:

1. entity P/R/F1 via seqeval (overall and per label);
2. element detection P/R/F1 by token-overlap matching;
3. attribute-linking accuracy using gold tags;
4. missing-attribute detection (micro and per attribute/type);
5. prompt-level `has_missing` accuracy and exact missing-set accuracy;
6. breakdown by source.

Write `results/errors_<backend>_<split>.jsonl` and autogenerated
`results/RESULTS.md` (comparison tables, per-label F1, linking, missing detection,
synthetic-vs-handwritten gap, representative errors). Report honestly.

## 16. CLI and Streamlit

* `python engine/cli/cli.py "..." --backend auto|rules|bert [--interactive] [--json]`.
* `streamlit run app.py`: Auto/Rules/BERT engine, optional Ollama, live mode via
  `st_keyup` (debounce 400), examples from `handwritten_test.jsonl`, legend,
  highlighted prompt, initial/final risk gauge, blocking clarification form,
  best prompt, LLM explanation, one card per element with chips/messages.
  Escape user HTML, truncate >1000 chars, never crash, cache BERT and the LLM client.

## 17. Tests

Tokenisation reproduction; BIO utilities; oracle test (gold tags → linking +
checker ≥95% element agreement on dev + handwritten); pipeline smoke tests;
landmark guard.

## 18. Phases

1. skeleton, schema, tokenizer, BIO, tests;
2. linking, vague, messages, checker, oracle test;
3. rules tagger, pipeline, CLI, evaluation on dev;
4. BERT training/inference, evaluate both;
5. Streamlit batch then live;
6. README, full tests, regenerate RESULTS.

## 19. Deliverables checklist

- [x] `pytest -q` passes
- [x] `python engine/eval/train_bert.py` produces `models/bert_tagger/`
- [x] `python engine/eval/evaluate.py --backend both --split all` writes RESULTS and errors
- [x] `streamlit run app.py` works with both backends and live mode
- [x] README with results and limitations
- [x] No edits to `data/`; no tuning on test sets

## 20. Stretch goals (optional)

Implemented beyond the original scope:

- prompt-level **Rules/BERT/LLM router** (`engine/src/router.py`);
- **clarification loop** with structured answer merge (`engine/src/clarification.py`);
- shared deterministic **risk score** (`engine/src/risk.py`);
- optional **LLM layer** for grounded fallback extraction, risk explanation and
  recommendation polish (`engine/src/llm_backend.py`), with deterministic fallback.

Still optional / future:

- dependency-parse linking comparison;
- zero-shot LLM baseline evaluated at scale;
- confusion matrix / length analysis;
- FastAPI `/analyze`.
