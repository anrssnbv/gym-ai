# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Phase 3 — Core loop on real data. Spec 12 complete; specs 02, 05, 06, 07, and 10 phone checks pending.

## Current Goal

- 12 Dashboard complete. Next planned: 13 Generate Sheet UI.

## Roadmap

All specs 01–15 are written. 09–15 were written after 08, against the code as built. If a unit changes names or contracts, update the later specs before running them (see `ai-workflow-rules.md` → Writing The Next Spec).

### Phase 1 — UI foundation (no backend)

- [x] 01 design-system — shadcn/ui (Radix), dark game tokens, fonts, icons
- [ ] 02 app-shell — mobile shell: top bar, bottom tabs, placeholder pages, PWA manifest and icons
- [x] 03 exercise-catalog — `lib/catalog.ts` + groups grid + group list + exercise page header, first `npm test`
- [x] 04 muscle-map — SVG body map with one region per head, on the exercise list and exercise page
- [ ] 05 exercise-level-screen — `lib/game.ts` (calibrate, adjust) + tests, level card, calibrate and adjust sheets (local state)
- [ ] 06 round-flow — level-up rules + tests, round timer, log reps sheet, level-up overlay (local state)

### Phase 2 — Auth and data

- [ ] 07 auth — Clerk: `proxy.ts`, `auth.protect()` in the app layout, sign-in/sign-up pages, user button
- [x] 08 prisma — Prisma 7 + Postgres: `ExerciseProgress`, `WorkoutSession`, `SetLog`, client singleton

### Phase 3 — Core loop on real data

- [x] 09 exercise-actions — `requireUserId()`, queries, session helpers, Server Actions: calibrate, adjust, log set (active session + `expectedLevel` + level-up in one transaction), undo, finish workout. Backend only.
- [ ] 10 wire-exercise-screen — exercise screen, set history, undo and group power on the catalog use real data
- [x] 11 wire-workout-session — active-workout banner, `/workout` for manual sessions, finish + summary
- [x] 12 dashboard — read-only: power level + rank, stats, 7-day muscle heat map, recent workouts

### Phase 4 — AI coach

- [ ] 13 generate-sheet-ui — "Generate workout" sheet (duration + focus) with a static plan preview
- [ ] 14 ai-workout-generator — migration (`plan` on `WorkoutSession`, `PlanGeneration`), planning helpers + tests, Auto resolution, OpenAI Structured Outputs + Zod, 10 plans/day limit. Backend only.
- [ ] 15 wire-ai-workout — generate → preview → start (attach to the active session or create one) → play the plan on `/workout`

### Backlog (not planned)

- Weekly streaks, badges, personal-record highlights
- Weight-over-time chart per exercise
- Offline set logging (gyms often have bad reception)
- lb units, bodyweight/assisted exercises, per-exercise rep ranges

## Completed

- 01 design-system — theme tokens, fonts, and temporary component preview. Lint, build, and 360 px browser checks passed.
- 03 exercise-catalog — 10 groups, 27 heads, 50 exercises, catalog tests, and browse routes. Tests, lint, build, and 360 px browser checks passed.

- 04 muscle-map — all 27 head regions, group thumbnails, and full exercise maps. Tests, lint, build, type coverage, and 360 px browser checks passed. User approved all seven screenshot pairs on 2026-09-25.

- 08 prisma — Prisma 7, exact three-model schema, cached adapter client, init migration, and deployment/install scripts. Migration applied and up to date on the direct endpoint. Client regeneration without DATABASE_URL, generated-file lint exclusion, lint, and build verified.

- 09 exercise-actions — authenticated user helper, scoped queries, shared action results, session rules, and five validated actions. Round-ID replay, rollback recovery, serializable retries, and concurrent calibration verified. All 23 unit tests, 11 integration checks against PostgreSQL, lint, and production build pass. Backend only; UI wiring follows in spec 10.

- 11 wire-workout-session — active-workout banner, browser-local elapsed time, session detail query, grouped sets/totals, Finish, and summaries implemented. All 26 tests, lint, TypeScript, build, and 360 × 640 browser checks pass. Verified offline Finish retry, active-summary redirect, cross-user 404, exact idle boundary, timer/visibility expiry, stale-session rollover, zero-set durations, and local times.

