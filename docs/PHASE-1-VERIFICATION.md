# Phase 1 verification log

Project ref: `trtbkunnanymvjasxhls`

## Passed end-to-end

- Supabase Auth health: HTTP 200.
- Email/password signup returned a valid session.
- Profile trigger created the matching `profiles` row.
- Password login and logout both succeeded.
- Project create, list, reopen after re-login, and delete succeeded.
- RLS blocks unauthenticated project inserts with
  `42501 new row violates row-level security policy for table "projects"`.
- All 14 Phase 1 tables are present through PostgREST.
- Local project CRUD tests: 2/2.
- TypeScript lint and production build pass.
- GitHub tests workflow passes.

Verification sequence used a temporary user with email confirmation disabled.

## Cleanup / production hardening

- Delete the temporary verification user in Supabase Dashboard -> Authentication -> Users.
- Re-enable **Confirm email** after testing.
- Add Auth redirect URLs:
  - `http://localhost:3000`
  - `https://ejajaka.github.io/ui-prompt-linter/`
- Rotate the `sb_secret_*` key that was shared in chat. It returned HTTP 401
  against the admin/management APIs and was never stored in the repository or
  frontend.
- Keep only the publishable/anon key in the frontend environment.

## Client configuration

`ui/web-app/.env.local` contains only the public project URL and publishable key
and is gitignored.
