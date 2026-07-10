# AAJ

*aaj* — "today". One page for the day: up to three tasks, a briefing that
ends, an AI tutor that remembers what was fuzzy, and one optional line at
night. Single user, passcode-gated, hosted on Netlify + Supabase.

Built as the deliberate replacement for MomentumOS after an audit and
research pass on why personal "life OS" apps get abandoned. The design
rules live in `CLAUDE.md` ("The Five Laws").

## Run locally

```bash
cp .env.example .env.local   # fill in Supabase + passcode + OpenRouter
npm install
npm run dev
```

Apply `supabase/migrations/0001_init.sql` to your Supabase project once
(SQL editor or CLI).

## Deploy

Netlify auto-builds from this repo (`netlify.toml`); set the same env vars
in the Netlify site settings.

## Migrating from MomentumOS

On the machine with the old app:

```bash
node scripts/export-momentumos.mjs   # writes aaj-export.json (also a full archive)
```

Then AAJ → Settings → Import, upload the file.
