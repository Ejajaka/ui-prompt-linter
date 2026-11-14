# Phase 1 verification log

Project ref: `trtbkunnanymvjasxhls`

## Passed

- Supabase Auth health endpoint returns HTTP 200.
- Auth settings: email provider enabled, signup enabled.
- All 14 Phase 1 tables are present and exposed through PostgREST:
  `projects`, `profiles`, `project_members`, `requirement_documents`,
  `requirements`, `requirement_relationships`, `acceptance_criteria`,
  `analysis_runs`, `prompt_versions`, `approvals`, `design_systems`,
  `design_system_versions`, `regression_tests`, `project_memory`.
- An unauthenticated project insert is blocked by RLS with
  `42501 new row violates row-level security policy for table "projects"`.
- Local project CRUD tests pass (`vitest`: 2/2).
- TypeScript lint and production build pass.
- GitHub tests workflow passes.

## Blocked

End-to-end signup/login/project creation is not yet verified:

- `POST /auth/v1/signup` currently returns HTTP 429 (Supabase auth/email rate limit).
- Email confirmation is enabled (`mailer_autoconfirm = false`), so a test account
  cannot be used until its email is confirmed.
- The provided `sb_secret_*` key returns HTTP 401 against the Auth admin and
  Management APIs. It was not stored in the repository or used in the frontend.

## Required action

Choose one:

1. Wait for the Supabase auth rate limit to reset, then sign up once and confirm
   the email, or temporarily disable “Confirm email” in Auth settings.
2. Use a fresh, active server-side secret key **locally** (never paste it in chat
   and never put it in a `VITE_` variable) to create a test user, then remove it.
3. Create a test account manually and verify signup, login, project creation and
   deletion in the deployed UI.

The secret key shared in chat should be rotated regardless.

## Client setup

`ui/web-app/.env.local` contains only the public project URL and publishable key.
It is gitignored. The browser never receives a secret/service key.
