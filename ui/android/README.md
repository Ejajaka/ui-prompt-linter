# Prompt Linter - Android app

Native Jetpack Compose app that mirrors the Prompt Linter web app
(`ui/web-app/`) and browser extension (`ui/extension/`): same branding, logo,
content, pages, and Rules/BERT/API analysis.

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
(`ui/components/PlLogo.kt`) as `ui/web-app/src/components/ui/Logo.tsx`.

## Engine parity

- `app/src/main/assets/engine.js` is an exact copy of `ui/extension/engine.js`
  (the JavaScript port of the Python Rules backend in `engine/src/`).
- `data/engine/JsEngine.kt` loads it in an off-screen `WebView` and calls
  `PromptLinterEngine.analyze(text, answers, finalize)`.
- Analysis, clarification, scoring and the final prompt therefore match the
  Rules behaviour of the website and extension.
- **BERT** loads the fine-tuned DistilBERT model from GitHub Pages once and runs
  through Transformers.js/ONNX in the WebView.
- **API** calls an OpenAI-compatible endpoint (Groq by default) with the key
  stored in Settings. The APK can also pre-fill the key at build time with
  `VECTOR_TEST_API_KEY`.
- All three engines share the same checker, clarification loop and risk score.

## Build

Open this `ui/android/` folder in Android Studio, or from the command line:

```powershell
gradle assembleDebug
```

Requirements: JDK 17+, Android SDK 36, Gradle 9.3.1 (AGP 9.1.1).

## Install on a connected phone

```powershell
adb install -r app/build/outputs/apk/debug/app-debug.apk
```
