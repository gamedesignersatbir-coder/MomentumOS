# MomentumOS — Unified Personal Life OS
**Design Specification**
*Date: 2026-03-13 · Revision 3 (all spec-review issues resolved)*
*Status: Ready for implementation planning*

---

## 1. What We're Building

A unified personal Life OS — one private web app, hosted on Satbir's Mac Mini, accessible from anywhere via Tailscale. One intelligent, time-aware, adaptive companion that knows its user and gets better the longer it's used.

The governing question for every design decision: **does this help Satbir, or does it become another thing Satbir has to manage?**

**What it is not:** a dashboard full of equal-weight sections. The four modules exist, but the UI presents one coherent surface that adapts — not four tabs fighting for attention. The difference is in what's *leading* at any moment, not in whether the other things exist.

---

## 2. The User

**Satbir** — game designer, meditator, curious technologist, father of two, spiritual practitioner (Heart of Living / sadhana), lover of Terry Pratchett-style wit.

**His daily schedule** (sacred and non-negotiable):

| Time | What's happening |
|------|-----------------|
| Pre-8am | Morning sadhana — meditation + exercise. App in quiet mode. |
| 8–9am | Morning transition. Day starts here. |
| 9am–2pm | Primary work window — game design, AI projects, deep learning |
| 2–3pm | Afternoon sadhana — second meditation. App in quiet mode. |
| 3–3:30pm | Lunch |
| 3:30–6:30pm | Afternoon work — lighter tasks, news, reviews |
| 6:30–7pm | Commute home |
| 7–9pm | Evening — family, home, relaxed learning, news |
| 9pm+ | Reflection time |

**"Quiet mode" defined:** During sadhana windows, the app renders a full-screen ambient view — greeting message only, no task lists, no action buttons, no notifications. The greeting acknowledges the time: *"This is your reflection time. Everything here will wait."* No data is hidden or deleted; the state simply doesn't surface. Implemented via a time-check in the root layout that overrides the normal view.

**His core patterns to design around:**
- Decision paralysis when too many things compete — he freezes and switches without completing
- Curiosity hijacks focus (self-aware about this)
- Staying informed = professional identity + sense of a good day
- Accomplishment = meaningful work done AND something new learned
- Needs direction and noise reduction, not motivation

---

## 3. The Four Modules

### Module 1: Daily OS

Daily planning, task management, focus blocks, priorities, nightly reflection.

**Today's One Thing — algorithm spec:**
- Input: list of uncompleted priorities, sorted by `rank` (existing field in DB)
- Tiebreak 1: tasks not touched in the longest time (by `updated_at`)
- Tiebreak 2: highest rank
- Time filter: if current mode is Focus (9am–2pm), exclude Light tasks; if Afternoon (3:30–6:30pm), sort by intensity first (Steady → Light → Deep) as the primary sort key, then apply rank/updated_at tiebreaks within each intensity group
- Output: a one-sentence string composed as `"{task title}"` — no AI generation, no template expansion. Just the task title, presented with intention. Can be dismissed (hides for 1 hour) or marked done (clears it).
- Re-derives on every page load and after any task state change.

**Top 3 Priorities:**
- Maximum 3 visible. If more exist, a collapsed "and N more..." appears — one tap expands.
- Priority rank 1–3 maps to visible; rank 4+ is folded by default.
- User can reorder via drag-and-drop.

**Focus Blocks:**
- User-created time slots: label, start time, end time, intensity (Deep / Steady / Light)
- Not AI-suggested (in Phase 1). They are manual — the user schedules their own blocks.
- Displayed as a simple timeline column, not a full calendar
- Can be toggled as active / done

**Quick Capture:**
- Single text input, always accessible (keyboard shortcut: `c`)
- On submit: creates a Quick Task with status `inbox`
- Inbox items appear in a dedicated "Inbox" row separate from priorities
- Triage: user promotes to priority (assigns rank) or archives. No auto-promotion by AI in Phase 1.

