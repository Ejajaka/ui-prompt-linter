# Prompt Linter - browser extension

A Manifest V3 Chrome/Edge extension for the Prompt Linter. It supports:

- **Rules** - offline deterministic engine.
- **BERT** - the fine-tuned DistilBERT tagger, downloaded once from GitHub Pages.
- **API** - grounded extraction through a Groq/OpenAI-compatible endpoint.

The UI matches the main web app (teal/mustard, the dark-green "PL" monogram logo).

## Floating assistant on AI chat sites

On `chatgpt.com`, `chat.openai.com`, `claude.ai` and `gemini.google.com` the
extension also adds a floating **PL** button in the bottom-right corner
(`content.js` / `content.css`). Click it to:

1. Read the prompt currently in the chat composer (focused box, otherwise the
   largest visible one).
2. Run the same offline Rules engine as the popup.
3. Show the 0-100 risk score, detected elements, missing/vague details and
   clarification questions.
4. Offer a validated rewrite with a **Copy prompt** button.

It runs entirely on-device with the bundled `engine.js`; no API key, BERT model
or network request is needed.

## Install

- **Microsoft Edge Add-ons (live):**
  <https://microsoftedge.microsoft.com/addons/detail/jheifindpanfdbggckacfodiopdnhadf>
- **Chrome:** load unpacked in Developer mode (below), or package with
  `package.py` for the Chrome Web Store.

## Load for development

1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select this folder.
3. Pin **Prompt Linter** and click the icon to open the popup.

> Chrome refuses to load a folder containing names that start with `_`. If
> Python created `__pycache__` here, delete it (or run `package.py`, which
> cleans it up) and click **Reload**.

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Manifest V3 config (popup, floating assistant, icons; storage + API/model hosts) |
| `engine.js` | JavaScript port of the Rules engine (`engine/src/`) |
| `content.js` / `content.css` | Floating PL assistant injected on ChatGPT, Claude and Gemini |
| `ai.js` | BERT + API extraction bridge |
| `ai-config.js` | Build-time API defaults (key placeholder) |
| `transformers.web.min.js` | Transformers.js runtime |
| `ort.webgpu.min.js`, `ort-common/` | ONNX Runtime Web modules |
| `popup.html` / `popup.css` / `popup.js` | Popup UI |
| `icons/` | Extension icons (16/32/48/128) |
| `store/` | Chrome Web Store / Edge submission text and logo |
| `package.py` | Builds the store logo and upload zip |

## Package for the store

```powershell
python package.py
```

Produces `dist/prompt-linter-extension.zip` (upload this to the store) and
`store/store-logo-300.png`. Set `VECTOR_TEST_API_KEY` before packaging to
pre-fill the API key in the artifact; the key is not written to the source tree.

## Publish

See `store/publish-steps.md` for the full Chrome Web Store / Edge Add-ons steps,
`store/listing.md` for the listing text, and `store/privacy-policy.md` for the
privacy policy.
