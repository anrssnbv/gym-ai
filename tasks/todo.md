# Production incident repair plan — 2026-09-25

## Specification

- Goal: resolve the three open production findings in `context/current-issues.md` (PROD-01 through PROD-03) without exposing another credential or altering workout history.
- Scope: the OpenAI key and generation error path, quota behavior for malformed configuration, Vercel environment/deployment verification, and the second Vercel project's Clerk configuration.
- Decision: keep `gym-ai` and `gym-ai-seven-alpha.vercel.app` as the primary deployment. Treat `gym-ai-z3nm` as a separate deployment until its purpose is confirmed; recommend disconnecting its Git integration if it is an accidental duplicate.
- Stop condition: the primary site's authenticated generation succeeds and logs remain safe; the second project's 500/check noise is removed or its auth is verified. Previously fixed QA findings stay closed.

## Ordered work

1. [ ] **Contain the leaked key (PROD-02, urgent).** In the existing OpenAI project, revoke the key printed in Vercel logs. Review usage since the first logged exposure and confirm the existing $10 monthly hard limit. Keep key material out of terminal output, PRs, test fixtures, and this file. Determine every place the old key was copied, including `.env.local` and both Vercel projects. A temporarily unavailable AI feature is acceptable while the compromised key is invalidated.
2. [x] **Patch the narrow code path before installing a replacement.** In `generateWorkout`, reject a missing or whitespace/control-character-containing `OPENAI_API_KEY` before the `PlanGeneration` reservation, with a configuration error that reveals no key. Replace raw `console.error(..., error)` with fixed-stage/allowlisted error metadata; never log exception messages, stacks, request headers, or environment values. Keep the existing quota reservation for valid provider attempts, including normal upstream failures, to preserve the anti-abuse rule.
3. [x] **Add focused regression proof.** With a deliberately malformed *fake* key, the action returns a configuration error, makes no OpenAI call, creates no attempt row, and prints no fake secret. With a valid fake key, existing quota concurrency and failed-provider tests still pass. Run the unit/database suites, lint, TypeScript, and production build. Review the diff for secret values and unrelated changes.
4. [ ] **Install a new key safely.** Create a replacement key in the same budgeted OpenAI project. Put its single-line value into local development (if needed) and the primary Vercel project's Preview and Production `OPENAI_API_KEY` secret; validate only its presence and absence of whitespace, never its value. Redeploy because Vercel environment changes do not alter existing deployments. Do not reuse the disclosed key or copy an entire `.env` block into one variable.
5. [ ] **Verify the primary deployment end to end (PROD-01).** Test Preview first with a disposable signed-in account and a completed training profile: choose a duration and focus, generate one preview, and check valid exercises/limits. Confirm exactly one attempt is recorded, no credential appears in sanitized logs, and no workout history changes before Start. Deploy the same code/config to Production and repeat one authenticated generation there. Confirm the public alias, OpenAI usage/budget, and safe runtime logs. Clean only disposable test accounts and their own rows.
6. [ ] **Handle attempts lost to the outage.** Inspect affected users' rolling `PlanGeneration` counts by scoped user ID and failure window. Prefer natural 24-hour expiry. If immediate access is needed, reconcile only demonstrably failed attempts for the affected account, with an audit trail; never clear all users' attempts or workout history. Verify the user-facing limit after recovery.
7. [x] **Resolve the second deployment (PROD-03).** Keep `gym-ai-z3nm` connected while its purpose is unconfirmed. Set its Clerk publishable key as Config and its matching secret key as Secret for Preview and Production, redeploy, and verify signed-out `/` reaches a working sign-in page. Review whether the duplicate project is needed separately; do not delete it without evidence about traffic or domains.
8. [ ] **Close with evidence.** Record deployment IDs, sanitized log outcomes, authenticated smoke results, quota outcome, and final status for PROD-01/02/03 in `context/current-issues.md` and `context/progress-tracker.md`. Follow the established branch → PR → merge → local `main`/`development` sync workflow for the code change.

## Release and rollback checks