- 12 dashboard — rank/power card, workout/time/volume/unlocked stats, seven-day primary-muscle heat map, and recent summaries implemented. All 28 unit tests, 16 database integration checks, lint, TypeScript, production build, and 360 × 640 browser checks pass. Verified empty accounts, database totals, rolling-window and idle boundaries, active/empty exclusions, ownership, typed intensity/activity labels, rank accessibility, Diamond state, and all five recent links.

## In Progress

- 10 wire-exercise-screen — saved-state props, asynchronous action-backed sheets, stable round IDs/reps on retry, stale-tab recovery, history/Undo, browser-local dates, and catalog levels/weights/power implemented. All 23 tests, lint, TypeScript, production build, and 360 × 640 browser checks pass. Verified persistence across reloads and separate browser contexts, account isolation, normal and level-up Undo, adjustment rules, offline recovery for all four actions, and a committed log with a lost response replaying without duplicate writes. Remaining: user verifies a phone-logged round appears on desktop after reload.
- 07 auth — implementation merged in PR #7 and rechecked against the spec. Provider/theme, protected app layout, public auth pages, proxy, user menu, and env example are implemented. Lint, build, 17 tests, and public asset checks pass. Linked to GYM-AI through Clerk CLI; development keys configured locally. Doctor, signed-out redirects, public assets, and themed 360 px auth pages verified. User confirmed sign-in/sign-out. Email-code sign-in and sign-up verification are enabled. Remaining: verify email-code sign-in in the installed app and Google sign-in in the installed iOS app; keep email code as the main method if Google fails there.
- 06 round-flow — timestamp timer, reps logging, wake lock, and level-up feedback implemented with local state. All 17 tests, lint, build, and 360 px browser checks pass. Real-phone checks pending: countdown recovery after 30 seconds locked and screen staying awake during a round.
- 05 exercise-level-screen — game rules, local level card, and calibrate/adjust sheets implemented. All 12 tests, lint, build, and 360 px browser flows pass. Real-phone check pending: submit stays visible with the keyboard open.
- 02 app-shell — routes, navigation, viewport metadata, and PWA icons implemented. Lint, build, browser layout, and manifest checks passed; real-phone install check pending.

## Open Questions

The user answers these. Defaults are already written into the context files and specs.

1. ~~Round timer~~ — decided 2026-09-25, see Architecture Decisions.
2. ~~Level-up with several sets~~ — decided 2026-09-25, see Architecture Decisions.
3. **Focus options (before 13).** Default, used in specs 13–15: Auto, Push, Pull, Legs, Upper, Full body. "Lower" is merged into Legs because they cover the same muscles.
4. **Duration input (before 13).** Default, used in specs 13–15: presets of 30 / 45 / 60 / 90 min instead of free "hours".
5. **Personal or public app (before 14).** Clerk sign-ups are open by default and every generation is a paid OpenAI call. Default, used in spec 14: a budget cap on the OpenAI project plus 10 generations per user per day. If the app is only for you, also restrict sign-ups in Clerk.

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
- `WorkoutSession.plan` is added in spec 14; its JSON contains the resolved focus, so no separate focus column is stored.
- Tests use Node's built-in runner (`node --test`) with native type stripping; no test framework.
- Every write action ends with `revalidatePath('/', 'layout')`; pages pass saved state to client components as props, so the UI never keeps a second copy of database state (from spec 10).
- Calibrate is an idempotent `upsert` (a double tap returns the existing row) instead of an "already calibrated" error.
- Dates render through `LocalTime` / `ElapsedTime` on the client only, avoiding UTC-vs-local hydration mismatches.
- AI: `gpt-5.4-mini` via openai 7 `responses.parse` + `zodTextFormat`; the client is created per call, so a missing key never breaks the build. Daily limit via `PlanGeneration` rows written before each call.
- An AI plan started during a running workout attaches to that session instead of starting a second one.

## Session Notes

- Next.js 16.3.6, React 19.2.8, Tailwind CSS v4, TypeScript strict, Node 24.12.
- Git repo on GitHub; each spec lands as one PR from `development` into `main`.
- shadcn 4.21 installs the `cn` package (github.com/shadcn-ui/cn) instead of clsx + tailwind-merge; `lib/utils.ts` re-exports it. This is expected.
- `context/feature-specs/_templates/` holds the spec template and the prompt for writing the next spec.
