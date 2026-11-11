# Prompt Linter - Android app

Native Jetpack Compose app that mirrors the Prompt Linter web app
(`frontend/`) and browser extension (`extension/`): same branding, logo,
content, pages, and the same deterministic Rules engine.

## What is included

| Screen | Matches web page |
|---|---|
| Overview | Dashboard with metrics, risk distribution, recent analyses |
| Analyze | New UI Prompt Analysis + examples + results/clarification/final prompt |
| History | Search, risk filter, sort, reopen, delete |
| Guide | Guidelines & baseline (elements, attributes, rules, risk bands) |
| About | Hero, problem, workflow, advantages, analysis approach, responsible use |
| Settings | Theme, engine information, local storage, replay onboarding |

Branding uses the same teal/mustard palette and the chat-bubble + check logo
(`ui/components/PlLogo.kt`) as `frontend/src/components/ui/Logo.tsx`.

## Engine parity

- `app/src/main/assets/engine.js` is an exact copy of `extension/engine.js`
  (the JavaScript port of the Python Rules backend in `src/`).
- `data/engine/JsEngine.kt` loads it in an off-screen `WebView` and calls
  `PromptLinterEngine.analyze(text, answers, finalize)`.
- Analysis, clarification, scoring and the final prompt therefore match the
  Rules behaviour of the website and extension.
- BERT and the grounded LLM are **not** run in-app; they remain available in
  the full Streamlit engine, linked from Settings.

## Build

Open this `android/` folder in Android Studio, or from the command line:

```powershell
gradle assembleDebug
```

Requirements: JDK 17+, Android SDK 36, Gradle 9.3.1 (AGP 9.1.1).

## Install on a connected phone

```powershell
adb install -r app/build/outputs/apk/debug/app-debug.apk
```
