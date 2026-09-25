Add the muscle map: a stylized front and back body SVG where every muscle head from `lib/catalog.ts` is its own region. Show it on the exercise list and the exercise page from spec 03. Presentation only; no data layer, no interactivity.

## Body Paths

Create `components/muscle-map/body-paths.ts`:

- `BodyView = 'front' | 'back'`
- `HEAD_PATHS: Record<MuscleHeadId, [BodyPath, ...BodyPath[]]>` with `BodyPath = { view: BodyView; d: string }`. The `Record` + non-empty tuple type makes TypeScript reject a missing head.
- A head visible from both sides (side delts, upper traps, gastrocnemius) may have paths in both views.
- `BODY_PATHS: Record<BodyView, string[]>` for the non-muscle parts: head, neck, hands, forearms, knees, feet.
- Each view is one figure in its own `0 0 200 440` coordinate box.
- Draw only the left half of each figure (x ≤ 100). The component renders every path twice, the second time mirrored with `transform="translate(200 0) scale(-1 1)"`. This guarantees symmetry and halves the drawing work. Regions on the center line (abs, upper traps, mid back, lower back) are drawn as their left half too.

Drawing rules:

- low-poly / geometric style (polygons with absolute coordinates)
- must read as a body at 120 px wide
- anatomically correct placement, for example: upper chest just below the collarbone, lower chest along the bottom edge of the pec; triceps long head on the inner back of the upper arm, lateral head on the outer side; vastus medialis as the teardrop above the inner knee; soleus below and beside the gastrocnemius
- hand-author the paths, or adapt an openly licensed body outline and note its license at the top of the file. No runtime body-map library.

## MuscleMap Component

Create `components/muscle-map/muscle-map.tsx`. No hooks and no `"use client"`, so it works in Server Components.

Props:

- `intensity: Partial<Record<MuscleHeadId, 1 | 2 | 3>>`
- `view?: BodyView | 'both'` — default `'both'`; `both` places the back figure to the right of the front one
- `focusGroup?: MuscleGroupId` — crops to that group's area; when set, it decides the view and `view` is ignored
- `className?: string`

Rendering:

- head regions: no intensity → `fill-muscle-idle`, 1 / 2 / 3 → `fill-muscle-1` / `-2` / `-3`
- non-muscle parts: `fill-body`
- 1 px stroke in the page background color between regions, with `vector-effect="non-scaling-stroke"` so it stays 1 px at any size
- `GROUP_FOCUS: Record<MuscleGroupId, { view: BodyView | 'both'; viewBox: string }>` inside this file. Chest, biceps, quads, abs → front; back, triceps, hamstrings, glutes, calves → back; shoulders → both.
- `role="img"` with an `aria-label` built from the catalog names, e.g. `Targets upper chest. Also works mid chest, front delt.` (intensity 3 = targets, 1–2 = also works)

Also export `exerciseIntensity(exercise: Exercise)` from this file: primary heads → 3, secondary → 1.

## Use It

- `/exercises/[groupId]` exercise cards: a map about 64 px wide on the left of each card, with `focusGroup` set to the page's group and `exerciseIntensity`. This is how the list shows which part of the muscle each exercise targets.
- `/exercises/[groupId]/[exerciseId]`: a full-width map above the Targets section with `exerciseIntensity`, both views, not cropped (secondary heads can be on the other side of the body).
- The groups grid on `/exercises` stays text-only.

## Scope Limits

- no heat-map data and no dashboard use (spec 12)
- tapping a region does nothing
- no hex colors in the SVG; fills come from the tokens

## Check When Done

- TypeScript rejects `HEAD_PATHS` if any head is missing
- the user approves screenshots (64 px thumbnail and full width) of: Barbell Bench Press, Incline Dumbbell Press, Hammer Curl, Overhead Cable Extension, Leg Extension, Seated Calf Raise, Face Pull
- no horizontal scroll at 360 px
- screen readers announce the targeted heads
- `npm run lint` and `npm run build` pass
- `progress-tracker.md` updated
