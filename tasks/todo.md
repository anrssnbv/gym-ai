# 01 Design System

## Specification

- Goal: implement `context/feature-specs/01-design-system.md`.
- Scope: dark theme tokens, Oxanium font, and a temporary component preview. Keep the existing shadcn Radix components unchanged.
- Decision: reuse the installed shadcn 4.21 components and `cn()` helper instead of regenerating them.
- Acceptance: all required tokens and components render, the preview remains dark under both system themes and fits 360 px, and lint and build pass.

## Tasks

- [x] Read the spec and project context; mark the tracker in progress.
- [x] Implement theme tokens and fonts.
- [x] Build the temporary component preview.
- [x] Verify lint, build, and browser behavior at 360 px.
- [x] Update the tracker and record the review.

## Review

Implemented the dark tokens, shadcn mappings, Oxanium font, and temporary preview. Reused the seven existing generated Radix components without edits. `npm run lint` and `npm run build` pass. Playwright at 360 × 640 confirmed no horizontal overflow, dark surfaces and inputs under light and dark system themes, working bottom Sheet, Oxanium and Geist Mono fonts, and no browser errors. No phone-only checks were required by this spec.

# 02 App Shell

## Specification

- Goal: implement `context/feature-specs/02-app-shell.md`.
- Scope: three placeholder routes in one mobile shell, safe-area bars, viewport metadata, manifest, and generated icons.
- Key decisions: keep navigation state in one client component; use the existing icon library and `sharp` already installed by Next.
- Acceptance: routes and active tabs work, 360 × 640 has no horizontal overflow or covered content, manifest and icons load, and lint and build pass. A real phone install check remains for the user.

## Tasks

- [x] Read the spec and project context; mark the tracker in progress.
- [x] Build route group, top bar, bottom tabs, and placeholders.
- [x] Add viewport metadata, manifest, and icons; remove starter assets.
- [x] Verify routes, navigation, manifest, assets, mobile layout, lint, and build.
- [x] Update tracker and record review.
- [ ] Confirm installed status bar and home indicator clearance on a real phone.

## Review

Built the shared shell, three placeholder routes, active bottom tabs, viewport and Apple metadata, manifest, and SVG/PNG icons. Removed the token preview and starter assets. `npm run lint` and `npm run build` pass. Playwright at 360 × 640 confirmed the three routes, active tab state, no horizontal overflow, no content overlap, all icon URLs returning 200, and no console errors. Chrome's manifest parser returned no errors. The real-phone install check remains pending as required by `context/ai-workflow-rules.md`.

# 03 Exercise Catalog

## Specification

- Goal: implement `context/feature-specs/03-exercise-catalog.md` exactly.
- Scope: 10 groups, 27 heads, 50 exercises, pure catalog helpers and tests, and the three catalog browse routes.
- Key decisions: keep catalog data in `lib/catalog.ts`; use Server Components and existing shadcn Badge and token styles.
- Acceptance: catalog invariants pass, expected routes render and invalid routes 404, cards are fully tappable at 360 px with no horizontal overflow, and test, lint, and build pass.

## Tasks

- [x] Read the spec and context; mark the tracker in progress.
- [x] Implement catalog data, helpers, tests, and test script.
- [x] Implement group grid, group page, and exercise page.
- [x] Verify catalog counts, routes, invalid IDs, mobile layout, test, lint, and build.
- [x] Update tracker and record review.

## Review

Implemented the static catalog and three browse routes. A direct comparison against the spec tables matched all 10 groups, 27 heads, and 50 exercises. `npm test` passes all five catalog checks; lint and build pass. At 360 × 640, the group grid, Chest list, Pec Deck detail, and long Bulgarian Split Squat title have no horizontal overflow. Group and exercise cards are full links with tap areas above 44 px. `/exercises/chest/pec-deck` works; wrong-group and unknown IDs return 404. Spec 02's real-phone install check remains pending.

# 04 Muscle Map

## Specification

- Goal: implement `context/feature-specs/04-muscle-map.md`.
- Scope: hand-authored symmetric SVG regions for all 27 heads, server-rendered intensity/focus component, list thumbnails and exercise maps.
- Decisions: draw left-half polygons once and mirror them; reuse catalog names and theme tokens.
- Acceptance: complete typed region coverage, correct focus and accessible labels, no overflow at 360 px, passing tests/lint/build, and user approval of the seven specified thumbnail/full-map screenshot pairs.

## Tasks

