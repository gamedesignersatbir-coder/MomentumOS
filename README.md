# Momentum OS

Momentum OS is a polished local-first productivity app for Satbir. It combines a daily execution board, structured learning tracker, weekly review analytics, a searchable prompt library, and a nightly reflection flow that produces a deterministic next-day suggestion.

## Stack

- Next.js app router
- TypeScript
- Tailwind CSS
- Local SQLite via Node `node:sqlite`

## Features

- Daily Plan board with top priorities, focus blocks, and quick tasks
- Learning Sprint tracker with topic, minutes, notes, confidence, and next action
- Weekly Review dashboard with streaks, learning minutes, and completion trend
- Smart Prompt Library with searchable tags and one-click copy
- Nightly Reflection modal with three prompts and a deterministic next-day suggestion
- Responsive layout, keyboard shortcuts, empty states, loading state, and toast feedback

## Setup

1. Ensure the local workspace has a compatible `node_modules` install available.
2. Run `npm run dev`.
3. Open `http://localhost:3000`.

Available scripts:

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run seed`

## Architecture

- `app/page.tsx`: server entry point that loads the dashboard data
- `app/actions.ts`: server actions for create/update flows
- `lib/db.ts`: SQLite schema, seed bootstrap, queries, and write operations
- `lib/reflection.ts`: deterministic next-day suggestion logic
- `components/momentum-dashboard.tsx`: client-side shell and interactions
- `components/ui/*`: lightweight shadcn-style UI primitives

## Seed Data

The initial dataset is tailored for Satbir and includes:

- Game design priorities around boss telegraphs and combat feel
- AI learning sprints and prompt patterns
- Family planning reminders and review cues

## Screenshots

![Dashboard overview placeholder](./docs/screenshots/dashboard-overview.png)
![Nightly reflection placeholder](./docs/screenshots/nightly-reflection.png)
![Prompt library placeholder](./docs/screenshots/prompt-library.png)

Create the files above when you capture final screenshots.
