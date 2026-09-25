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
