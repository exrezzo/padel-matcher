# Padel Matcher - Minimal Supabase Edge Function

This repo currently contains a single, public Supabase Edge Function to verify your deployment pipeline.

Function:
- Name: `hello`
- Path: `supabase/functions/hello/index.ts`
- Auth: Public (JWT disabled via `supabase/config.toml`)

## Prerequisites
- Supabase account & project
- Supabase CLI installed and logged in
  - macOS: `brew install supabase/tap/supabase`
  - Login: `supabase login`

## Link to your project
If you haven't linked this folder to your Supabase project yet:

```bash
supabase link --project-ref <your-project-ref>
```

You can find the project ref in your Supabase dashboard (Project Settings > General), e.g. `abcd1234efgh`.

## Run locally
This serves the function on the local Supabase dev stack.

```bash
supabase functions serve hello
```

Test it in another terminal:

```bash
curl -i http://localhost:54321/functions/v1/hello
```

You should see a 200 response with a JSON body.

## Deploy

```bash
supabase functions deploy hello
```

Because `verify_jwt = false` is set in `supabase/config.toml`, the function is public.

After deploy, test it (replace `YOUR_PROJECT_REF`):

```bash
curl -i https://YOUR_PROJECT_REF.functions.supabase.co/hello
```

Expected response:

```json
{
  "ok": true,
  "message": "Hello from Supabase Edge Functions",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

## Next steps
- Add more functions under `supabase/functions/<name>/index.ts`.
- Keep functions public or enable JWT by setting `verify_jwt = true` per function in `supabase/config.toml`.
- When ready, we can add types, tests, and CI for automatic deploys.

