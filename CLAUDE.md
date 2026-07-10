# AAJ — Project Context for Claude Code

## What This Is

AAJ (*aaj* — "today") is a single-page personal daily app for Satbir Singh
(game designer, India). It replaced MomentumOS — a three-app "life OS" that
was audited, found unusable, and rebuilt small in July 2026. The old app
lives in git history on `main` prior to the AAJ rebuild; its data migrates
in via `scripts/export-momentumos.mjs` + Settings → Import.

Single user. Hosted online (Netlify + Supabase free tiers) behind a
passcode. Reachable from any device, nothing to install.

## The Five Laws (do not violate — these are the product)

1. **One page, forever.** The app is `/` (Today). No modes, no dashboards,
   no time-based UI shape-shifting. Sub-pages exist only for the tutor,
   settings, and saved items.
2. **Capture in two seconds.** One text box, no categories, no required
   metadata, anywhere input is accepted.
3. **The feed ends.** The briefing is ≤10 items, ≤2 per source, twice a
   day, from named sources the user chose. No scores, no tickers, no unread
   counts, no auto-refresh. It always ends with "That's all."
4. **Anchored to routine, never to notifications.** The app never pings,
   never auto-opens modals, never counts guilt (no streaks, no "N overdue").
5. **Nothing the user writes is write-only.** Every stored input must
   visibly return (fuzzy notes → next session; evening lines → monthly
   letter). If a field's output can't be pointed at, delete the field.

**The 30-day rule:** no new features while the app is in its first 30 days
of real use. Resist "wouldn't it be cool if". The research this rebuild is
based on says tinkering is how personal systems die.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 App Router (TypeScript, async Server Components) |
| Database | Supabase Postgres via `@supabase/supabase-js` (server-side only) |
| Styling | Tailwind CSS v4 + CSS variables (light + dark via `prefers-color-scheme`) |
| AI | OpenRouter (`anthropic/claude-sonnet-4-5`) — tutor + monthly letter |
| Auth | Passcode → HMAC session cookie (`lib/auth.ts`, `proxy.ts`) |
| Hosting | Netlify (app) + Supabase (data), both free tier |

## Architecture

```
app/page.tsx               — Today: tasks, briefing, learn strip, tonight line
app/learn/new              — goal → AI curriculum (5–7 modules)
app/learn/[id]             — module list
app/learn/[id]/session     — tutor chat (session resume, fuzzy-memory)
app/saved, app/settings    — bookmarks; profile/sources/import
app/login, proxy.ts        — passcode gate
app/actions.ts             — all server actions
lib/data.ts                — all Supabase queries
lib/briefing.ts, lib/rss   — briefing built once per window, cached in DB
lib/dates.ts               — ALL day math in the user's timezone (IST default)
lib/openrouter.ts          — AI calls + prompts
supabase/migrations/       — schema
scripts/export-momentumos.mjs — one-time export from the old SQLite app
```

## Key mechanics

- **Tasks**: 3 active per day; overflow lands on tomorrow. Older active
  tasks surface once as "From before — carry / let go". No archive/defer
  vocabulary.
- **Briefing windows**: `{day}-am` (08:00–17:59) / `{day}-pm` (18:00+) in
  the user's timezone; before 08:00 shows the previous `-pm`. Built on
  first request of a window, cached in the `briefings` table.
- **Tutor**: sessions end with ONE tap; the only optional field is
  "what's still fuzzy?", which is injected into the next session's system
  prompt (`getPriorFuzzy`). User messages persist before the AI call — an
  AI failure never loses input.
- **Reviews**: one per (curriculum, module), upserted on session
  completion; ladder 2/7/21/60 days; at most ONE review line shows on
  Today, with revisit / got it / never again. Never a count.
- **Monthly letter**: if last month has ≥3 evening lines, a letter card
  appears during the first 10 days of the new month, generated on demand.

## Environment variables

See `.env.example`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`APP_PASSCODE`, `AUTH_SECRET`, `OPENROUTER_API_KEY`. AI features fail
gracefully without the OpenRouter key; the rest of the app works.

## Rules

- All DB access is server-side (server components / actions). The service
  role key must never reach a client component.
- All day keys are computed in the user's timezone via `lib/dates.ts` —
  never `new Date().toISOString().slice(0,10)`, never server-local time.
- Deleting is honest: "let go", "never again", "archive" do what they say.
  No UI element may be a no-op — this killed the old app.
- Checks: `npm run lint` (typegen + tsc) and `npm run build` must be clean.
