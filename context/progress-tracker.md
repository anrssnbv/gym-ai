# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Phase 5 — training preferences implemented through spec 16; specs 02, 05, 06, 07, 10, 15, and 16 physical-phone checks pending.

## Current Goal

- Specs 01–16 implemented. QA fixes complete; physical-phone checks remain. Production is deployed at https://gym-ai-seven-alpha.vercel.app.
- Production recovery: [PR #20](https://github.com/anrssnbv/gym-ai/pull/20) merged as `8140279`. The exposed OpenAI key was revoked and replaced in both Vercel projects; fresh Preview and Production builds passed. An authenticated primary-Production test generated a valid three-exercise Push Day with one attempt and no session or sets before Start. Sanitized new-deployment logs contained no key or generation failure. The second project's Clerk 500 remains resolved. PROD-01/02/03 are closed in `current-issues.md`; protected Preview prevented an authenticated browser test there.
- Spec 16 implemented: profile storage/action, onboarding/edit UI, and personalized AI generation. All 50 unit tests, 56 database checks, lint, TypeScript, production build, and Playwright checks pass; physical-phone acceptance remains.
- Spec 16 delivery: [PR #18 — Implement training profile onboarding and personalized plans](https://github.com/anrssnbv/gym-ai/pull/18).
- Vercel deployment — after explicit user request, updated the existing `DATABASE_URL` secret in Preview and Production from the verified local direct Prisma Postgres URL. Preview migration/build passed; redeployed merged `main` commit `9590880` to Production. Vercel reports Ready and aliases `gym-ai-seven-alpha.vercel.app`; a signed-out browser visit rendered Clerk sign-in without page errors. Earlier P1013 failures were from the old Vercel database value.
- QA delivery: [PR #17 — Fix training integrity and application QA findings](https://github.com/anrssnbv/gym-ai/pull/17).

## Roadmap

All specs 01–16 are written. 09–15 were written after 08; 16 was written after the QA fixes, against the code as built. If a unit changes names or contracts, update the later specs before running them (see `ai-workflow-rules.md` → Writing The Next Spec).

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

- [x] 13 generate-sheet-ui — "Generate workout" sheet (duration + focus) with a static plan preview
- [x] 14 ai-workout-generator — migration (`plan` on `WorkoutSession`, `PlanGeneration`), planning helpers + tests, Auto resolution, OpenAI Structured Outputs + Zod, 10 plans/day limit. Backend only.
- [ ] 15 wire-ai-workout — generate → preview → start (attach to the active session or create one) → play the plan on `/workout`

### Phase 5 — Training preferences

- [ ] 16 training-profile-onboarding — four-step first-sign-in survey (goal, experience, days/session time, equipment), owned Prisma training profile, later editing, and integration with the existing AI generator. See `feature-specs/16-training-profile-onboarding.md` for ordered implementation checkpoints and acceptance checks. Weekly hours are derived; current training history and game rules are preserved.

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

- 13 generate-sheet-ui — client-safe plan types, controlled duration/focus toggles, sample pull-day preview, and Home/empty-Workout triggers. All 28 tests, lint, TypeScript, production build, and 360 × 640 browser checks pass. Verified both defaults, keyboard/touch selection, accessible radio states, reselection guards, retained choices, disabled Start, scrolling, no horizontal overflow or page errors, and Escape focus restoration. UI only; AI wiring follows in specs 14–15.

- 14 ai-workout-generator — additive ai-plans migration applied, planning helpers/schema/context, OpenAI Structured Outputs, and authenticated preview action with atomic 10-per-24-hour attempt limit. All 38 unit tests, 28 PostgreSQL integration checks, lint, TypeScript, and production build with an empty OPENAI_API_KEY pass. Live gpt-5.4-mini pull-plan smoke test passed in 5.3 seconds with all schema limits retained. Default OpenAI project monthly spend limit set to $10 with hard enforcement enabled; Vercel deferred by user. UI wiring follows in spec 15.

## In Progress

- 16 training-profile-onboarding — implemented and independently reviewed. Additive migration preserves training rows; four-step survey, editing, auth/profile gates, equipment filtering, experience limits, schedule-aware Auto, and stale-preview validation verified. All 50 unit tests, 56 PostgreSQL checks, lint, TypeScript, production build, migration status, and diff checks pass. Playwright verified signup, keyboard/mobile layout, offline/lost-response retry, separate-context persistence, database-outage recovery, one live personalized plan and completed workout, and history preservation after editing. Temporary accounts/data cleaned. Remaining: physical-phone signup → survey → workout and installed-app reopening.

- 15 wire-ai-workout — real generation/regeneration, calibrated preview, validated start/attach, persisted checklist, Extra sets, exercise steps, and plan summaries implemented. All 39 unit tests, 38 PostgreSQL integration checks, lint, TypeScript, production build, and 360 × 640 touch-browser checks pass. Verified all six focus choices, Auto selecting the oldest pattern, inline offline retries for Generate/Regenerate/Start, 10-attempt quota, unknown-ID rejection through the browser, zero-set banner/stat exclusion, full nine-set plan plus Extra, manual attachment without another session, reload/separate desktop-context persistence, and empty-Workout Start. Prompt clarifies the existing calibrated-candidate cap with exact eligible IDs/counts; server rules remain unchanged. Temporary accounts/data cleaned. Remaining: user plays a complete generated workout on a physical phone.


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
5. **Personal or public app (before 14).** User chose a $10 monthly OpenAI project limit (configured with hard enforcement on 2026-09-25); Vercel deployment deferred. Clerk sign-ups are open by default and every generation is a paid OpenAI call. Default, used in spec 14: a budget cap on the OpenAI project plus 10 generations per user per day. If the app is only for you, also restrict sign-ups in Clerk.

## Architecture Decisions

- Training preferences use one owned `TrainingProfile` row keyed by Clerk ID; missing/malformed profiles require onboarding, while read failures show Retry. Only five preference fields enter AI context. Equipment filtering and experience limits apply at generation and Start; historical plans and manual logging remain independent.
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
- Set safety: per-round IDs make retries idempotent; writes validate the captured level, weight, and step. Undo targets the displayed set ID, rejects stale history, and safely acknowledges an already-absent target.
- Weight ceilings are per-exercise catalog metadata, shared by forms/actions/progression. At the ceiling, sets are saved without automatic level-ups; historical weights are preserved.
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

- QA fixes (2026-09-25): captured round settings prevent wrong-weight logs; Undo targets an exact set and safely retries; all 50 exercises have shared weight ceilings; Undo feedback and the header tap target are corrected; AI duration, uniqueness, and focus are validated. All 45 unit tests, 45 PostgreSQL integration checks, lint, TypeScript, and production build pass. Playwright verified concurrency/retry, capped progression, a nine-set generated workout, signup/signout, offline recovery, and genuine session expiry/re-login. Test accounts/data were cleaned. See `current-issues.md` for evidence and remaining manual checks.

- Next.js 16.3.6, React 19.2.8, Tailwind CSS v4, TypeScript strict, Node 24.12.
- Git repo on GitHub; each spec lands as one PR from `development` into `main`.
- shadcn 4.21 installs the `cn` package (github.com/shadcn-ui/cn) instead of clsx + tailwind-merge; `lib/utils.ts` re-exports it. This is expected.
- `context/feature-specs/_templates/` holds the spec template and the prompt for writing the next spec.
