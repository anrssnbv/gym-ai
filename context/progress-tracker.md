# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Phase 1 — UI foundation. Spec 03 complete; spec 02 phone check pending.

## Current Goal

- Confirm the 02 App Shell phone install check before spec 04.

## Roadmap

Specs 01–08 are written. Specs 09+ are written one at a time after the previous unit is done (see `ai-workflow-rules.md` → Writing The Next Spec).

### Phase 1 — UI foundation (no backend)

- [x] 01 design-system — shadcn/ui (Radix), dark game tokens, fonts, icons
- [ ] 02 app-shell — mobile shell: top bar, bottom tabs, placeholder pages, PWA manifest and icons
- [x] 03 exercise-catalog — `lib/catalog.ts` + groups grid + group list + exercise page header, first `npm test`
- [ ] 04 muscle-map — SVG body map with one region per head, on the exercise list and exercise page
- [ ] 05 exercise-level-screen — `lib/game.ts` (calibrate, adjust) + tests, level card, calibrate and adjust sheets (local state)
- [ ] 06 round-flow — level-up rules + tests, round timer, log reps sheet, level-up overlay (local state)

### Phase 2 — Auth and data

- [ ] 07 auth — Clerk: `proxy.ts`, `auth.protect()` in the app layout, sign-in/sign-up pages, user button
- [ ] 08 prisma — Prisma 7 + Postgres: `ExerciseProgress`, `WorkoutSession`, `SetLog`, client singleton

### Phase 3 — Core loop on real data

- [ ] 09 exercise-actions — `requireUserId()`, queries, session helpers, Server Actions: calibrate, adjust, log set (active session + `expectedLevel` + level-up in one transaction), undo, finish workout. Backend only.
- [ ] 10 wire-exercise-screen — exercise screen, set history, undo and group power on the catalog use real data
- [ ] 11 wire-workout-session — active-workout banner, `/workout` for manual sessions, finish + summary
- [ ] 12 dashboard — read-only: power level + rank, stats, 7-day muscle heat map, recent workouts

### Phase 4 — AI coach

- [ ] 13 generate-sheet-ui — "Generate workout" sheet (duration + focus) with a static plan preview
- [ ] 14 ai-workout-generator — migration adding `focus` + `plan` to `WorkoutSession`, Auto resolution, history summary, OpenAI Structured Outputs + Zod, usage limit (see Open Question 5)
- [ ] 15 wire-ai-workout — generate → preview → start (attach to the active session or create one) → play the plan on `/workout`

### Backlog (not planned)

- Weekly streaks, badges, personal-record highlights
- Weight-over-time chart per exercise
- Offline set logging (gyms often have bad reception)
- lb units, bodyweight/assisted exercises, per-exercise rep ranges

## Completed

- 01 design-system — theme tokens, fonts, and temporary component preview. Lint, build, and 360 px browser checks passed.
- 03 exercise-catalog — 10 groups, 27 heads, 50 exercises, catalog tests, and browse routes. Tests, lint, build, and 360 px browser checks passed.

## In Progress

- 02 app-shell — routes, navigation, viewport metadata, and PWA icons implemented. Lint, build, browser layout, and manifest checks passed; real-phone install check pending.

## Open Questions

The user answers these. Defaults are already written into the context files and specs.

1. ~~Round timer~~ — decided 2026-09-25, see Architecture Decisions.
2. ~~Level-up with several sets~~ — decided 2026-09-25, see Architecture Decisions.
3. **Focus options (before 13).** Default: Auto, Push, Pull, Legs, Upper, Full body. "Lower" is merged into Legs because they cover the same muscles.
4. **Duration input (before 13).** Default: presets of 30 / 45 / 60 / 90 min instead of free "hours".
5. **Personal or public app (before 14).** Clerk sign-ups are open by default and every generation is a paid OpenAI call. Default: set a budget cap on the OpenAI project and limit generation to 10 per user per day. If the app is only for you, restrict sign-ups in Clerk instead.

## Architecture Decisions

- Round timer starts on "Start round" (1–2 min); reps can be logged at any moment of the round; the remaining time is rest. Confirmed by the user 2026-09-25 (rejected: a rest timer that starts after logging).
- Any set with 12+ reps levels up immediately; the next set uses the new weight. Confirmed by the user 2026-09-25 (rejected: level up only when all planned sets hit 12).
- Single-user data, no collaboration → no Liveblocks, Trigger.dev or Blob storage (ghost-ai used them; this app doesn't need them).
- Server Actions instead of REST API routes: one write path, less code.
- Exercise catalog lives in code (`lib/catalog.ts`), not in the database: no seeding, no admin UI, typed IDs. The database stores only user progress.
- The AI chooses exercises and sets only. Weights and levels come from `lib/game.ts`, so the AI can't produce an unsafe load.
- Auth: `proxy.ts` only runs `clerkMiddleware()`; access is checked next to the data (`auth.protect()` in the app layout, `requireUserId()` in every query and action). Clerk 7.9 deprecates `createRouteMatcher` path matching.
- No User table: Clerk is the user store and `userId` is the Clerk ID.
- `SetLog.userId` is stored even though the session has it, so per-user queries don't need a join.
- Sessions end lazily 3 h after their last set (one helper in `lib/game.ts`); no cron.
- Derived numbers (best reps, power level, totals) are computed, not stored.
- Power level = levels cleared (sum of level − 1), so calibrating alone doesn't raise rank.
- Double-submit safety: log set updates progress only `where level = expectedLevel`.
- Rolling "last 7 days" windows instead of calendar weeks → no user timezone needed on the server; dates are formatted in client components.
- shadcn/ui on Radix (`-b radix`): shadcn 4.21 defaults to Base UI, and agents write Radix-style `asChild` code more reliably.
- `<html class="dark">` is permanent, so shadcn's `dark:` variants don't follow the phone's system theme.
- Clerk's `shadcn` theme reads our shadcn variables, so auth screens match the app without manual color mapping.
- PWA through `app/manifest.ts` only; no service worker until offline logging is planned.
- Prisma is pinned to v7: npm's `latest` tag for `prisma` points to an 8.0 release candidate (checked 2026-09-25).
- `WorkoutSession.focus` and `plan` are added in spec 14, when something first uses them.
- Tests use Node's built-in runner (`node --test`) with native type stripping; no test framework.

## Session Notes

- Next.js 16.3.6, React 19.2.8, Tailwind CSS v4, TypeScript strict, Node 24.12.
- The project is not a git repository yet (see `ai-workflow-rules.md` → Before Moving To The Next Unit).
- `context/feature-specs/_templates/` holds the spec template and the prompt for writing the next spec.
