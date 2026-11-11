# Publish to the Chrome Web Store / Edge Add-ons - step by step

## 0. Build the upload file

```powershell
python package.py
```

This produces `dist/prompt-linter-extension.zip` (manifest.json at the zip root -
the store requires exactly that) and `store/store-logo-300.png`.

## 1. Register as a developer

- Chrome Web Store: [developer dashboard](https://chrome.google.com/webstore/devconsole)
  - Sign in with the Google account that will own the extension.
  - Accept the agreement and pay the one-time **US$5** registration fee.
- Microsoft Edge (free): https://partner.microsoft.com/dashboard/microsoftedge/public/login

## 2. Create the item

1. Dashboard -> **Add new item**.
2. Upload `dist/prompt-linter-extension.zip`.
3. Wait for it to process/verify.

## 3. Store listing tab

Use `store/listing.md`:
- Name, short description (<=132 chars), detailed description, category
  (**Developer Tools**), language.

## 4. Upload images

- **Store icon**: `store/store-logo-300.png` (the store also uses the manifest icons).
- **Screenshots**: 1-5 required, size 1280x800 or 640x400 (PNG/JPEG). Capture the
  popup showing a risk panel (open it in Chrome, press the screenshot key).

## 5. Privacy tab

Use `store/permissions-and-privacy.md`:
- Single purpose, permission justifications, remote-code = **No**, data-usage boxes
  (all unchecked).
- Host `store/privacy-policy.md` publicly (e.g. on GitHub Pages or a gist) and paste
  the URL. Note: the GitHub Pages site for this repo is at
  `https://ejajaka.github.io/ui-prompt-linter/` - you can also host the policy there.

## 6. Distribution tab

- Visibility: **Public** (or **Unlisted** for a private demo link).
- Regions: all (or just your country).

## 7. Submit for review

- Click **Submit for review**.
- Chrome review usually takes a few days; Edge up to ~7 business days.
- Common rejection causes (low risk here since we request no permissions): unclear
  single purpose, weak privacy policy. The files in `store/` are written to cover
  those.

## 8. Testing without publishing

If you only need it for a demo or class submission, you do **not** need to publish
at all:

- `chrome://extensions` -> Developer mode -> **Load unpacked** -> pick the
  `extension/` folder. Free, instant, works offline.
