Add the round flow to the exercise level screen: start a round, run the round timer, log reps, level up. Still local state; persistence comes in spec 10. The timer and level-up rules below were confirmed by the user on 2026-09-25 (see Architecture Decisions in `progress-tracker.md`).

## Game Rules

Extend `lib/game.ts`:

- `REPS_LIMITS = { min: 1, max: 100 }`
- `roundSeconds(compound: boolean)` → 120 for compound, 60 for isolation
- `applySet(state: LevelState, reps: number, maxWeightKg: number): { state: LevelState; leveledUp: boolean; limitReached: boolean }` — callers pass `exercise.maxWeightKg`
  - calculate the next weight with `roundKg(weightKg + stepKg)` before comparing it with the limit
  - `reps >= TARGET_REPS` and next weight ≤ limit → level + 1, next weight, best reps back to 0, `leveledUp: true`, `limitReached: false`; landing exactly on the limit is allowed
  - `reps >= TARGET_REPS` and next weight > limit → record the performed reps, keep level and weight unchanged, best reps = max(best, reps), `leveledUp: false`, `limitReached: true`
  - below 12 reps → best reps = max(best, reps), level and weight unchanged, both flags false
  - an existing weight above the catalog limit remains loggable and never advances further; do not silently reduce its value

Extend `lib/game.test.ts`:

- 12 reps levels up and adds the step; 11 does not
- 30 reps levels up exactly one level
- best reps track the maximum below 12 and reset after a level-up
- three level-ups from 20 kg with a 1.1 kg step end at exactly 23.3 kg (without rounding it would be 23.300000000000004)
- `roundSeconds` returns 120 and 60
- a next step above the exercise limit preserves level/weight and records best reps; an exact-limit step succeeds; already above-limit progress remains loggable without losing a previous best

## Round Timer

Create `components/exercise/round-timer.tsx` (client). While a round is active it replaces the action row of the level card.

- `Start round` starts a countdown of `roundSeconds(exercise.compound)`
- timestamp based: keep `endsAt = Date.now() + seconds * 1000` and render the remaining time from it on a 250 ms interval and on `visibilitychange`, so it's correct after the phone sleeps or the tab is throttled
- big `mm:ss` in `font-mono tabular-nums`, a progress bar, and the label `Round {n}` (n = completed rounds on this screen + 1 while the current round is unsaved; once saved, that same round is included in the completed count). Spec 10 tracks completed set IDs and removes an acknowledged Undo once.
- before reps are logged: primary `Log reps`, secondary `Cancel` (ends the round without logging)
- after reps are successfully logged: stop the countdown at the acknowledgement time, show `Round complete` with the frozen remaining time and result line, and offer `Next round`. Failed saves keep the round active for retry.
- at 0:00 before reps are logged: show `Time's up — log your reps` and call `navigator.vibrate?.(200)` once. The timer stays at 0:00 until the user acts. Logging successfully at 0:00 shows `Round complete`.
- keep the screen awake during an active round with the Screen Wake Lock API when available (`navigator.wakeLock?.request('screen')`), release it when reps are saved, the round ends, or the component unmounts, and ignore errors (it needs HTTPS)

In the exercise page header, show the round length next to the type: `Compound · 2 min rounds` / `Isolation · 1 min rounds`.

## Log Reps Sheet

Create `components/exercise/log-reps-sheet.tsx`:

- bottom `Sheet`, title `How many reps?`, subtitle `{formatKg(weight)} · LV {level}`
- one large numeric input: `type="number"`, `inputMode="numeric"`, `step="1"`, `min`/`max` from `REPS_LIMITS`, required, focused on open
- a full-width `Save` button directly under the input (the iOS number pad has no Enter key); Enter also submits
- on submit: `applySet(state, reps, exercise.maxWeightKg)`, update the state, mark the round as logged, close the sheet
- result line on the round panel when there's no level-up:
  - 11 → `So close — 11 / 12`
  - 9–10 → `Almost there — {reps} / 12`
  - 1–8 → `Keep going — {reps} / 12`
- when `limitReached`, show a saved-set limit message instead of the ordinary result or level-up reward. Below the limit, explain that the full next step exceeds the limit and a smaller step can fit. At or above the limit, explain that the set is saved and logging at the current weight can continue. Offer `Adjust weight or step`; never suggest reporting a lower actual load just to gain levels.

## Level-Up Overlay

Create `components/exercise/level-up-overlay.tsx`:

- full-screen fixed overlay on `bg-page/90`: `ChevronsUp` icon, `LEVEL {n}` large in `font-display text-level`, then `New weight: {formatKg(weight)}`
- scale-in and gold glow as CSS keyframes in `globals.css`, applied only under `motion-safe:`
- closes by itself after about 1.5 s, or on tap
- `navigator.vibrate?.([80, 40, 120])`
- `role="status"` and `aria-live="polite"`
- after it closes, the round panel shows `Level cleared!`

## Scope Limits

- no database; everything resets on reload
- no set history list and no undo (spec 10 adds both on real data)
- no workout sessions yet
- no sounds, no timer persistence across page navigation

## Check When Done

- `npm test` passes
- full loop: calibrate → Start round → log 10 → best `10 / 12` → Next round → log 12 → level-up overlay → `LV 2` with weight + step → best `0 / 12`
- at an exercise ceiling, log 12 or more → set saved, no level-up reward, same level/weight, accurate best reps and a limit explanation; a next step landing exactly on the ceiling still levels up
- rounds last 2:00 for Barbell Bench Press and 1:00 for Dumbbell Lateral Raise
- with reduced motion emulated, the overlay appears without animation
- no horizontal scroll at 360 px
- (phone) the countdown shows the right time after the phone is locked for 30 s mid-round, and the screen stays on during a round
- `npm run lint` and `npm run build` pass
- `progress-tracker.md` updated
