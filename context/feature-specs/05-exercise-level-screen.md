Build the exercise level screen, the heart of the game: the level card, the calibrate sheet and the adjust sheet. This is gym-ai's "editor", the screen where the user does the work. State is local only. Rounds and reps come in spec 06, persistence in spec 10.

## Game Rules Module

Create `lib/game.ts`: pure functions, no runtime imports (`import type` from `./catalog.ts` is fine).

- `TARGET_REPS = 12`
- `WEIGHT_LIMITS_KG = { min: 0.5, max: 1000 }` and `STEP_LIMITS_KG = { min: 0.25, max: 50 }` (1000 so level-ups on a leg press never exceed what Adjust accepts)
- `interface LevelState { level: number; weightKg: number; stepKg: number; startWeightKg: number; bestRepsAtLevel: number }`
- `roundKg(kg)` — rounds to 2 decimals
- `formatKg(kg)` — `40 kg`, `42.5 kg`, `23.75 kg`; no trailing zeros, no float noise
- `calibrate(weightKg, stepKg): LevelState` — level 1, `startWeightKg = weightKg`, best 0, values rounded
- `adjust(state, weightKg, stepKg): LevelState` — rounds first, then compares. Keeps the level; resets `bestRepsAtLevel` to 0 only if the rounded weight changed.

Create `lib/game.test.ts` (`node:test` + `node:assert`, importing `./game.ts`):

- calibrate gives level 1 with rounded weight and step
- adjust keeps the level; changing the weight resets best reps; changing only the step keeps them; `42.5` vs `42.504` counts as the same weight
- `formatKg(40)` → `'40 kg'`, `formatKg(42.5)` → `'42.5 kg'`, `formatKg(0.1 + 0.2)` → `'0.3 kg'`

## Exercise Screen

Keep `app/(app)/exercises/[groupId]/[exerciseId]/page.tsx` a Server Component. Below the Targets section, render the client component `components/exercise/exercise-level.tsx` and pass it the `Exercise` object from the catalog.

`ExerciseLevel` holds `LevelState | null` in `useState` (`null` = not calibrated). This is temporary: it resets on reload until spec 10.

### Locked State

A card with the `Lock` icon, the title `Unlock this exercise`, the text `Pick a weight you can lift for 12 clean reps.` and a full-width primary `Calibrate` button that opens the calibrate sheet.

### Level Card

- `LV {level}` in `font-display text-level`
- current weight in `font-display text-4xl` via `formatKg`, followed by `per dumbbell` in muted text for dumbbell exercises
- `+{step} per level` in muted text
- `Best at this level` with a `Progress` bar and `{best} / 12`
- `Started at {startWeight}` plus the gain in percent (e.g. `+6%`), shown only when the current weight differs from the start weight
- actions: a primary `Start round` button (`Play` icon; disabled with no handler until spec 06) and an icon button `Adjust` (`SlidersHorizontal`, `aria-label="Adjust weight"`)

## Weight Sheet

Create `components/exercise/weight-sheet.tsx`, used for both calibrate and adjust (a `mode` prop):

- bottom `Sheet`
- title: `Calibrate {exercise name}` or `Adjust weight`
- weight input: `type="number"`, `inputMode="decimal"`, `step="any"`, `min`/`max` from `WEIGHT_LIMITS_KG`, required, `text-base`, a `kg` suffix, focused on open. Label `Weight per dumbbell` for dumbbell exercises, otherwise `Weight`.
- step input: same rules with `STEP_LIMITS_KG`
- prefill:
  - calibrate: step = `DEFAULT_STEP_KG[equipment]`, weight empty
  - adjust: both fields hold the current values
- helper text
  - calibrate: `A weight you can lift for 12 clean reps. Every time you hit 12, the weight goes up by the step.`
  - adjust: `Changes the weight for this level. Your level stays the same.`
- full-width primary submit button (`Unlock level 1` / `Save`) directly under the inputs, not pinned to the bottom of the sheet, so the keyboard doesn't cover it. Enter submits. The browser's native validation messages are enough.
- on submit: `calibrate()` or `adjust()`, update the state, close the sheet

## Scope Limits

- no round timer, no rep logging, no level-up (spec 06)
- no database, no Server Actions
- no set history list

## Check When Done

- `npm test` passes, including the new game tests
- a fresh exercise shows the locked card; calibrating shows `LV 1` with the entered weight and step
- Adjust opens with the current values, changes weight and step, and keeps the level
- empty, 0, negative and 1001 kg are blocked by the form
- no horizontal scroll at 360 px
- (phone) the submit button stays visible while the keyboard is open
- `npm run lint` and `npm run build` pass
- `progress-tracker.md` updated