**Anti-overwhelm triage:**
- Trigger: when `active_priorities + active_quick_tasks > 8`
- UI: a full-screen triage modal. Shows each item as a card. Two buttons: **Keep** / **Defer**
- Defer = sets status to `deferred`, item disappears from main view, accessible via "Deferred" section
- After triage: visible list is 5 or fewer items. Modal closes.
- Triage is not forced — it appears as a gentle prompt ("Things are getting full — want to do a quick triage?") and can be dismissed.
- If the user clicks Keep on everything and closes the modal without reducing the count, the modal closes without penalty. The prompt re-surfaces at next app load if the count is still >8. No punishment, no lock-out.

### Module 2: Learning Coach

A structured curriculum the user can also talk to. AI builds the path, user walks it, both can go off-script.

**Curriculum generation:**
- User inputs a goal statement (natural language: "I want to understand programming basics so I can guide AI better")
- App sends to OpenRouter (Claude Sonnet) with a system prompt that: knows Satbir's domains, knows his level (new to programming, experienced in game design), instructs the model to produce a structured JSON curriculum with modules, each module having: title, description, estimated minutes, prerequisite module IDs, learning objectives
- Curriculum stored in DB as JSON in a `curricula` table
- User can have multiple active curricula (one per domain)

**Conversational layer:**
- Each learning session has a chat interface (simple message list)
- System prompt includes: current module title/description, previous session notes, any open question from pre-session
- User asks questions, goes off-script — AI responds in context
- Chat history stored per session in `learning_sessions` table

**Pre-session context:**
- Shown before chat opens: last session's "what's still fuzzy" note + one suggested question to hold in mind (derived from the fuzzy note by simple template: "Last time: [fuzzy note]. Keep this in mind.")
- No AI generation for pre-session in Phase 2 — templated is fine

**Post-session loop:**
- Two text fields: "What landed?" / "What's still fuzzy?"
- Confidence rating: 1–5 (existing pattern from MomentumOS)
- Next action: one text field
- On submit: creates spaced repetition entry with `next_review = today + 1 day`, `ef = 2.5`, `n = 0`

**Spaced repetition (SM-2):**
- Stored fields per entry: `item_id`, `item_type` (learning_entry / reflection / goal), `n`, `ef`, `next_review_date`
- Review trigger: any item where `next_review_date <= today` surfaces in morning brief or evening view
- Review UI: shows the original content. One question: "Does this still feel relevant / understood?" User rates 0–5 (or simplified: Not really / Somewhat / Yes clearly = maps to 2 / 3 / 5)
- SM-2 update applied after rating. Next review date recalculated. EF floor: never below 1.3 (standard SM-2 constraint — must be enforced in update function).
- SR item linkage convention: `sr_items.item_type = 'learning_session'` + `sr_items.item_id = learning_sessions.id`. No back-reference column needed in `learning_sessions`; query by `(item_type, item_id)` pair.
- 365-day interval items are tracked but only surfaced if the app has been in use >300 days — no implementation complexity needed now

**Initial domains for Satbir:**
1. Programming basics (to guide AI, not to become a developer)
2. Agentic AI and AI tools
3. Game design craft (deepening existing expertise)

### Module 3: Pulse Feed

Real-time news on gaming, AI, and tech — converted from passive reading into fuel. Source is the existing PulseFeed project (github.com/gamedesignersatbir-coder/pulse-feed), whose parsers and API integrations we reuse. The UI and data logic are redesigned.

**The core design shift: articles → stories**
PulseFeed currently fetches 500+ items and dumps them on screen. The integrated version shows a maximum of 20 *stories* — each story groups multiple articles covering the same event into one card. One headline, source count ("covered by 4 sources"), one AI summary. Expand to see individual sources. Eliminates overwhelm without losing coverage.

**What we keep from PulseFeed:**
- All source parsers: RSS (18 outlets), Reddit (10 subs), Hacker News, Bluesky, GitHub trending, Steam
- OpenRouter summarization logic (Claude Haiku)
- Bookmark system (maps to save action)