- [x] Read spec and context; mark in progress and sync development with main.
- [x] Draw body paths and implement map rendering and exercise intensity.
- [x] Integrate thumbnails and full maps into exercise routes.
- [x] Verify types, rendering, accessibility, 360 px layout, tests, lint, and build.
- [x] Capture all seven screenshot pairs for user approval.
- [x] Push development and open PR; obtain user visual approval.
- [x] Merge PR #4 and update local main.

## Review

Implemented all 27 typed muscle regions, mirrored body geometry, token-based intensity, group crops, accessible labels, and catalog integration without client state or new dependencies. All seven tests, lint, and production build pass. A negative TypeScript check rejected both a missing head and an empty path tuple. Playwright checked all seven specified exercises at 360 px: 64 px thumbnails, uncropped full maps, expected labels and region fills, and no horizontal overflow. The groups grid remains text-only; browser console has no errors. Screenshots and a local review gallery are in `.playwright-mcp/spec04/`. User approved all seven screenshot pairs on 2026-09-25. Spec 02's phone check remains pending.

# 05 Exercise Level Screen

## Specification

- Goal: implement spec 05 with local state only.
- Scope: pure game rules and tests, locked/level card, shared calibrate/adjust bottom sheet below Targets.
- Decisions: reuse installed shadcn components; native form validation; no persistence or round behavior.
- Acceptance: specified game tests and browser flows pass at 360px, lint/build pass, and user checks submit visibility with the real phone keyboard.

## Tasks

- [x] Read spec and context; mark tracker in progress.
- [x] Implement pure game functions and tests.
- [x] Implement level card and shared weight sheet; integrate into the server page.
- [x] Verify calibration, adjustment, validation, focus, reload reset, and mobile layout; run tests/lint/build.
- [x] Commit, push, open PR, merge, and sync local main.
- [ ] User confirms the real-phone keyboard check.

## Review

Implemented pure game rules and the local exercise level screen using existing shadcn components. All 12 tests, lint, and production build pass. Playwright at 360 × 640 verified locked/calibrated states, equipment defaults, focus on open, Enter submission, adjustment prefill and unchanged level, rounded values, gains, canceled draft reset, reload reset, disabled Start round, accessible progress, long exercise names, no horizontal overflow, and no console errors. Empty, zero, negative, and out-of-range weight/step values are blocked; allowed limits succeed. Screenshots are in `.playwright-mcp/spec05/`. A separate code review found no actionable issues. The real-phone keyboard check remains pending under the workflow rules; spec 02’s phone check also remains pending.

# 06 Round Flow

## Specification

- Goal: implement spec 06 exactly with local state only.
- Scope: applySet/roundSeconds rules, timestamp countdown, wake lock, reps sheet, level-up overlay and header duration.
- Decisions: capture each round's level/weight at start; one submission per round; reuse existing UI primitives.
- Acceptance: specified tests, complete round loop, timestamp recovery, reduced motion, 360px layout, lint/build, and user phone wake-lock/sleep checks.

## Tasks

- [x] Read spec and mark tracker in progress.
- [x] Implement game rules and tests.
- [x] Implement timer, reps sheet, overlay, and screen integration.
- [x] Verify full loop, validation, timer recovery, wake-lock lifecycle, reduced motion, layout, tests/lint/build.
- [x] Commit, push, open PR, merge, and sync local main.
- [ ] User confirms countdown recovery after 30 seconds locked and screen stays awake during rounds.

## Review

Implemented spec 06 with pure set rules, timestamp countdown, Screen Wake Lock cleanup/reacquisition, native reps validation, one-save guard, result messages, and level-up feedback. All 17 tests, lint, and production build pass. Playwright at 360 × 640 verified the complete 10-rep/12-rep loop, both timer durations, all result bands, invalid inputs, duplicate submission, early next round, cancellation numbering, expiry vibration once, simulated 30-second clock recovery on visibility change, wake-lock release/reacquisition and denial/late-resolution handling, reduced motion, overlay tap/timeout and focus restoration, reload reset, and no horizontal overflow. Current browser console has no errors. Code review found a focus restoration issue that was fixed and verified. Screenshots are in `.playwright-mcp/spec06/`. Real-device sleep recovery and screen-awake behavior remain pending for the user; earlier phone checks remain pending.

# 07 Clerk Auth

## Specification

- Goal: add Clerk auth using the requested Clerk skill and spec 07.
- Scope: provider/theme, proxy, protected app layout, public sign-in/sign-up, user menu, env example.
- Decisions: reuse installed Clerk packages; preserve existing environment keys; use auth.protect next to protected content.
- Acceptance: signed-out redirects, public assets, themed auth pages at 360px, lint/build, doctor, and user sign-up/sign-out and installed-phone verification.

## Tasks

