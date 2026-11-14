# Acceptance matrix and remaining gaps

Last verified: 2026-11-14, against the live site
`https://ejajaka.github.io/ui-prompt-linter/` and Supabase project
`trtbkunnanymvjasxhls`.

## Verification executed in the browser

| Check | Result |
| --- | --- |
| Live bundle served | `docs/assets/index-B5d8_SC4.js`, HTTP 200 |
| Auth shell renders, existing session restored | Pass |
| Nav routes present: Compiler, Intelligence, Review, Prompt, Design Systems, Workspace | Pass |
| Console errors while visiting every new route | None |
| TXT upload → extraction → compile | Pass, 8 requirements |
| Source page / paragraph / character trace | Pass |
| Functional vs non-functional classification | Pass, 7 vs 1 |
| Requirement priority classification | Pass, `critical` for auth, `high` elsewhere |
| Requirement approve/reject + audit row | Pass, 8 approvals stored |
| Suggestions generated and accept/reject persisted | Pass, count 12 → 11 after accept |
| Given/When/Then criteria generated and persisted | Pass, 16 criteria |
| Criterion approve + audit row | Pass, 1 approval stored |
| Six-section prompt with approved source text | Pass |
| Approved suggestions and unresolved assumptions separated | Pass |
| Repeated assumptions de-duplicated | Pass, 6 unique |
| Prompt version save and list | Pass, `Version 1` |
| Design system create + version snapshot | Pass, `design_system_versions` v1 |
| Design system version history | Pass, v1/v2/v3 listed |
| Design system restore | Pass, v1 tokens reapplied and v3 recorded |
| Design system selectable in Prompt Studio | Pass |
| Bolt workspace renders prompt + published preview panel | Pass |
| Invalid preview URL rejected | Pass, toast + inline warning |
| Valid `*.bolt.host` URL saved and framed | Pass |
| Panel collapse/resize controls | Pass |
| Regression check against saved baseline | Pass, reports new requirements |

Automated checks: 15 Vitest tests, `tsc --noEmit`, production build, GitHub
Actions `tests` and `pages-build-deployment` all pass.

## Requirement acceptance

| Requirement | Status | Evidence / notes |
| --- | --- | --- |
| Preserve existing React/TypeScript/Vite app, theme, engine, history | Done | Existing pages, toast/theme, Pyodide rules, BERT ONNX and history remain; new work is additive. |
| Web UI exposes BERT only | Done | Engine selector removed from `NewAnalysisPage`; labels updated in header, sidebar and settings. |
| Automatic LLM second opinion on low BERT confidence | Done | `analysisPipeline.ts` calls the LLM when BERT confidence < 0.55, and when BERT is unavailable. Requires LLM settings. |
| Rules remain internal validator | Done | Rules baseline still runs for scoring and fallback; no user-facing mode. |
| Supabase auth, Postgres, Storage, RLS | Done (live) | Signup/login, project isolation, document bucket, policies; unauth insert blocked with `42501`. |
| Publishable key only in frontend | Done | Key only in gitignored `.env.local`; bundle contains the publishable key, never the secret key. |
| No fake Bolt integration | Done | Launch + clipboard transfer, validated published-app iframe, documented fallback. |
| Phases 1–8 delivered | Done | See `docs/PHASE-4-8-REPORT.md`. |
| Tests, type check and production build after each phase | Done | 15 tests, `tsc`, Vite build; CI green. |
| Design system version restore | Done | History list + restore, tested. |
| Regression comparison against saved baseline | Done | Added/changed/removed requirement reporting. |

## Remaining gaps (not blocking normal use)

1. **Graph findings are computed, not individually persisted.** Accepting or
   muting one finding is not stored; the graph recomputes from requirements.
2. **Suggestion and acceptance generation is deterministic.** No LLM-assisted
   suggestion or criterion generation yet; this is intentional for
   reproducibility.
3. **Bolt preview depends on Bolt hosting headers.** If framing is blocked the
   UI relies on the external launch link; the editor itself is never embedded.
4. **Extension and Android clients still expose Rules/BERT/API selectors.**
   Web-first was chosen; parity is a separate change.
5. **LLM second opinion depends on a configured endpoint.** Without
   `LLM_BASE_URL`, `LLM_MODEL` and `LLM_API_KEY`, confident BERT still works and
   low-confidence prompts fall back to the internal rules baseline.

## Manual actions still required

1. Delete the temporary test account
   `vector.verify.1794650029@gmail.com` in Supabase Authentication. Its test
   project, documents, design system, versions, criteria and approvals are
   owner-scoped and will disappear with it.
2. Re-enable **Confirm email** and configure Auth redirect URLs for
   `https://ejajaka.github.io/ui-prompt-linter/`.
3. Rotate the secret key that was shared in chat. It was never stored and
   returned HTTP 401.
4. Deploy the `analyze-requirements` Edge Function and set `LLM_BASE_URL`,
   `LLM_MODEL` and `LLM_API_KEY` as server-side secrets if contextual LLM
   review is wanted.
