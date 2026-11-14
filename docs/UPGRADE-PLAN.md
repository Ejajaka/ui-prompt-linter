# Vector Upgrade — Architecture Audit and Implementation Plan

Status: **planning only**. No feature code from this upgrade has been implemented yet.
Target repository: `Ejajaka/ui-prompt-linter`.

## 1. Current repository audit

### What already exists

| Area | Current implementation | Reuse decision |
|---|---|---|
| Deterministic Rules engine | `engine/src/rules_tagger.py`, `checker.py`, `risk.py`, `clarification.py`, `pipeline.py` | Keep as internal deterministic validator. Hide from the main UI. |
| BERT | `engine/src/bert_tagger.py`, `models/bert_tagger`, browser `ui/web-app/src/services/bertEngine.ts` | Make BERT the only visible detector. |
| Grounded LLM | `engine/src/llm_backend.py`, `ui/web-app/src/services/llmEngine.ts` | Keep, but call through a server-side proxy and use only when BERT confidence is low or contextual reasoning is needed. |
| Router | `engine/src/router.py`, `ui/web-app/src/services/analysisPipeline.ts`, extension `runner.js` | Keep the routing/validation logic internally, but the upgraded UI no longer exposes Auto/Rules/LLM choices. |
| Browser pipeline | `analysisPipeline.ts` already handles router, confidence comparison, clarification and LLM explanation | Extend this instead of creating a competing pipeline. |
| Element/attribute extraction | 10-type element schema in `data/schema.json` | Reuse for component-level extraction, then extend with requirement-level entities. |
| Missing/vague detection | `checker.py`, `vague.py`, clarification loop | Reuse as deterministic validation beneath the new contextual analyzer. |
| Risk score | `engine/src/risk.py` | Preserve as **prompt completeness risk**. Add a separate requirement-priority system. |
| Prompt rewriting | `promptBuilder.ts`, `messages.py` | Extend into the required six-section professional prompt generator. |
| React app | `ui/web-app` (Vite, React 19, TypeScript, Tailwind) | Preserve layout/theme and add modules/pages. |
| History | `historyStorage.ts` (localStorage `prompt_linter_history_v1`) | Migrate, never delete silently; keep local fallback during transition. |
| Extension + Android | `ui/extension`, `ui/android` | Preserve. Upgrade after the web platform is stable. |
| Streamlit app | `app.py` | Preserve as legacy full engine and fallback deployment. |
| Tests | 1,224 Python tests, frontend Vitest-style tests, TypeScript checks | Keep green after every phase. |

### What does not exist yet

- Authentication or user accounts.
- Postgres/Supabase schema, storage, RLS, migrations.
- Projects and project-scoped data.
- Requirement-document upload/parsing.
- Requirement graph and visual graph UI.
- Requirement-level ambiguity/conflict/dependency models.
- Acceptance-criteria compiler.
- Professional prompt generator and prompt versions.
- Design-system library.
- Approval workflow/audit trail.
- Regression testing/reuse.
- Server-side LLM proxy (current browser key is in localStorage).
- Bolt workspace integration.

### Current UI engine policy

The current web app exposes `Rules / BERT / LLM` and an `Auto` router.
For this upgrade, the visible policy changes to:

1. **BERT is the only user-selectable analysis engine.**
2. If BERT confidence is below the configured threshold, the platform automatically asks the LLM for a second opinion.
3. The Rules engine remains available internally for deterministic checking, validation, and fallback diagnostics, but it is removed from the user-facing selector.
4. The existing completeness risk score is not renamed or mixed with requirement priority.

This is a deliberate override of the older “preserve all three selectable modes” wording. Engine code and tests remain preserved.

## 2. Target architecture

### Frontend

Keep `ui/web-app` as the application shell and design system.

New feature modules:

```text
ui/web-app/src/
  features/
    auth/
    projects/
    documents/
    requirements/
      compiler/
      graph/
      ambiguity/
      conflicts/
      dependencies/
      implicit/
      edge-cases/
      acceptance/
      approval/
    specification/
    prompt-generator/
    design-systems/
    versions/
    regression/
    bolt/
  services/
    supabase/
    llm/
    document-parser/
  types/
    requirements.ts
    graph.ts
    design-system.ts
    prompt.ts
```

Rules:

- No one massive business-logic file.
- Typed interfaces for every persisted entity.
- LLM output validated by schema before saving.
- Source traceability is mandatory for extracted requirements.

### Backend

Supabase is the preferred backend because no backend provider exists.

