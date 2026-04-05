# MomentumOS — Project Context for Claude Code

## What This Is

MomentumOS is a personal life operating system built for Satbir Singh (game designer, India). It runs locally on a Mac Mini and is accessed from any device over Tailscale. It is a **single-user private app** — no auth, no multi-tenancy, no external users.

The app is **100% feature-complete and production-ready.** There is nothing left to build. When you open this project on the Mac Mini, the job is **deployment only** — not coding.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 App Router (TypeScript) |
| Database | SQLite via `node:sqlite` (Node built-in, synchronous) |
| Styling | Tailwind CSS v4 + custom CSS variables |
| AI | OpenRouter API (`anthropic/claude-sonnet-4-5`) |
| Server | PM2 process manager |
| Access | Tailscale (private network, no public exposure) |
| Platform | macOS (Mac Mini) |

**Critical**: All DB calls use `DatabaseSync` from `node:sqlite` — synchronous, no async/await. Server components are synchronous Server Components. Never add async to DB layer.

---

## Architecture

```
app/page.tsx          — synchronous Server Component, root dashboard
app/learn/            — curriculum and session learning system
app/pulse/            — live news feed (AI/gaming RSS)
app/profile/          — user profile (timezone, schedule, domains)
app/actions.ts        — all server actions (use server)
lib/db.ts             — all database functions, runMigrations() (runs every load)
lib/one-thing.ts      — getOneThing() — picks single most important priority
lib/openrouter.ts     — chatCompletion(), all AI prompt builders
lib/types.ts          — shared TypeScript interfaces
lib/time-mode.ts      — time-aware mode (morning/focus/afternoon/reflection)
components/momentum-dashboard.tsx — main dashboard client component
```

Database file: `momentum-os.db` (project root, gitignored). Created automatically on first run.

---

## What Is Built (All Features Complete)

### Phase 0 — Foundation
SQLite schema, Next.js scaffold, Tailwind design system, dark theme.

### Phase 1 — Daily OS Core
- Priority manager (add/complete/defer/archive/restore) with intensity tags (Deep/Steady/Light)
- Focus block timer with intensity tracking
- Quick task inbox
- "One Thing" hero card — surfaces single most important priority per time mode

### Phase 2 — Reflection + Intelligence
- Daily reflection (energy win / learning edge / family note)
- Reflection resurfacing at 7/30/90-day intervals
- AI-generated next-day suggestion from reflection data
- Greeting system (100 messages, time/mood/day-of-week aware)
- Soft-close modal ("close the day" with defer/archive/tomorrow seed)

### Phase 3 — Learning System (Spaced Repetition)
- Curriculum builder — AI generates 5–7 module curricula from a goal statement
- Session chat — interactive AI teaching sessions with markdown/code rendering
- Session resume — in-progress sessions restore on page visit
- Post-session loop — confidence rating, what-landed, fuzzy notes, next action
- SM-2 spaced repetition — auto-schedules review for completed sessions
- Pulse Feed — live RSS news feed (AI, game design, HackerNews) at /pulse
  - Category filtering, keyword search, history search, trending panel
  - "→ Learn" button creates a curriculum from any article
  - "→ Task" button creates a quick task from any article

### Phase 4 — Profile + Schedule
- User profile (display name, timezone, about me, domains)
- Schedule drives time mode: sadhana morning/afternoon, work start/end
- Timezone-aware server-side date calculations

### Phase 5 — Intelligence Layer
- **Day 30 / Day 100 milestone narratives** — AI-generated story cards triggered at usage milestones. Amber styling. User clicks "Generate my story" → OpenRouter generates, persists to DB.
- **Energy-aware task surfacing** — `getOneThing()` learns from historical focus block completions (which intensity gets done at which hour-of-day). Requires ≥2 completed blocks at same hour×intensity to apply boost (noise filter). Works silently — no UI change.
- **Monthly narrative summaries** — violet story card appears every month after the first month of use. Summarises previous month's activity. Same generate-on-demand pattern as milestones.

---

## Environment Variables

Only one is required:

```
OPENROUTER_API_KEY=sk-or-...
```

Copy `.env.example` to `.env.local` and fill it in. Without it, AI features (curriculum generation, session chat, milestone/monthly narratives) will error gracefully — the rest of the app works fine.

---

## Deployment Instructions

**Full guide is in `DEPLOY.md`.** Short version:

```bash
# 1. Clone and enter project
git clone https://github.com/gamedesignersatbir-coder/MomentumOS.git
cd MomentumOS

# 2. Set API key
cp .env.example .env.local
# Edit .env.local: set OPENROUTER_API_KEY=sk-or-...

# 3. Install and build
npm install
npm run build

# 4. Start with PM2
pm2 start pm2.config.cjs
pm2 save
pm2 startup   # run the command it prints to enable autostart on reboot

# 5. Verify
curl http://localhost:3000

# 6. Set up automated SQLite backups
chmod +x scripts/backup.sh
crontab -e
# Add this line (update the path):
# 0 2 * * * /Users/satbir/MomentumOS/scripts/backup.sh >> /var/log/momentumos-backup.log 2>&1
```

After PM2 startup, the app survives Mac Mini reboots automatically.

Access from any device on your Tailscale network: `http://<mac-mini-tailscale-ip>:3000`

---

## What Claude Code Should Help With On Mac Mini

When opened on the Mac Mini, Claude Code's job is:

1. **Run the deployment steps** above in order
2. **Debug any errors** that come up during `npm install` or `npm run build` (usually Node version or missing env var)
3. **Set up the backup cron** — find the absolute path to `scripts/backup.sh` and format the crontab line correctly
4. **Verify Tailscale is working** — `tailscale ip` to get the Mac Mini's IP, then test from another device

### Node Version
The app requires Node.js 20+. Check: `node --version`. If it's below 20, install via Homebrew: `brew install node@20`.

### PM2 Startup Command
After `pm2 startup`, macOS will print a command starting with `sudo env PATH=...`. Copy that exact command and run it — this is what makes the app start on reboot.

### If Something Breaks
- Check logs: `pm2 logs momentumos`
- Restart: `pm2 restart momentumos`
- TypeScript check: `npx tsc --noEmit` (should be zero errors)
- Production build: `npm run build` (should succeed cleanly)

---

## Important Rules (Do Not Violate)

- **Never make DB calls async** — `DatabaseSync` is synchronous by design
- **Never add auth** — single-user app, no login
- **Never commit `momentum-os.db`** — it's gitignored, contains personal data
- **Never commit `.env.local`** — it contains the API key
- **runMigrations() runs outside the globalThis singleton guard** — this is intentional so it always runs on HMR reload (prevents "no such column" crashes)
- **ALLOWED_PROFILE_COLUMNS whitelist** in `lib/db.ts` — must be updated if new profile columns are added

---

## Updating the App Later

```bash
git pull
npm install
npm run build
pm2 restart momentumos
```

That's the full update process. The SQLite DB persists between updates.
