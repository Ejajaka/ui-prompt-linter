# Store privacy / permission answers

Use these answers in the "Privacy" tab of the Chrome Web Store dashboard (and the
"Privacy" section of the Microsoft Edge Partner Center).

## Single purpose

Review natural-language UI prompts for missing labels, colours, placement and
actions before they are sent to a UI generator, and produce a validated rewrite.

## Permission justification

- **`storage`** — saves local settings (selected engine, theme, analysis history)
  in the browser. Nothing is synced or uploaded.
- **Content scripts on `chatgpt.com`, `chat.openai.com`, `claude.ai` and
  `gemini.google.com`** — adds the optional floating **PL** button. The script
  only reads the chat composer text when the user clicks that button, analyses it
  locally with the bundled rules engine, and never transmits it.
- **Host access to `api.groq.com`** — only used if the user configures the
  optional API engine and enters their own key. The default Rules engine never
  contacts it.
- **Host access to `ejajaka.github.io` / `cdn.jsdelivr.net`** — only used to
  download the optional BERT model and JavaScript runtime once. The default Rules
  engine works fully offline without them.
- The extension never requests clipboard permission; it writes to the clipboard
  only on an explicit "Copy prompt" click via the standard Clipboard API.

## Remote code

- **No, I am not using remote code.** All executable code is bundled in the
  extension. The optional BERT mode downloads model weights, not code.

## Data usage

- The extension collects **no user data**. Leave all "collect" boxes unchecked.
- It does not use analytics or trackers.
- The default Rules engine transmits nothing. Optional BERT downloads model
  files; optional API mode sends the prompt only to the endpoint you configure.
