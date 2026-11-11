# Prompt Linter - browser extension

A Manifest V3 Chrome/Edge extension that runs the Prompt Linter Rules engine
entirely in the browser (no server, no network, no permissions). The UI matches
the main web app (teal/mustard, the chat-bubble + checkmark logo).

## Load for development

1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select this folder.
3. Pin **Prompt Linter** and click the icon to open the popup.

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Manifest V3 config (popup + icons, no permissions) |
| `engine.js` | JavaScript port of the Rules engine (`src/`) |
| `popup.html` / `popup.css` / `popup.js` | Popup UI |
| `icons/` | Extension icons (16/32/48/128) |
| `store/` | Chrome Web Store / Edge submission text and logo |
| `package.py` | Builds the store logo and upload zip |

## Package for the store

```powershell
python package.py
```

Produces `dist/prompt-linter-extension.zip` (upload this to the store) and
`store/store-logo-300.png`.

## Publish

See `store/publish-steps.md` for the full Chrome Web Store / Edge Add-ons steps,
`store/listing.md` for the listing text, and `store/privacy-policy.md` for the
privacy policy.
