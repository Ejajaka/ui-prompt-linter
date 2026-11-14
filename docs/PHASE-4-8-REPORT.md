# Phases 4–8 implementation report

Status: **core workflows implemented; optional LLM review function and production hardening remain.**

## Phase 4 — Suggestions and acceptance criteria

- Deterministic implicit-behaviour and edge-case suggestions.
- Relevance rules for forms, search, auth, permissions, payments, data views,
  uploads, responsive layouts and repeated interactions.
- Suggestions are explicitly labelled AI-inferred and pending review.
- Accept/reject actions persist in project memory.
- Given/When/Then acceptance criteria generated and linked to requirement IDs.
- Criteria are persisted in `acceptance_criteria`; approvals are audited.
- New **Review & Acceptance** page.

## Phase 5 — Specification and prompt

- Six-section professional prompt generator:
  1. Objective
  2. Problem Statement
  3. Requirements
  4. Design Guidelines
  5. Deliverables
  6. Acceptance Criteria
- Confirmed/approved inputs separated from pending and unresolved assumptions.
- Design-system tokens injected into guidelines.
- Prompt versions saved to `prompt_versions`.
- Version comparison reports added/removed requirements and acceptance criteria.
- Restore an earlier prompt version into the editor.
- New **Specification & Prompt** page.

## Phase 6 — Design systems, priority and approvals

- Multiple design systems with colour, typography, spacing, radius, shadows,
  navigation, responsive, component, button, input and brand tokens.
- Shared library flag and project association.
- Snapshot rows written to `design_system_versions` on create/update.
- Version history lists every saved snapshot and can restore one. Restoring
  applies the saved tokens and records a new version, so history is not lost.
- Requirement priority classifier: critical/high/medium/low with reasons.
- Requirement approve/reject actions update `requirements.status` and append
  `approvals` audit rows.
- Acceptance-criterion approve/reject actions append `approvals` audit rows.
- New **Design Systems** page.

## Phase 7 — Memory, versions and regressions

- Project memory for selected design system, requirement baseline, suggestions
  and published app preview URL.
- Prompt version save/compare/restore.
- Requirement regression comparison: disappeared, changed and newly added
  requirements.
- Baseline can be saved before a modification and checked afterwards.
- See report in the Prompt Studio.

## Phase 8 — Base44 workspace

- Resizable two-panel workspace with left-panel prompt and right-panel Base44 builder.
- Either panel can be collapsed.
- “Send to Base44” copies the approved prompt and opens app.base44.com.
- Embedded Base44 builder plus optional published-app preview.
- If a published app cannot be framed, the UI falls back to the external launch
  link; no fake embedded editor.
- Preview URL persisted in project memory.

## Engine policy change

- The web app now exposes **BERT only**.
- If BERT confidence is below 0.55 and an LLM endpoint/key is configured, the
  pipeline automatically requests a grounded LLM second opinion.
- If BERT is unavailable, the LLM is tried next; otherwise the deterministic
  baseline remains the internal fallback.
- Rules/Auto/LLM are no longer user-selectable in the web analysis UI. Rules
  remain an internal validator so existing checks and risk scoring survive.

## Tests

- 13 frontend tests passing (compiler, graph, conflict/dependency/ambiguity,
  suggestions, acceptance criteria, prompt structure, version diff).
- TypeScript lint passes.
- Production build passes.
- CI runs on every push.

## Remaining work / gaps

- Deploy the `analyze-requirements` Edge Function and configure LLM secrets.
- Production auth hardening: delete test user, re-enable email confirmation,
  configure redirect URLs, rotate the shared secret key.
- Graph findings are recomputed from requirements on each visit; accepting or
  muting an individual finding is not yet persisted separately.
- LLM-assisted suggestion/acceptance generation; current generators are
  deterministic and intentionally conservative.
- Base44 builder and preview remain subject to Base44's framing and cookie policy.