- **Auth**: Supabase Auth, email/password and password reset.
- **Database**: Postgres with RLS.
- **Storage**: original PDF/DOCX/TXT/MD uploads.
- **Edge Function** `llm`: server-side proxy for Groq/OpenAI-compatible calls. The service key and provider key never reach the browser.
- **Edge Function** `extract-requirements`: validates and normalizes requirement extraction.
- Document text extraction can happen client-side (PDF.js, Mammoth) so only text and the original file go to storage; parsing must be bounded and resilient.

### Graph UI

Use a dedicated graph view (e.g. React Flow) inside the existing visual language. Nodes: requirement, screen, component, role, interaction, acceptance criterion. Edges: belongs-to, implements, depends-on, triggers, conflicts-with.

### Prompt generator

The professional prompt generator is **template-driven**, not a free-form LLM paragraph:

```text
UI/UX Design Task

[Status]

[Task Title]

[Category]
[Platform]
[Application Type]

1. Objective
2. Problem Statement
3. Requirements
4. Design Guidelines
5. Deliverables
6. Acceptance Criteria
```

The LLM may enrich wording, but only approved requirement data may populate sections. Unapproved suggestions and unresolved assumptions are separated explicitly.

### Bolt integration

Research result: Bolt does **not** provide a supported native editor-embedding API. `bolt.new` is not a supported embed target; published apps on `*.bolt.host` can be iframed with normal iframe constraints. The implementation will therefore be:

- Primary: “Send to Bolt” opens Bolt in a new tab and copies the approved prompt to the clipboard.
- Secondary: user pastes the resulting published `*.bolt.host` URL into the right panel; the app renders it in a sandboxed iframe if the URL is validated.
- If the target refuses framing, show a clear launch-only fallback.
- Do not claim a live embedded editor.

## 3. Database plan

Core tables:

- `profiles`
- `projects`
- `requirement_documents`
- `requirements`
- `requirement_relationships`
- `acceptance_criteria`
- `analysis_runs`
- `prompt_versions`
- `approvals`
- `design_systems`
- `design_system_versions`
- `regression_tests`
- `project_memory`
- `project_members` (future collaboration)

Key fields:

- Every requirement: `id`, `project_id`, `document_id`, `requirement_code`, `original_text`, `normalized_text`, `source_page`, `source_paragraph`, `source_char_start`, `source_char_end`, `kind` (functional/non-functional), `status`, `priority`, `priority_reason`, `created_at`.
- Every relationship: `from_id`, `to_id`, `type`, `confidence`, `evidence`.
- Every approval: `entity_type`, `entity_id`, `decision`, `actor_id`, `reason`, `created_at`.
- Every prompt version: `project_id`, `version`, `prompt_markdown`, `specification_json`, `source_requirement_ids`, `change_summary`.
- Every regression test: `project_id`, `requirement_id`, `test_kind`, `expected`, `last_result`.

RLS rule: all project-scoped rows are accessible only when `auth.uid()` belongs to the project owner/member. Storage objects use project-ID prefixes and matching policies.

Migration must copy existing local history into a user’s first project only after explicit consent; otherwise leave local history intact.

## 4. Phased implementation plan and ETA

ETA is estimate of focused implementation + testing time, not calendar turnaround.

| Phase | Scope | ETA |
|---|---|---|
| 0 | Audit, architecture, plan | **complete** |
| 1 | Supabase schema/RLS, auth pages, protected routes, projects CRUD, local history migration | **6–8 h** |
| 2 | Document upload/parsing, requirement compiler, traceable requirement schema, approval-ready list | **8–10 h** |
| 3 | Requirement graph, contextual ambiguity, conflict detection, dependency detection | **10–12 h** |
| 4 | Implicit behaviours, edge cases, acceptance-criteria compiler | **6–8 h** |
| 5 | UI specification generator, six-section professional prompt generator | **6–8 h** |
| 6 | Design-system library, priority classification, approval workflow/audit trail | **7–9 h** |
| 7 | Requirement memory, prompt versions/comparison, regression detection | **8–10 h** |
| 8 | Bolt launch/transfer fallback, resizable/collapsible two-panel workspace | **5–7 h** |

Total: **56–72 focused hours**, across multiple sessions. Each phase ends with:

- existing Python tests (`pytest -q`);
- new unit/integration tests;
- TypeScript lint (`npm run lint`);
- production build (`npm run build`);
- regression check for existing BERT/Rules/LLM behavior;
- short feature report and updated ETA.

## 5. Phase details