**What we redesign:**
- UI entirely — single column, story cards, no drama meter, no breaking ticker
- Volume cap — hard limit of 20 stories; AI picks the most relevant to Satbir's domains
- Story clustering — group articles by title similarity (building on existing Jaccard logic)
- Filtering — by domain (AI / gaming / game design / tech), not checkboxes
- Time decay — stories older than 48h rank lower regardless of engagement

**Sources to add (currently missing):**
- Game Developer (gamedeveloper.com) — industry-level game design
- 80 Level (80.lv) — art, design, game dev deep-dives
- Hugging Face Blog — AI research and model releases
- Simon Willison's Blog (simonwillison.net) — serious AI practitioner writing
- The Decoder (the-decoder.com) — quality AI news without hype

**Remove entirely:** drama scoring, breaking news ticker, source toggle checkboxes

**News-to-action bridge:**
- On each story card: "Does this spark something?"
- Three options: **Learning note** (prefilled with story title + URL, attached to relevant curriculum) / **Game design idea** (creates a Quick Task tagged `game-design-idea`) / **Bookmark**
- One tap, no form unless user wants to add a note.

**Contextual relevance:**
- Stories matching active learning module topics surface higher
- Tag/keyword matching against current tasks and curriculum — not ML

**Connection surfacing:**
- If ≥5 saved items share a domain/tag: *"You've saved 5 items on procedural generation. Add to your learning curriculum?"*
- Simple tag-count check.

**Schema:**
```sql
pulse_stories (id, headline, summary, article_ids_json, domain, tags_json,
               source_count, fetched_at, relevance_score)
pulse_articles (id, title, url, domain, tags_json, summary, published_at, fetched_at)
pulse_saves (id, story_id, article_id, save_type, note, tags_json, created_at)
```

**Time-aware surfacing:** follows the schedule in Section 5.

### Module 4: Profile & Context

Not a settings page — a context layer the app actively uses.

**What it stores:**
- Display name, domains of focus (multi-select from predefined list + custom)
- Sadhana window times (defaults from this spec; user can adjust)
- Work schedule start/end
- A free-text "About me" field that is injected into AI system prompts

**Energy pattern learning (Phase 5, not Phase 1–4):**
- Deferred until sufficient data exists (>30 days of task completions with intensity ratings)
- Implementation: compute completion rate by intensity type by time-of-day bucket; surface higher-completion intensity types during those time windows
- No implementation needed before Phase 5

---

## 4. Greeting Message System

**What it is:** A single line of text at the top of the app, always present, carrying the personality of the app. Terry Pratchett tone: warm, observational, specific, witty without being jokey.

**Context flags that select a message:**
- Time window (morning brief / focus / lunch / afternoon / evening / reflection / quiet/sadhana)
- Load level (empty / normal / full / overloaded)
- Day of week (Mondays get special treatment)
- Recent completion state (just completed something / nothing completed today)
- Absence flag (not opened in 3+ days)
- Milestone (Day 30 / Day 100)

**Implementation:**
- Messages stored as a JSON array with context tags
- Selection: filter by matching context flags, exclude any shown in last 30 days, pick randomly from remainder
- Phase 1 target: 40 messages across the key combinations. Expand to 100+ over time.
- AI-generated messages (via OpenRouter): only for milestone days (Day 30, Day 100) and returns-after-absence. These are generated once, stored in DB, never regenerated unless deleted.

**Sample messages (to establish tone):**

*Morning, normal load:* "Morning. Three things. One direction. Let's see what the day is made of."

*Empty task list:* "The to-do list is suspiciously empty. Either you've conquered everything, or you haven't started yet."

*Overloaded:* "The to-do list has been training. It is in excellent shape. You, meanwhile, might want a triage."

*Monday:* "It's Monday. The universe is aware."