- [x] Read Clerk skill, auth spec, existing integration, and Next.js proxy guide.
- [x] Scaffold Clerk and implement theme, routes, access checks, and user controls.
- [x] Link GYM-AI and configure development keys through authenticated Clerk CLI.
- [x] Verify doctor, redirects, public assets, mobile layout, lint/build, and tests.
- [x] Push branch and open draft PR.
- [x] Merge and sync main after live auth verification.
- [x] User confirms sign-in/sign-out; CLI confirms email-code authentication enabled.
- [ ] User confirms installed-phone email-code authentication and Google authentication in the installed iOS app.

## Review

Linked the user-specified GYM-AI app through Clerk CLI and configured local development keys without reading or printing environment files. Provider/theme, protected layout, branded auth pages, user menu, redirect settings, env example, and auto-proxy matcher are implemented. Doctor, lint, production build, and all 17 tests pass. Signed-out /, /exercises/chest, and /workout redirect to /sign-in; manifest/icons remain public. Both auth pages render the app theme at 360px without tabs or horizontal overflow. No Clerk deprecation warnings appeared. User confirmed successful sign-in/sign-out. Clerk auth_email configuration confirms email_code as its sign-in and verification strategy. Installed-phone verification remains pending; production instance is not configured.

# 08 Prisma

## Specification

- Goal: implement Prisma 7 PostgreSQL setup exactly as spec 08.
- Scope: three specified models, config, generated client, singleton, migration, environment example and build scripts.
- Decisions: reuse installed Prisma 7 dependencies and direct DATABASE_URL; Node env loader; no UI/actions/queries/seed.
- Acceptance: migration up to date with required constraints/indexes/cascade; client regeneration without DATABASE_URL; lint ignores generated output; lint/build pass.

## Tasks

- [x] Read spec and context; mark tracker in progress.
- [x] Add exact schema, Prisma config, singleton, ignores, and scripts.
- [x] Generate client and apply init migration; inspect SQL and status.
- [x] Prove install regenerates client without DATABASE_URL; verify lint/build.
- [x] Update tracker, push branch, open PR, merge, and sync local main.

## Review

Implemented the exact schema and Prisma 7 configuration, adapter singleton, generated-file ignores, env example, and install/deploy scripts. The init migration is applied; migrate status reports up to date through db.prisma.io. Verified its unique exercise constraint, all three SetLog indexes, and cascade deletion. The supplied pooled URL was converted to the documented direct hostname only after successfully testing it with the same credentials. An isolated installation with no environment file or DATABASE_URL generated the client, then regenerated it after its output was moved aside. The tool policy rejected deletion, so a reversible move provided the equivalent missing-output test. ESLint confirms the generated client is ignored. Lint and production build pass. Independent review found no code gaps. No UI, queries, actions, seeds, or extra models were added.

# Specs 09–15 Review Reconciliation

## Specification

- Goal: verify the supplied review against current specs and resolve confirmed gaps before implementation.
- Scope: specs 09–15 and matching context docs; no application code or database changes.
- Decisions: preserve existing draft work; reuse shared action/session contracts; keep scope to concrete inconsistencies.
- Acceptance: findings saved with dispositions, cross-spec contracts agree, and uncertain API claims checked against official docs.

## Tasks

- [x] Read the current specs and context; identify fixes already present.
- [x] Validate findings and update affected contracts and acceptance checks.
- [x] Save review findings and verify consistency across the specs and context.

## Review

Saved findings and dispositions in `context/feature-specs/09-15-review.md`. Reconciled action error/retry contracts, scoped idempotency, session expiry and concurrency, heat-map accessibility/types, toggles, plan props/storage, and new-user planning. The OpenAI length-limit concern is qualified against current official documentation rather than assumed true. Existing draft files were preserved and revised in place; no application code or database changes. `git diff --check` passes.

# 09 Exercise Actions

## Specification

- Goal: implement spec 09 exactly, backend only.
- Scope: auth helper, action results, game/session helpers, user-scoped queries, and five Server Actions.
- Decisions: reuse Prisma and game rules; Zod 4 validation; serializable session transactions with bounded retries; existing SetLog IDs provide replay safety.
- Acceptance: pure tests, database replay/concurrency/isolation checks, lint and build pass; no UI or schema changes.

## Tasks

- [x] Read spec and project rules; mark tracker in progress.
- [x] Implement helpers, queries, and validated actions.
- [x] Verify pure rules, database behavior, retries and concurrent writes; run tests/lint/build.
- [x] Update tracker and review, commit, push, open PR, merge, and update local main.

## Review