### Phase 1 — Auth, database, projects

- Add `@supabase/supabase-js`.
- Add `src/lib/supabase.ts` using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Add auth provider, login/register/reset pages, protected route wrapper.
- Add projects list/create/open/delete.
- Add migrations and RLS policies under `supabase/migrations`.
- Add migration helper for existing localStorage history.
- Tests: auth guards, project service with mocks, migration idempotency.

### Phase 2 — Requirement Compiler

- Upload PDF/DOCX/TXT/MD to Supabase Storage.
- Parse text client-side; keep original file and extracted text.
- Segment requirements; preserve exact wording and offsets.
- Classify functional/non-functional; extract screens/components/roles/behaviours.
- LLM extraction via Edge Function; deterministic post-validation.
- Persist traceable requirement rows.
- Tests: parser fixtures, malformed files, offset traceability, schema validation.

### Phase 3 — Graph and intelligence

- Graph schema and API.
- Visual graph with filters.
- Contextual ambiguity prompts and deterministic guards.
- Conflict detection with both source references; never auto-resolve.
- Dependency extraction, cycles, and implementation blockers.
- Tests: conflict pairs, cycle detection, ambiguity evidence.

### Phase 4 — Suggestions and acceptance criteria

- Implicit-behaviour suggestions with `ai_inferred` status and accept/reject/modify.
- Edge-case question generator with relevance filters.
- Given/When/Then compiler linked to requirement IDs.
- Tests: approval state transitions, criterion traceability.

### Phase 5 — Specification and prompt

- Deterministic six-section template.
- Separate confirmed requirements / approved suggestions / unresolved assumptions.
- Design-system interpolation.
- Prompt quality validation (all sections present, no invented requirements).
- Tests: golden prompt snapshots, exact section order, source-of-truth checks.

### Phase 6 — Design systems, priority, approval

- Design tokens and component specs.
- Multiple libraries, versions, project association.
- Priority classifier (Critical/High/Medium/Low) with reasons.
- Approval statuses and audit trail.
- Tests: RLS cross-user isolation, priority reasoning, approval transitions.

### Phase 7 — Memory, versions, regression

- Project memory and restoration.
- Prompt version save/compare/restore.
- Requirement-level diff and regression report.
- Reuse unchanged regression tests.
- Tests: version diff, restore, regression detection.

### Phase 8 — Bolt workspace

- Resizable two-panel layout with collapse.
- “Send to Bolt” via new tab + clipboard.
- Published `*.bolt.host` URL validation and optional iframe.
- Detect framing refusal and fall back cleanly.
- Tests: URL validation, state persistence, fallback messaging.

## 6. Existing UI preservation rules

- Keep the current warm editorial theme, navigation, typography, cards and logo.
- Add new routes/pages rather than replacing the shell.
- Keep existing analysis history and legacy analysis reachable.
- Hide the Rules/Auto/LLM selector in the main analysis page; add an “BERT + automatic LLM fallback” status indicator.
- Do not delete the existing Python engine or its tests.
- Maintain extension and Android compatibility; web platform upgrades first.

## 7. Blocking inputs

1. **Supabase project URL + anon key** (or permission to scaffold with placeholders and test with mocks). Service-role key must never be shared or placed in frontend code.
2. Confirmation that “BERT only + automatic low-confidence LLM fallback” applies to the main web app, while the extension/Android keep their current selectors until a later pass.
3. Supabase Edge Functions are required for secure LLM calls; confirm that deployment can use Supabase CLI or the dashboard.

## 8. Implementation status

Phase 1 foundation is implemented and verified end-to-end:

- Supabase client and environment template.
- Auth context, login/register/reset/password-update screens.
- Protected application shell.
- Projects context and project CRUD with a local fallback.
- Initial Postgres schema, indexes, RLS policies and private document bucket.
- Non-destructive local-history migration action.
- Unit test for local project CRUD; TypeScript lint and production build.
- Live verification: signup, profile trigger, logout/login, project create,
  reopen and delete all passed. See `docs/PHASE-1-VERIFICATION.md`.

Production follow-ups: delete the temporary test user, re-enable email
confirmation, configure auth redirect URLs, and rotate the secret key that was
shared in chat.

## 9. Immediate next action

Start Phase 1 with:

- `supabase/migrations/0001_initial.sql`
- RLS policies
- Supabase client and auth context
- Auth pages and protected routes
- Projects CRUD
- Existing-history migration helper
- Tests and build verification

No feature will be marked complete until it has working data flow, persistence, validation, and tests.
