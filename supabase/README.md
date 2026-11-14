# Supabase setup (Phase 1)

The browser uses only the public URL and publishable/anon key.

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable-or-anon-key>
```

Never put `service_role`, `sb_secret_*`, database passwords, or access tokens in
`VITE_*` variables or in the repository.

## Apply the schema

1. Open the Supabase Dashboard for the project.
2. Open **SQL Editor**.
3. Paste and run `supabase/migrations/0001_initial.sql`.

Or, with the Supabase CLI:

```powershell
supabase link --project-ref <project-ref>
supabase db push
```

## Auth redirects

In **Authentication → URL Configuration**, add:

- Site URL: `https://ejajaka.github.io/ui-prompt-linter/`
- Redirect URLs:
  - `http://localhost:3000`
  - `http://localhost:3000/`
  - `https://ejajaka.github.io/ui-prompt-linter/`

For local development, Supabase's default email service is enough. Configure
custom SMTP before inviting real users.

## Storage

The migration creates a private bucket named `requirement-documents`. Objects
must be stored under a project-ID prefix:

```text
<project-id>/<document-id>/<filename>
```

The storage RLS policies use that prefix to authorize access.

## What Phase 1 expects

- `profiles` is populated automatically after signup.
- A signed-in user can create only their own projects.
- Child tables are accessible only through project membership/ownership.
- Existing browser history remains local until the explicit migration action.

## Security checklist

- [ ] Publishable/anon key only in the frontend.
- [ ] Secret/service key only in server-side Edge Function secrets.
- [ ] RLS enabled on every project table.
- [ ] Storage bucket is private.
- [ ] Auth email confirmation configured as desired.
- [ ] Secret key shared in chat has been rotated.
