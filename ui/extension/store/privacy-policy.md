# Privacy Policy - Prompt Linter

Prompt Linter is a browser extension that reviews natural-language UI prompts for
missing details before they are sent to a UI generator.

## Data collection

Prompt Linter collects **no data**. It does not:

- collect, store or transmit any prompt text, browsing history, or personal information;
- use analytics, trackers, or cookies;
- require an account or sign-in.

## How it works

All analysis runs locally in your browser using a deterministic rule engine. Your
prompt never leaves your device. The extension only stores your local settings
(such as the selected engine and theme) using the browser's storage API.

## Floating assistant on AI chat sites

On `chatgpt.com`, `chat.openai.com`, `claude.ai` and `gemini.google.com` the
extension adds a small floating **PL** button in the bottom-right corner. It reads
the text currently in the chat composer only when you click that button, analyses
it locally with the same offline rule engine, and shows the result in a panel.
The text is never transmitted to Prompt Linter or any third party, and closing the
panel discards it.

## Clipboard

The popup and floating assistant write to the clipboard only when you explicitly
click "Copy prompt", using the standard Clipboard API on that click.

## Third parties

No data is shared with any third party.

## Contact

For questions or issues, open an issue on the project repository:
https://github.com/Ejajaka/ui-prompt-linter

_Last updated: 2026-11-14_
