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
