# Chrome Web Store listing

Use this text in the Developer Dashboard when creating the listing.

## Name (max 45 chars)
Prompt Linter - UI Prompt Review

## Short description (max 132 chars)
Check UI prompts for missing labels, colours, placement and actions before you generate. Runs fully offline.

## Category
Developer Tools

## Language
English

## Detailed description

Prompt Linter checks a natural-language UI prompt BEFORE it reaches a UI
generator (v0, Figma AI, ChatGPT, Cursor, Copilot) and tells you what the prompt
forgot to mention - then produces a validated rewrite.

AI UI generators happily build a screen from an incomplete prompt, silently
guessing the details you left out. "Add a button" says nothing about its text,
colour, placement or what it does, so the generator has to invent all four.
Prompt Linter moves the check to the point of intent: the prompt.

HOW IT WORKS
- A deterministic rule engine runs fully offline. No account, no sign-in, no
  data collection.
- Detects 10 UI element types (button, navbar, input, card, modal, image,
  dropdown, sidebar, footer, checkbox) and links colour, location, action and
  label to the correct element.
- Flags missing AND vague details ("some nice colour", "somewhere on the side").
- Asks targeted clarification questions, then merges the answers structurally.
- Scores the prompt 0-100 (before and after clarification) and gives a validated
  final prompt with placeholders for anything still unresolved.

WHAT YOU GET
- A risk panel with the score, completeness and detector confidence.
- The prompt highlighted by element / colour / location / action / label.
- One card per detected element with its missing details and a suggested rewrite.
- Copy the validated prompt into your AI tool of choice.
- Works in the toolbar popup. Fully offline, no sign-in, no data collection.

PRIVACY
- The rule engine is entirely local. Nothing is uploaded, ever.
- The extension requests no permissions and collects no data.

## Support / homepage (optional)
https://github.com/Ejajaka/ui-prompt-linter
