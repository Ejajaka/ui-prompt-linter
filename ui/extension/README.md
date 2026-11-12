# Prompt Linter - browser extension

A Manifest V3 Chrome/Edge extension for the Prompt Linter. It supports:

- **Rules** - offline deterministic engine.
- **BERT** - the fine-tuned DistilBERT tagger, downloaded once from GitHub Pages.
- **API** - grounded extraction through a Groq/OpenAI-compatible endpoint.

The UI matches the main web app (teal/mustard, the chat-bubble + checkmark logo).

## Install

- **Microsoft Edge Add-ons (live):**
  <https://microsoftedge.microsoft.com/addons/detail/jheifindpanfdbggckacfodiopdnhadf>
- **Chrome:** load unpacked in Developer mode (below), or package with
  `package.py` for the Chrome Web Store.

## Load for development

1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select this folder.
3. Pin **Prompt Linter** and click the icon to open the popup.

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Manifest V3 config (popup + icons; storage + API/model hosts) |
| `engine.js` | JavaScript port of the Rules engine (`engine/src/`) |
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