*Sadhana time:* "This is your reflection time. Everything here will wait."

*After 3 days away:* "You're back. The app kept everything warm."

*Nothing completed today but it's evening:* "Today was more of a thinking day, it seems. Those count too."

*Day 30:* *(AI-generated, specific to Satbir's actual activity)*

---

## 5. Time-Aware Adaptive UI

| Time | App Mode | What leads | What steps back |
|------|----------|------------|-----------------|
| Pre-8am | **Quiet** | Greeting only | Everything |
| 8–9am | **Morning Brief** | Today's One Thing + one Pulse headline + one learning reminder | Full task lists, details |
| 9am–2pm | **Focus** | Today's One Thing, active priorities, current learning module | Pulse feed (collapsed), reflection |
| 2–3pm | **Quiet** | Greeting only | Everything |
| 3–3:30pm | **Lunch** | Pulse feed (light reading) | Tasks, deep work |
| 3:30–6:30pm | **Afternoon** | Lighter tasks (Steady/Light), Pulse feed, reviews | Deep work tasks |
| 6:30–7pm | **Transition** | One-tap quick log prompt | |
| 7–9pm | **Evening** | Full Pulse feed, family/home tasks, relaxed learning | Work deep tasks |
| 9pm+ | **Reflection** | Nightly reflection, tomorrow seed | Everything else |

Mode is determined client-side from `new Date()` on each render. No server involvement. User's timezone set in profile.

**"I'm Stuck" button:**
- Small, not prominent — sits in the corner, always accessible
- On tap: everything collapses to one sentence derived from Today's One Thing algorithm
- The sentence: *"The one thing that would make today feel complete is: [task title]."*
- Two options visible: **Start it** (opens focus timer or marks as in-progress) / **Show me everything** (returns to normal view)
- Exists in all modes except Quiet and Reflection

---

## 6. Intelligence Behaviors

### Cross-section connections (Phase 5)
- Learning module completed → check open tasks for matching tags/keywords → surface suggestion
- Pulse article saved to Learning → if matching curriculum module exists → surface: "You read about this — start the module while it's fresh?"
- Implementation: keyword matching on tags + domain labels. Not embeddings or ML in Phase 5.

### Spaced resurfacing
- Applied to: reflection entries, learning session notes, goals, saved Pulse articles
- Schedule: 1 day → 7 days → 30 days → 90 days (365 deferred until app is >300 days old)
- Surfaces in: morning brief (one item max) and evening view
- Prompt: *"[X days] ago: [content]. Still relevant?"* Simple yes/no — yes resets to next interval, no archives it

### Soft close of the day (9pm)
- Gentle prompt in Reflection mode: "How did today go? (takes 60 seconds)"
- Shows uncompleted active tasks — each has: **Carry forward** / **Defer** / **Archive**
- One field: "What's the one thing for tomorrow?" → stored as next day's seeded priority
- On submit: tomorrow starts with clean state; deferred/archived items leave the main view

### Minimum viable evening log
- Separate from (and simpler than) the full nightly reflection
- Two fields: "What did you actually do today?" / "What's the one thing for tomorrow?"
- The full nightly reflection (energy / learning edge / family note) is always optional and clearly labeled as such

### 100-day arc
- Day counter visible in the profile/header: "Day 34"
- Day 30: AI generates a short narrative from activity data — tasks completed, learning sessions, domains touched. Stored in DB. Shown as a card in the morning brief.
- Day 100: same, longer, shown as its own full-screen moment
- Monthly summary: AI-generated, triggered on the 1st of each month after month 2, from prior month's data. Stored and accessible in a "History" section.
- Not implemented until the app has enough data — minimum viable: Day 30 feature ships in Phase 5 only.

---

## 7. Data Schema (Core Tables)

Extension of existing MomentumOS schema (which already has: priorities, focus_blocks, quick_tasks, learning_entries, prompts, reflections).

**New tables for Phase 2–5:**

```sql
-- Learning module
curricula (id, title, goal_statement, domain, modules_json, created_at)
learning_sessions (id, curriculum_id, module_index, chat_history_json,
                   what_landed, whats_fuzzy, confidence, next_action, created_at)

-- Spaced repetition
sr_items (id, item_type, item_id, n, ef, next_review_date, last_shown_at)

-- Pulse Feed
pulse_articles (id, title, url, domain, tags_json, summary, published_at, fetched_at)
  -- tags_json: array of strings e.g. ["procedural generation", "AI", "indie"]
  -- populated from RSS feed categories or AI-extracted keywords (Phase 3 decision)
pulse_saves (id, article_id, save_type [learning_note/game_idea/bookmark],
             note, tags_json, created_at)
  -- tags_json: copied from article at save time; used for connection-surfacing count queries

-- Greeting system
greeting_history (id, message_hash, shown_at)
greeting_messages (id, text, context_tags_json, is_ai_generated)

-- Milestones / narratives
narratives (id, narrative_type [day30/day100/monthly], content, generated_at)

-- Profile
user_profile (id, display_name, domains_json, sadhana_start, sadhana_end,
              afternoon_sadhana_start, afternoon_sadhana_end,
              work_start, work_end, timezone, about_me, created_at, updated_at)
```

Existing tables remain unchanged. Migration scripts added per phase.

---

## 8. Technical Architecture

**Stack:**
- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS
- Database: SQLite with WAL mode enabled (handles concurrent reads from multiple Tailscale devices)
- AI: OpenRouter API — model `anthropic/claude-sonnet-4-5` (or equivalent best-available Claude via OpenRouter at build time)
- Process manager: PM2 (runs Next.js on Mac Mini)
- Private access: Tailscale
- Auth: Next.js middleware checking a session cookie against a bcrypt-hashed password stored in an env variable. Single user — no OAuth, no user accounts. Login page → session cookie → all routes protected. Cookie lifetime: 30-day persistent (not session-only) — Satbir's personal devices stay logged in.

**OpenRouter usage and cost profile:**
- Learning Coach conversations: ~1,000–2,000 tokens per session. Cost: ~$0.003–0.006 per session at Sonnet pricing.
- Greeting messages (milestone/absence only): rare, negligible cost
- Curriculum generation: one-time per curriculum, ~2,000 tokens
- Monthly narrative: ~1,500 tokens, once a month
- Estimated total: under $5/month at moderate use. Well within OpenRouter budget.

**Tailscale setup:**
- Install Tailscale on Mac Mini, home computer, work laptop, phone
- App accessible at `http://[mac-mini-tailscale-ip]:3000` or custom hostname via MagicDNS
- No public internet exposure — app is invisible outside Tailscale network
- SSL: Tailscale's HTTPS certificates for MagicDNS hostnames

---

## 9. Build Phases

### Phase 0: Foundation (before feature work begins)
*Goal: working baseline deployed to Mac Mini; Pulse Feed source resolved*
- Deploy existing MomentumOS codebase to Mac Mini with PM2
- Set up Tailscale; verify app is accessible from at least one other device
- ✅ Pulse Feed located: github.com/gamedesignersatbir-coder/pulse-feed — fully analysed. Parsers and OpenRouter summarization reused. UI and data logic redesigned (articles→stories, 20-item cap, drama scoring removed). See Module 3 spec.
- Write the initial 40 greeting messages (creative task — can be done in parallel)
- *Deliverable: app running on Mac Mini, Pulse Feed path decided, greeting copy ready*

### Phase 1: UI Redesign + Daily OS (weeks 1–2)
*Goal: MomentumOS is beautiful, usable, and Satbir opens it daily*
- Complete UI redesign: time-aware layout, master-level design, Pratchett micro-copy throughout
- Today's One Thing (with algorithm as specified)
- Greeting message system (40-message library + time/state selection logic)
- Time-aware mode switching across all 9 modes
- Quiet mode implementation (sadhana windows)
- "I'm Stuck" button
- Anti-overwhelm triage modal
- Soft close of the day / minimum viable evening log
- Quick Capture with keyboard shortcut
- *Deliverable: Satbir uses this every day and genuinely likes opening it*

### Phase 2: Learning Coach (weeks 3–6)
*Note: 4 weeks, not 2. This is a substantial feature set.*
- OpenRouter integration (API client, error handling, streaming responses)
- User profile page (domains, schedule, about me — feeds AI system prompts)
- Curriculum builder (goal input → AI generates structured JSON curriculum)
- Learning session UI (pre-session context → chat interface → post-session loop)
- SM-2 spaced repetition engine
- Learning entries connected to Daily OS (tags from learning feed into One Thing algorithm)
- *Deliverable: Satbir has active learning paths and can see himself progressing*

### Phase 3: Pulse Feed (weeks 7–8)
*Depends on Phase 0 Pulse Feed source decision*
- Integrate Pulse Feed source (local version or RSS fallback)
- News-to-action bridge (three save types: learning note / game design idea / bookmark)
- Time-aware news surfacing aligned to schedule
- Connection surfacing (tag-count based, not ML)
- *Deliverable: Satbir's news reading creates actual notes and connections, not just scrolling*

### Phase 4: Full Deployment Hardening (week 9)
*Phase 0 gets it working; Phase 4 makes it solid*
- Automated daily SQLite backup (cron job → timestamped backup file)
- Environment variable management (OpenRouter key, password hash)
- Phase 2 minimum viable OpenRouter failure behavior: show inline error message "Couldn't reach the AI — check your connection and try again." No retry loop; user re-submits manually. This is defined in Phase 2, hardened in Phase 4.
- Graceful error handling for OpenRouter outages (fallback to cached responses where possible)
- Performance pass: ensure app loads in <1 second on local Tailscale network
- *Deliverable: app is robust, backed up, production-quality*

### Phase 5: Intelligence Layer (from week 10, ongoing)
*Requires 30+ days of real usage data*
- Spaced resurfacing (7/30/90-day intervals, reflection entries + learning notes + goals)
- Cross-section connections (learning ↔ tasks ↔ news via keyword/tag matching)
- Energy-aware task surfacing (if >30 days of intensity data available)
- Day 30 / Day 100 narrative generation
- Monthly narrative summaries (from month 2 onwards)
- Greeting message library expansion to 100+
- AI-generated greetings for milestone moments
- *Deliverable: app feels like it knows Satbir and has been paying attention*

---

## 10. Design Principles

1. **Be opinionated** — no blank canvas. Structure exists. User fills it.
2. **Minimum visible complexity** — show the minimum. Everything else is one intentional step away.
3. **The right thing already there** — Satbir never opens the app and wonders what to do.
4. **Calm technology** — most information in the glanceable periphery. Interruptions are rare and earned.
5. **The app manages its own complexity** — when things pile up, the app notices. Satbir doesn't manage it.
6. **Humor as warmth, not jokes** — micro-copy is alive: observational, warm, specific. Pratchett, not stand-up.
7. **Sacred time is sacred** — sadhana windows are hardcoded. App waits.
8. **Memory creates relationship** — accumulated data builds a model of Satbir. The longer it runs, the more it understands.

---

## 11. Open Items (not blockers, but decisions to make)

1. **Pulse Feed source** — addressed in Phase 0. Path decided before Phase 3 is scheduled.
2. **Greeting message copy** — 40 messages needed before Phase 1 ships. Written in Phase 0.
3. **OpenRouter model selection** — use Claude Sonnet as default; revisit if cost becomes a concern.
4. **SQLite WAL mode** — enables concurrent reads across Tailscale devices without upgrading to PostgreSQL. Decision: stay on SQLite unless specific multi-device write contention is observed.

---

*"The best productivity system is not the one with the most features. It's the one you actually open."*
*— Nobody famous. Yet.*
