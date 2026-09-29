# 18 — Consistent UI/UX and exercise illustrations

**Status: Direction A selected — implementation pending.**
**Date:** 2026-09-29. The user selected **A — Anatomy Studio**. Directions B and C remain comparison references only.

## Selected direction

Use charcoal backgrounds, soft lime actions and muscle highlights, neutral gray anatomical figures and equipment, Geist Sans typography, and spacious layouts. Apply the shared interaction and illustration contracts below. Keep a single dark theme for this release.

Next design milestone: detailed exercise and active-workout screens plus the Hack Squat, Bench Press, and Cable Curl illustration pilots. Direction selection is complete; the detailed screens and artwork have not yet been reviewed or implemented.

## Goal

Make Gym AI feel like one organized product across Home, Exercises, Workout, exercise execution, generation, onboarding, settings, and authentication. Replace the shaded AI-generated movement pictures with flat anatomical illustrations that belong to the same visual family as the existing muscle maps. Prioritize understanding the next action and completed sets on a phone.

## Current app audit

Reviewed the current source, the user's screenshots, and the shipped Hack Squat artwork. This is a design audit, not a new authenticated usability or performance measurement.

| Finding | Evidence | Proposed response |
| --- | --- | --- |
| Two illustration styles compete | `MuscleMap` renders flat SVG body regions; `public/exercise-demos/hack-squat.webp` has a shaded person, textured machine, navy background, and baked-in lime labels | One anatomy-based illustration guide for both types of content; movement still shows the actual equipment and poses |
| Learning content pushes training far down the page | Exercise detail renders demo, full muscle map, and target cards before `ExerciseLevel` | Put the exercise action and workout progress first; place expandable teaching content immediately below |
| Several visual accents compete | Global tokens use lime for action, violet for AI, gold for levels; Generate uses violet while Start uses lime | Use one primary action color everywhere; make AI attribution and levels quiet secondary labels |
| Typography makes ordinary information feel like a game score | Oxanium is applied to titles, cards, weights, and stats | Use the existing Geist Sans for hierarchy, tabular numerals for data, and Geist Mono only for the timer |
| Progress exists but has different presentations | Workout rows show completed/total sets; exercise buttons already show `Start round`, `Next round`, and `Exercise done` with counts | Keep the existing working count logic; present consistent completed/total labels and explicit completed states |
| Home gives power/rank priority over the next workout | Home source places the power card before Generate; active session also has a shell banner | Give resume/generate priority and remove duplicate prominent resume controls while keeping rank available |

Existing strengths to preserve: three labelled navigation tabs, shared theme tokens, keyboard-aware sheets, local on-demand images, accessible muscle descriptions, set logging and Undo, generation rules, and the recent category-prefetch performance fix.

## Reference review

Official public product pages reviewed on 2026-09-29. These demonstrate patterns, not evidence that one design is universally better. We did not test competitors' installed apps. Use original layouts and artwork; do not copy their assets.

