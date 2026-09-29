# Spec 18 implementation review

Date: 2026-09-29. Direction A — Anatomy Studio. The user approved detailed anatomical pilots after rejecting the initial schematic SVG studies.

## Changes

- Shared charcoal/lime tokens, Geist Sans hierarchy, consistent control sizing and visible keyboard focus; matching shell and PWA colors.
- Home prioritizes Resume/Generate. Workout highlights the next exercise and separates additional sets from capped planned completion.
- Exercise actions appear before expandable teaching content. Saved-set fractions, explicit completion, Undo, and stopped timers retain their existing behavior.
- Movement images use detailed gray anatomical figures with lime primary and olive secondary regions. Two stacked positions have adjacent HTML captions. Images remain local and load only when opened.

## Local verification

Used a disposable authenticated account, with all writes scoped to that identity. The existing user's session was preserved. Playwright checks ran at 360 × 640, 390 × 844, and 1280 px, plus 200% root text size.

| Check | Result |
| --- | --- |
| Planned exercise | Start 0/3 → Next 1/3 → 2/3 → Exercise done 3/3; tapping completion returns to Workout. |
| Save failure/retry | Aborted save showed a retry error and retained 2/3. Successful retry produced 3/3 once. |
| Undo | Accepted confirmation restored 2/3 and Next set. |
| Timer | Saved timer stayed at 01:59 after waiting; manual exercise logging and level-up also passed. |
| Additional sets | Surplus planned and unplanned sets remained separate; planned count stayed 3/15. Summary retained 5 actual sets and 2 additional sets. |
| Real generation | 60-minute Auto returned 8 exercises, 10 sets, estimated 57 minutes; preview and Start succeeded. |
| Deferred images | Closed preview requested no movement assets. Opening Hack Squat requested only its image. |
| Image failure | Blocked asset showed fallback; setup, movement, muscle names, and independent muscle details remained available. |
| Onboarding/settings | Four steps, missing-goal and empty-equipment errors, save, and edit succeeded. |
| Layout | No horizontal overflow at tested sizes or enlarged text. Calibration action remained inside a shortened 360 px viewport; this does not emulate an actual iPhone keyboard. |
| Accessibility | Keyboard focus has a solid lime outline. Normal text token contrast is at least 4.83:1 across four surfaces; primary button contrast is 12.95:1. Reduced-motion styles retained. Clerk input background corrected to charcoal with a strong border and 48 px height. |
| Automated checks | 49 unit tests, 59 PostgreSQL integration tests, TypeScript, lint, and production build passed. Lint retains one pre-existing warning in the ignored production smoke login helper. |
| Independent code review | No actionable findings in counts, extras, Undo reconciliation, completion routes, deferred images, or control sizing. |

Manual testing prompted fixes to wrapping control labels, preference grids at enlarged text, duplicate workout banners, progress accessibility attributes, keyboard focus, error-color contrast, and Clerk input styling. No generation prescription, database schema, authentication, or save-action behavior was changed.

All 50 replacement illustrations passed individual review and a final contact-sheet review. Total size is 1.78 MiB; largest 59.8 KiB. [Artwork inventory](exercise-demo-artwork.md) records final source filenames and corrections.

## Release verification

Pending the final artwork audit and deployment. Hosted baseline on the same automated browser/connection: first Exercises/Workout/Home transitions 1499/1414/1422 ms; warm transitions 880/885/880 ms. These are one observed run, not a phone or network performance guarantee.

## Remaining device checks

Physical iPhone keyboard-open calibration/logging, installed-PWA safe areas, and captions require the user's device. Desktop automation does not close those acceptance items.
