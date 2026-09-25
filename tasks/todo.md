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
- [ ] Configure Clerk keys; initializer stalled during automatic setup.
- [ ] Verify doctor, redirects, public assets, mobile layout, lint/build, and tests.
- [x] Push branch and open draft PR.
- [ ] Merge and sync main after live auth verification.
- [ ] User confirms sign-up/sign-out and installed-phone email-code authentication.

## Review

Clerk CLI scaffolded proxy, provider, auth pages, and URL environment settings. Added spec 07 theme, access check, auth branding, default user menu, redirect settings, and tracked env example. Lint, production build, and all 17 tests pass. Public manifest and icon endpoints return 200 signed out. Code review found no actionable issues. CLI doctor reports missing Clerk API keys; automatic initialization stalled and was stopped. Auth pages currently fail with Clerk’s missing-key error, so signed-out redirects, rendered form layout, sign-up/sign-out, and installed-phone behavior remain unverified. No environment files were read or printed. Draft PR remains unmerged pending configuration and verification.
