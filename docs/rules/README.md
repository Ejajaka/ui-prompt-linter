# GitHub Pages demo

This folder is a **permanent, server-free demo** of the UI Prompt Linter.

- `index.html`, `styles.css`, `demo.js` — static UI.
- `py/src/` — a mirror of the Python Rules backend, loaded by Pyodide.
- `py/data/schema.json` — the element schema.
- `examples.json` — example prompts.

It runs the actual Python `analyze_full(..., method="rules", allow_llm=False)`
in the browser, including linking, vague detection, the clarification loop and
the shared risk score.

**BERT and LLM modes are not available in the browser demo** (they need PyTorch
and a local Ollama server). Use `streamlit run app.py` for the full app.

Regenerate the Python mirror after changing `src/`:

```bash
python sync_docs.py
```

The page is automatically served at
<https://ejajaka.github.io/ui-prompt-linter/rules/> once GitHub Pages is enabled for the
`docs/` folder on the `main` branch.