Implemented the auth helper, shared action result, pure session/power rules, scoped reads, and five validated Server Actions. Reused the existing schema and game rules. Real PostgreSQL checks exposed commit-time serialization conflicts arriving as Prisma 7 pg adapter errors; the bounded retry helper now handles these alongside P2034. Calibration also recovers a duplicate-key race only when this user's progress exists. All 23 unit tests, 11 integration checks, lint, TypeScript, production build, and diff checks pass. Integration checks use unique artificial users and clean their rows in finally. Independent review found no remaining issues. No UI or schema changes; UI end-to-end checks belong to spec 10. The pre-existing local deletion of the review document is excluded from this feature commit.

# 10 Wire Exercise Screen

## Specification

- Goal: implement spec 10 using the existing server actions and saved page props.
- Scope: async sheets, retry-safe round UI, set history/Undo, local time, and catalog progress.
- Decisions: retain existing timer and visuals; no optimistic database state or offline queue.
- Acceptance: persistent calibration/logging/adjustment/Undo, stale-tab and offline recovery, browser-timezone dates, mobile layout, tests/lint/build, and user phone-to-desktop check.

## Tasks

- [x] Read spec and mark tracker in progress.
- [x] Wire pages, catalog, history, and asynchronous sheets.
- [x] Verify browser flows and failure recovery; run tests/lint/build.
- [x] Update review, push branch, open PR, merge, and update local main.
- [x] Automated touch-enabled mobile browser logs a round; a separate desktop browser shows the saved set and best reps after reload.
- [ ] Physical-phone verification remains unavailable to the agent.

## Review

Implemented spec 10 with saved props, existing actions, async sheets, stable round IDs and immutable submitted reps, stale-tab recovery, history/Undo, local timestamps, and catalog progress. All 23 unit tests, lint, TypeScript, build, and diff checks pass. Playwright at 360 × 640 verified calibration and best reps across reloads, level-up/overlay/new round weight, double-submit safety, response-loss replay with an identical payload and one history entry, stale-tab close/refresh, both Undo cases, adjustment best-rep rules, offline errors and retries for all four actions, timer continuity, separate-browser persistence, account isolation, timezone formatting, 44 px Undo, and no horizontal overflow. Catalog level/weight/power matched a direct Prisma read of the test account. Independent review found no blocking issues. Screenshot: .playwright-mcp/spec10-exercise.png. Temporary Clerk accounts and all their database rows were removed. User phone-to-desktop check remains pending; the existing review-file deletion is excluded from the commit.

# 11 Wire Workout Session

## Specification

- Goal: implement spec 11 exactly.
- Scope: session summary math/query, elapsed time, active banner, workout page, Finish, and summary route.
- Decisions: reuse scoped queries, session expiry rules, saved actions, and LocalTime; no AI or dashboard.
- Acceptance: correct grouping/totals, finish/new session, stale/zero-set summaries, mounted banner expiry, offline retry, cross-user 404, mobile layout, tests/lint/build.

## Tasks

- [x] Read spec; mark tracker in progress.
- [x] Implement rules/query, banner/time, and workout pages.
- [x] Verify database-backed browser flows, boundaries, isolation, mobile layout, tests/lint/build.
- [x] Update tracker/review; commit, push, open PR, merge, and update local main.

## Review

Implemented spec 11 with the existing actions/session helpers and no schema changes. All 26 tests, lint, TypeScript, production build, and diff checks pass. Playwright at 360 × 640 verified the banner immediately after logging, Home/Exercises visibility and Workout hiding, grouped exercise order, 3 sets/840 kg/1 level totals, Finish and summary, offline Finish recovery, new sessions after finish, cross-account HTTP 404, browser-local timestamps, no overflow, and no page errors. Fake clock checks proved exactly 3 hours stays active, visibility-triggered expiry hides and refreshes once, the 30-second timer updates elapsed time and expires the banner. Scoped test fixtures proved stale sessions close at last activity and zero-set summaries show 0 minutes when stale and 5 minutes when explicitly finished after 5 minutes. Independent review found no issues. Screenshots are .playwright-mcp/spec11-banner.png, spec11-workout.png, and spec11-summary.png. Temporary Clerk accounts and their database rows were removed. Existing unrelated review-file deletion remains outside this commit.

# 12 Dashboard

## Specification

- Goal: implement spec 12 exactly, read-only.
- Scope: rank/heat rules, user-scoped dashboard query, power card, stats, activity map, and recent workouts.
- Decisions: reuse session-end rules, LocalTime, MuscleMap, and existing design tokens; parameterized volume SQL; no actions/schema changes.
- Acceptance: correct empty/seeded data, active/empty session exclusions, seven-day boundaries, heat types/accessibility, recent links, mobile layout, tests/lint/build.