| Reference | Useful pattern | Application to Gym AI |
| --- | --- | --- |
| [Hevy: Log & Track Workouts](https://www.hevyapp.com/features/track-workouts/) | Its published screen shows aligned set/weight/reps rows, completed checks, and a prominent timer; the guide describes previous workout values | Keep the current exercise and set progress easy to scan. Use aligned rows in history, without adding Hevy's editing or social features |
| [Strong](https://www.strong.app/) and [first-workout guide](https://help.strongapp.io/article/229-my-first-workout) | Emphasis on a simple workout log, reusable routines, and a direct exercise-to-workout flow | Reduce competing cards and decoration around the current action. Do not introduce a routine builder in this spec |
| [Fitbod: Exercise Guides](https://fitbod.me/exercises) and [exercise details documentation](https://help.fitbod.me/hc/en-us/sections/360001927994-Getting-Started) | Exercise education sits alongside workout planning; guidance includes exercise details and demonstrations | Keep movement instructions reachable from both the proposed workout and exercise detail. Use our static anatomical illustrations instead of adding video |

Design inference: combine the clarity of a training log with this app's anatomical visual identity. A new host, complex animation, and additional dashboard metrics are not needed to achieve that.

## Three visual directions

Open [the comparison board](18-ui-ux-directions.html). All three use the same example workout so differences in hierarchy, spacing, density, and color are easy to compare. Figures are illustrative, not live user data. The board is not production UI or final movement artwork.

| | A — Anatomy Studio (recommended) | B — Training Journal | C — Performance Console |
| --- | --- | --- | --- |
| Character | Calm, modern, dark, anatomy-led | Bright, editorial, approachable | Compact, technical, gym-focused |
| Palette proposal | Charcoal `#101414`, surface `#1A2020`, lime `#C6F36B`, text `#F4F7F5` | Off-white `#F5F4EF`, white cards, deep teal `#176453`, text `#192A25` | Navy `#0E1624`, surface `#172337`, blue `#91BEFF`, text `#F1F5FD` |
| Layout | One featured next exercise, quiet rows below, generous spacing | Grouped sections, thin dividers, fewer card outlines, easy reading | Compact exercise queue, prominent set totals, aligned numeric columns |
| Illustration | Neutral gray anatomical figure, lime target regions, flat gray equipment | Graphite figure, teal target regions, light equipment backdrop | Cool gray figure, blue target regions, restrained technical arrows |
| Levels and rewards | Small secondary badges | Inline text beside progress | Small metadata beside weight |
| Tradeoff | Least visual migration; best continuity with existing muscle maps | Needs a full light-theme review of Clerk, sheets, inputs, maps, and PWA chrome | More information per screen; requires care to avoid small or crowded controls |

All directions use Geist Sans, consistent icons, clear focus styles, and one action color. Direction A is selected for the first release; a theme switcher is separate scope. Palette values must pass contrast checks before adoption.

**Recommendation:** A keeps the recognizable lime/anatomy identity while removing visual competition. The largest usability improvement comes from information order and consistent states, not recoloring alone.

## Shared interaction contract

These improvements apply whichever visual direction is selected.

### Navigation and hierarchy

- Preserve Home, Exercises, and Workout, with visible labels and an obvious current tab. Keep current routes and back links.
- Every screen has one page title, optional short context, and one dominant next action. Secondary controls use outline or text treatment.
- Home: prioritize Resume workout when active; otherwise Generate workout. Follow with existing recent activity, statistics, muscle activity, and rank. Avoid duplicate large resume banners.
- Exercises: retain muscle groups and their maps, consistent group cards, and scannable exercise rows. Search/filter features are not required for this redesign.
- Workout preview: show focus, exercise count, total sets, estimated work/rest duration, and warm-up caveat before exercise rows. Keep instructions expandable and Start easy to reach.
- Active workout: show `4 / 10 sets completed` derived from the plan, then the next exercise and remaining exercise rows. Completed rows have a check plus text. Additional unplanned sets remain separate and must not inflate planned completion.
- Exercise: name/equipment, workout context if present, weight and set action, teaching content, then history. In training mode, the timer and logging action remain ahead of expanded educational content.
- Summary/history: use the same number formats, section headings, and aligned set rows. Keep Undo and its pending/error behavior.
- Onboarding/settings: reuse the same inputs, choice states, spacing, errors, and button styles; retain all existing fields and save rules.
- Sign-in/sign-up: match the selected theme through supported Clerk appearance options; preserve the provider's authentication behavior.

### Set progress and timing

- The fraction means **successfully saved sets / planned sets**, not the next set number. Show a nearby `sets completed` label so `0/3` is unambiguous.
- Planned exercise: `Start set · 0/3`; while active, `Log reps`; after saving one set, `Next set · 1/3`; at the target, `Exercise done · 3/3` returns to Workout when tapped.
- Use `set` consistently for the user-facing training step; retain underlying round logic and IDs. Manual exercise sessions have no invented denominator.
- Update counts only after successful saving. A failed save offers retry without showing completion. Undo restores the corresponding count and action.
- Preserve the existing stopped timer after a saved set. Do not relabel the current round timer as a rest timer or change its duration. Generator duration estimates and the exercise countdown have different purposes.
- No automatic redirect after the final set: leave the result visible until the user taps Exercise done. This is the proposed predictable default; changing it is a separate choice.

### Shared visual rules

- Define colors centrally in `app/globals.css`; retain semantic token names and component mappings. Update `context/ui-context.md` only after direction selection.
- Use a small spacing scale: 4, 8, 12, 16, 24, 32 px. Start with 16 px phone gutters, 16 px card padding, 12 px control radius, and 16 px card radius; direction B may use divided sections instead of cards.
- Target 28 px page titles, 20 px section titles, 16 px body/input text, and 14 px secondary labels. Avoid relying on tiny text for workout decisions.
- Use existing Lucide icons consistently at 20–24 px. Touch targets at least 44 × 44 px; main action height 48–52 px.
- Standardize idle, selected, focused, pressed, disabled, pending, success, empty, and error treatments. Pair color with text or an icon.
- Reserve red for errors/destructive actions and gold, if retained, for small reward indicators. AI-generated content does not need its own primary button color.
- Keep surfaces simple: no background photos, glass blur, oversized glow, or animation dependency. Respect reduced motion.

## Unified illustration contract

The requested change is a different drawing style, not another photorealistic generation prompt. The movement guide and muscle map must visibly belong together.

1. Use a neutral, faceless anatomical figure with flat fills, consistent proportions and outline weight. No skin texture, clothing detail, photographic lighting, or realistic gym background.
2. Show primary muscles in the selected accent; secondary muscles use a quieter tint, with a text legend. Muscle names come from the existing catalog. Do not imply the colors measure live activation, recovery, or injury risk.
3. Keep equipment neutral and simplified but identifiable. A Hack Squat must still show the angled machine, back pad, shoulder pads, and foot platform. Do not distort the existing upright muscle-map paths to invent articulated movement.
4. Use two clear positions, Start and the exercise-specific second position, with directional arrows. Prefer adjacent HTML captions and instructions so text stays readable and accessible.
5. Keep equivalent camera angle, figure scale, framing, line weight, and background treatment across all 50 catalog exercises. Preserve the movement-specific setup and return instructions.
6. Prefer purpose-drawn static SVG for flat anatomical artwork. Pilot Hack Squat, Bench Press, and Cable Curl before choosing the final delivery format. If accurate SVG is impractical, use reviewed flat vector-style WebP at the existing 960 × 1200 dimensions and at most 160 KB per exercise. Never ship a generic silhouette as a finished demonstration.
7. Keep the existing local asset mapping and shared `ExerciseDemo` entry points. If the pilot selects SVG, update source mapping and the asset audit together; do not change catalog IDs or add runtime generation. Keep prior accurate assets until replacements are ready.
8. Review all 50 assets for anatomy, grip/contact, equipment, and movement; update the creator/license inventory. Competitor screenshots are inspiration only and are not reusable artwork.
9. Load illustrations only when opened. Instructions remain usable if media fails. Muscle target details remain available independently from the movement guide.

The first artwork milestone is **three reviewed examples**, including Hack Squat, before producing the entire set. The current task does not generate replacement art.

## Implementation plan for Direction A

### 1. Confirm direction and a representative screen

- Direction A is recorded as selected. Use its palette and spacious layout for the detailed designs.
- Produce exercise-detail and active-workout designs with real long names, zero/partial/complete progress, and one matching anatomy/movement specimen.
- Review the selected design with the user before rolling it across the app. Confirm the three illustration pilots before catalog-wide replacement.

### 2. Establish shared presentation

- Update theme tokens, font assignments, and UI context. Reuse the installed Button, Card, Badge, Progress, Sheet, and Input components.
- Standardize repeated application layouts only where duplication exists. Avoid a new component framework, broad state refactor, or new dependencies.
- Align shell, navigation, Clerk appearance, PWA theme color, and loading/error states with the chosen palette. B requires removing assumptions that all surfaces are dark.

### 3. Apply the hierarchy to existing flows

- Update Home, catalog/group lists, exercise detail, workout empty/preview/active/history screens, onboarding, and settings.
- Reuse existing set-count and completion logic. Add the planned-workout total from actual plan/set data without counting unplanned extras.
- Keep keyboard-aware sheets and safe-area spacing. Verify expanded demos cannot obscure the active action or bottom navigation.

### 4. Replace artwork as one reviewed collection

- Produce the remaining illustrations using the approved pilot style, verify all catalog IDs, and update the inventory and asset checks.
- Deploy the matching set together after review; do not mark partial coverage as complete.

### 5. Verify and deliver

- Run focused behavior checks, existing unit tests, lint, and production build. Reuse current test tools.
- Check mobile layouts at 360 × 640 and 390 × 844, desktop at 1280 px, and 200% text zoom. Inspect long names, large weights, and empty/error states.
- On a physical iPhone, verify keyboard-open calibration/logging, sheet scrolling, safe-area spacing, and readable illustration captions. Desktop emulation does not close this gate.
- Compare the same authenticated hosted navigation paths before/after under matching conditions. Preserve disabled category prefetch; no demo downloads while closed and only the selected asset loads when opened. Design changes must not add server requests to a tab change.
- After implementation is verified, follow the repository's development → PR → main workflow and update the tracker with evidence.

## Acceptance checklist

- [x] User chooses Direction A; spec records the choice.
- [ ] Detailed screens and three illustration pilots reviewed with the user.
- [ ] All listed screens follow the same typography, spacing, action hierarchy, icon style, and states.
- [ ] Workout controls appear before large learning sections; expanded content remains reachable without overlap.
- [ ] `0/3 → 1/3 → 3/3`, failed save, Undo, manual exercise, and final return to Workout behave correctly.
- [ ] Planned totals exclude unplanned extras and never show more completed planned sets than the plan contains.
- [ ] All 50 movement guides match the anatomical style and depict the correct exercise and equipment.
- [ ] Both demo entry points use the same artwork/text; instructions remain accessible during loading/failure.
- [ ] No horizontal overflow, clipped labels, hidden focused controls, or keyboard-covered primary action in tested layouts.
- [ ] Normal text contrast is at least 4.5:1; large text and meaningful non-text controls at least 3:1, following [W3C text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and [non-text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). Visible focus, keyboard access, screen-reader names, and reduced motion remain functional.
- [ ] Current exercise limits, logging, Undo, leveling, generation, ownership, and authentication checks still pass.
- [ ] Hosted performance and deferred-media checks pass; physical-phone findings are recorded explicitly.

## Boundaries and compatibility

No AI prompt, workout prescription, database migration, hosting move, pricing change, social feature, theme switcher, video library, or new training metric belongs in this spec. Preserve server validation and authorization.

Direction A in this spec is the target visual direction, superseding the design guidance in spec 01 / `ui-context.md` and the artwork style in spec 17 for the upcoming implementation. Spec 17's exercise identity, educational purpose, deferred loading, accessible text, and coverage requirements remain. Production appearance and `ui-context.md` will be updated during implementation.

## Review of the proposal

The smallest coherent solution is shared tokens plus targeted layout changes and replacement art. A palette-only change would leave exercise actions too far down the page and retain the illustration mismatch. A full app rewrite would add risk without solving more of the stated problem. The user has selected Direction A; detailed screen and artwork review remains the next milestone.
