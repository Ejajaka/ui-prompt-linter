# AI requirement review function

This Edge Function adds an optional contextual LLM pass on top of the
deterministic graph/ambiguity/conflict/dependency analysis.

The function reads requirements from Postgres using the caller's JWT, so RLS
ensures the user can only review their own project. It never accepts arbitrary
requirement text from the browser.

## Deploy

```powershell
supabase functions deploy analyze-requirements
supabase secrets set LLM_BASE_URL="https://api.groq.com/openai/v1"
supabase secrets set LLM_MODEL="openai/gpt-oss-120b"
supabase secrets set LLM_API_KEY="<server-side provider key>"
```

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are provided by the Supabase runtime.

## Behaviour

- Requires an authenticated user.
- Accepts `{ "projectId": "<uuid>" }`.
- Fetches up to 120 requirements from that project under RLS.
- Returns validated findings only; invalid IDs are discarded.
- The UI keeps deterministic findings even if this function is unavailable.
- Provider credentials remain in Supabase secrets, never in the frontend.