- Do not put a replacement key into a deployment that can still print raw exceptions. An old immutable Vercel deployment may retain the old value; revocation makes that value unusable.
- If generation fails after the new deployment, leave the old key revoked. Disable the AI secret in a fresh deployment if needed to fail closed while fixing the cause. Do not roll back to the raw-logging version.
- User-visible acceptance: the primary site can generate a plan from a selected duration/focus without the generic retry error; a malformed key cannot consume quota or appear in logs; the second site's 500 is resolved or its duplicate integration is removed.

## References

- [OpenAI API key safety and rotation](https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety)
- [Vercel secret rotation and redeployment](https://vercel.com/docs/environment-variables/rotating-secrets)
- [Clerk's Vercel key setup](https://clerk.com/docs/guides/development/deployment/vercel)

## Review

PR #20 merged as `8140279` and both Vercel builds succeeded. The malformed-key guard and safe-stage logging pass 10 focused generation checks, 50 unit tests, 56 serial PostgreSQL integration checks, lint, and production build. Serial mode is now the standard integration script after repeated transaction conflicts under parallel files. The second project's Clerk variables were corrected and its production alias now redirects to a rendered sign-in page. PROD-01/02 still require the user's key rotation, Vercel replacement secret, and authenticated live generation proof. Existing user training and quota rows were untouched.

# Production generation issue report — 2026-09-25

## Specification

- Goal: diagnose the reported Generate workout failure and record actionable findings in `context/current-issues.md`.
- Scope: inspect production runtime logs, the Server Action and AI call path, and the second connected project's runtime failure. Preserve prior QA evidence.
- Decision: document and redact credentials; implementation and secret rotation are separate follow-up work.
- Acceptance: distinguish observed errors from inferred causes, identify the user impact and relevant code path, and give reproducible acceptance checks.

## Tasks

- [x] Inspect user-facing error path and production runtime logs.
- [x] Trace generation reservation, OpenAI header construction, and error handling.
- [x] Record primary generation, credential exposure, and second-project auth findings.
- [x] Verify the issue file contains no key material and passes whitespace checks.

## Review

Vercel logged an invalid Authorization header containing a second environment-variable assignment; the Server Action catches it and shows the reported error. Its reservation precedes the failed OpenAI call, so retries consume app quota. The raw exception disclosed the key in Vercel logs; the report redacts it and calls for rotation. The second connected Vercel project independently returns HTTP 500 because Clerk reports missing keys. No production configuration or application code was changed during this documentation task.

# Vercel deployment — 2026-09-25

## Specification

- Goal: deploy the merged application to the existing Vercel project.
- Scope: correct its database secret, verify Preview, redeploy Production, and check the public auth entry.
- Decision: use the validated direct Prisma Postgres URL already in `.env.local`; send its value to Vercel via stdin without printing it. Deploy the existing merged `main` commit.
- Acceptance: Preview migration/build succeeds, Production is Ready at its alias, signed-out Home reaches Clerk sign-in, and credentials stay out of repository/logs.

## Tasks

- [x] Inspect the failed Vercel build and local database URL.
- [x] Update the Preview/Production secret and verify Preview migration/build.
- [x] Redeploy merged `main` to Production and verify public auth rendering.
- [x] Record the deployment result in the tracker.

## Review

Preview and Production both report Ready. Production deployment of merge commit `9590880` is aliased at https://gym-ai-seven-alpha.vercel.app. A fresh browser visit to Home reached Clerk sign-in; the page rendered with no JavaScript errors. No application code or dependency changed. Authenticated production flows and physical-phone checks remain to be verified.

# 16 Training profile — implementation

## Specification

- Goal: implement spec 16 exactly and deliver through the established branch/PR workflow.
- Scope: additive profile storage, four-step survey, editing and routing, profile-aware AI planning, tests and documentation.
- Decisions: reuse current packages/actions; preserve training history and manual game rules; leave the unrelated review-file deletion untouched.
- Acceptance: checkpoint tests, complete unit/database suites, lint/build, Playwright signup/survey/edit/generation/ownership/retry flows, one live personalized plan, cleaned test data, merged PR and synced main/development. Track physical-phone acceptance separately.

## Tasks

- [x] Read spec and mark tracker in progress; create feature branch.
- [x] Implement and verify profile storage, validation, query, and action.
- [x] Implement and verify onboarding, editing, and route boundaries.
- [x] Integrate profile defaults, candidate filters, limits, Auto, and Start validation.
- [x] Run regression/build/browser checks and review; clean test fixtures.
- [x] Synchronize specs/context and open delivery PR #18.
- [x] Prepare verified PR for merge and main/development sync; deployment is user-managed.

## Review

Implemented all three checkpoints with no new packages or environment variables. Additive migration preserved existing training rows. All 50 unit tests, 56 PostgreSQL integration checks, lint, TypeScript, production build, migration status, and diff checks pass. Playwright verified signup, onboarding/editing, mobile layout, keyboard controls, exact totals, auth redirects, offline and committed-save retry, cross-context preferences, malformed profiles, actual database-outage recovery, stale-preview rejection, and one live personalized plan played to completion after equipment preferences changed. Old-tab logging committed once before onboarding. Independent UI/backend reviews found no actionable issues. Both temporary accounts and all owned rows were cleaned. Physical-phone/installed-app checks remain manual; real OAuth-provider interaction was not repeated. Delivery is in progress.

# 16 Training profile — specification only

## Specification

- Goal: design the first-sign-in survey and write `context/feature-specs/16-training-profile-onboarding.md`.
- Scope: questions, persistence, onboarding/edit flows, integration with the existing workout generator, and acceptance criteria. No application implementation or migration execution.
- Decisions: four short steps; derive weekly hours from days and session minutes; collect equipment access; preserve the existing game rules and training history.
- Acceptance: exact data/action/UI contracts, first-use and returning-user behavior, errors/retries, ownership, candidate filtering, and testable personalization rules. Mark planned behavior separately from current implementation.

## Tasks

- [x] Read the spec template, current auth/AI code, catalog, and context docs.
- [x] Analyze integration risks with an independent read-only review.
- [x] Write spec 16 and synchronize planned context/roadmap entries.
- [x] Review contracts and edge cases; verify the documentation diff.

## Review

Wrote spec 16 against the current auth, Prisma, catalog, and AI contracts. It defines a four-step survey, atomic owned profile storage, onboarding/edit routes, weekly time derivation, equipment-aware generation, explicit beginner limits, and schedule-aware Auto selection. Independent review identified the existing root-layout revalidation redirect during old-tab saves; the spec now states that committed mutations persist before onboarding and includes a regression check. Planned sections in the roadmap, product overview, and architecture distinguish the design from current behavior. Documentation diff, required sections, code fences, and whitespace checks pass. No application code, migration, package, or environment changes; application tests were not rerun for this documentation-only task. The unrelated review-file deletion remains untouched.

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

# 15 Wire AI Workout

## Specification

- Goal: implement spec 15 end to end.
- Scope: authenticated start action, parsed plan queries, real generation sheet, planned workout checklist, exercise steps, and summary title.
- Decisions: reuse actions, shared session lookup, transaction retries, callAction, and existing UI components.
- Acceptance: stored plans/ownership, concurrent start and manual attachment, stale rollover, all focus choices, offline retries, quota error, complete mobile browser flow, tests/lint/build. Physical-phone verification tracked separately.

## Tasks

- [x] Read spec and mark in progress.
- [x] Implement backend, sheet, and page wiring.
- [x] Verify integration and browser flows; run tests/lint/build.
- [x] Update tracker/review, push, open/merge PR, and sync local main.

## Review

Implemented spec 15 with existing action/session/UI patterns. Start validates the plan and attaches or rolls over in a serializable transaction. Queries parse stored JSON and compute exercise progress; pages show the planned checklist, extras, and summary. All 39 unit tests, 38 PostgreSQL integration checks, lint, TypeScript, build, and diff checks pass. Playwright touch testing at 360 × 640 covered real generation for all six focuses (Auto 6.6 seconds), 0-set banner and ignored stats, calibration and all nine planned sets, next-step highlights/checks, one extra set, Finish summary, manual attachment preserving the same session, persisted state in a separate desktop context, unknown exercise rejection through a modified Start request, 10-attempt quota without another attempt, and offline recovery for Generate/Regenerate/Start. A stale dev-server Prisma singleton required restarting after the earlier migration. Live history testing exposed model miscounting of core among eligible calibrated candidates; prompt now spells out the same mandatory cap and exact eligible IDs, retaining all server validations. Added a mocked SDK test for focus payload, 0/1/2 calibration caps, null output, and local validation; no extra paid calls in tests. Visuals inspected: .playwright-mcp/spec15-preview.png, spec15-completed-plan.png, spec15-summary.png. Independent review found no defects. All temporary accounts and data cleaned. Physical-phone acceptance remains pending; browser emulation is not claimed as a physical device test. Vercel remains deferred. Existing unrelated review-file deletion remains outside the commit.

# Full application QA audit

## Specification

- Goal: audit the complete application against specs 01–15 and record issues in context/current-issues.md.
- Scope: Playwright MCP UI/UX and training flows, auth, persistence, concurrency/retry, AI, logs, and targeted code review.
- Decisions: report only; no product fixes. Use disposable test accounts/data and preserve the user's sessions.
- Acceptance: a per-spec coverage matrix, reproducible findings with evidence/severity/locations, explicit physical-device limits, and cleaned test fixtures.

## Tasks

- [x] Read requirements and plan audit coverage.
- [x] Run app checks and Playwright route, UI, auth, and workout scenarios.
- [x] Review terminal/code evidence and reproduce candidate issues.
- [x] Write current-issues.md with findings, passing checks, and limitations; clean fixtures.

## Review

Recorded five confirmed defects in context/current-issues.md: wrong-weight logging after concurrent Adjust, unsafe Undo targeting/retry, progression beyond Adjust's maximum, stale feedback after Undo, and a small header tap target. Separately documented two validation gaps, transport/auth observations, signup blocked by Turnstile, terminal warnings, per-spec coverage, and physical-device limits. Playwright covered all 10 group and 50 exercise routes, email-code login/logout, manual and generated workout completion, offline recovery, concurrency, quota, persistence, ownership, and responsive layouts. All 39 unit tests, 38 database integration checks, lint, production build/TypeScript, and migration status passed. Both disposable accounts and their scoped database rows were removed; test browser contexts closed; original tabs preserved. No product code changed. Existing unrelated review-file deletion remains untouched.

# QA fixes — analysis and plan

## Specification

- Goal: analyze the QA findings and define a concrete repair plan.
- Scope: QA-01 through QA-05, GAP-01/02, OBS-01/02/03, and terminal warnings.
- Decisions: reuse existing transactions, schemas, and test suites; no new dependency or schema change expected. User requested individual exercise weight limits; the 50-entry proposal is in context/exercise-weight-limits.md. Investigate uncertain observations before choosing fixes.
- Acceptance: each finding has a cause, planned change or investigation, affected code, and verification criteria in context/qa-fix-plan.md. Implementation authorized by the user's “start fixing” instruction and completed on fix/qa-training-integrity.

## Tasks

- [x] Read the QA report and trace current action/UI/query callers.
- [x] Review plan-validation and observation findings independently.
- [x] Write prioritized changes, product decisions, and regression checks.
- [x] Implement data-integrity fixes and reconcile Undo feedback.
- [x] Implement the per-exercise weight limits and header target fix.
- [x] Enforce generated duration, plan uniqueness, and focus consistency.
- [x] Resolve/reclassify the transport, offline-auth, and signup observations.
- [x] Run focused/full checks, update issue evidence, and prepare the verified changes for the existing branch/PR workflow.
- [x] Push the verified branch and open [PR #17](https://github.com/anrssnbv/gym-ai/pull/17) for delivery to main.

## Review

Implemented the five defects and both validation gaps without new dependencies or schema changes. All 45 unit tests, 45 PostgreSQL integration checks, lint, production build/TypeScript, and diff checks pass. New limit/plan regressions failed before implementation and passed afterward. Playwright verified stale snapshots, targeted Undo, lost-response log/Undo retries, cap feedback, Undo reconciliation, timer preservation, 44 px header target, manual completion, and a live nine-set planned workout (1.8 t). Fresh independently authenticated contexts recovered after 86 seconds offline and a controlled 503 with no page errors. Revoking the temporary mobile session preserved its exercise return URL, and email-code re-login returned there without an unsaved set. Clerk's supported development testing-token flow completed signup, email verification, Home redirect, and signout; live human CAPTCHA/device checks remain manual. Existing warnings remain documented. Independent correctness review found no actionable issues. Both temporary accounts and their database rows were deleted, test contexts closed, and original user tabs preserved. Delivery is recorded in PR #17.