## Tasks

- [x] Read spec; mark tracker in progress.
- [x] Implement rules, query, and dashboard UI.
- [x] Verify database aggregates and browser behavior; run tests/lint/build.
- [x] Update tracker/review, commit, push, open PR, merge, and update local main.

## Review

Implemented spec 12 as read-only queries and Server Component UI; no actions or schema changes. All 28 unit tests, 16 PostgreSQL integration checks, lint, TypeScript, production build, and diff checks pass. Tests cover exact seven-day/three-hour boundaries, empty-session exclusions, stale end times, power, duration, volume, primary-only heat, five recent sessions, level-up counts, and scoped SQL with a quote-containing user ID. Playwright at 360 × 640 verified zero/Rookie/idle/empty states, seeded totals (power 60, 9 workouts, 4 h 20 min, 4,920 kg, 3 unlocked), all heat bands and activity labels, unchanged exercise-target labels, five matching summary links, no page errors or overflow, and Diamond Max rank. Review found the existing generated Progress component omitted accessible values; dashboard props now supply min/max/current/text without changing that protected component. Verified 75/100 at Silver with 37.5% visual fill. Screenshots: .playwright-mcp/spec12-full.png and spec12-empty.png. Temporary accounts and test rows cleaned up. Existing review-file deletion remains outside this commit.

# 13 Generate Sheet UI

## Specification

- Goal: implement spec 13 exactly, UI only.
- Scope: client-safe plan types, Radix toggle groups, generation sheet/sample preview, and two triggers.
- Decisions: sample pull-day plan only; Start disabled; controlled inputs retain valid selections.
- Acceptance: correct defaults, touch/keyboard and accessible selection, reselection guard, retained choices after preview, scrollable 360px sheet, tests/lint/build.

## Tasks

- [x] Read spec; mark tracker in progress.
- [x] Implement types, preview, sheet, and placements.
- [x] Verify both triggers, inputs, preview, mobile layout, lint/build/tests.
- [x] Update tracker/review; commit, push, open PR, merge, and update local main.

## Review

Implemented spec 13 with existing Sheet/Button/Badge patterns, generated Radix toggles, client-safe plan types, and a six-exercise sample. No actions, AI calls, database changes, or added package dependencies. All 28 tests, lint, TypeScript, production build, and diff checks pass. Playwright verified Home and empty Workout defaults, 44px targets, touch/keyboard selection, accessible checked states, selected-item guards, retained duration/focus after preview, disabled Start, Escape focus restoration, and a scrollable 90dvh sheet without horizontal overflow at 360 × 640. No page errors. Visuals inspected in .playwright-mcp/spec13-form.png and spec13-preview.png. Review confirmed direct reuse and no extra abstractions. Existing unrelated review-file deletion remains outside this commit.

# 14 AI Workout Generator

## Specification

- Goal: implement spec 14 backend exactly.
- Scope: additive plan/generation migration, pure planning helpers/schema, user-scoped history, OpenAI generation, and authenticated preview action.
- Decisions: reuse transaction retries for atomic attempt limits; no UI or session writes; preserve local schema limits.
- Acceptance: helper/schema tests, scoped history and quota checks, migration status, real pull-plan smoke test, lint/build without a key.

## Tasks

- [x] Read spec and mark in progress.
- [x] Implement migration, helpers/schema/tests, context, AI call, and action.
- [x] Verify database boundaries, selection rules, API smoke test, lint, and build.
- [x] Update review/tracker, push, create/merge PR, and sync local main.

## Review

Implemented spec 14 with an additive JSON plan column and PlanGeneration table, pure planning rules and Zod schemas, scoped 30-day history, OpenAI 7.23 Structured Outputs, and authenticated preview generation. Reused the existing serializable transaction helper to atomically reserve daily attempts before the paid call. No UI changes or session writes. All 38 unit tests, 28 PostgreSQL integration checks, lint, TypeScript, diff checks, and production build with OPENAI_API_KEY overridden empty pass. Tests cover 0/1/2 calibrated candidates, focus filtering, text/array constraints, Auto ties, history/ownership boundaries, rolling quota, concurrent last-slot attempts, missing key, failures, and duplicate collapse. Real gpt-5.4-mini smoke test returned three valid pull exercises in 5.3 seconds; no model/reasoning/schema fallback needed. Independent review found no issues. Temporary database fixtures cleaned. Set Default project monthly OpenAI limit to $10 with hard enforcement and verified it persisted. Vercel deferred by user. Existing review-file deletion remains outside the commit.
