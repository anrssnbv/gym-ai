Add the round flow to the exercise level screen: start a round, run the round timer, log reps, level up. Still local state; persistence comes in spec 10. The timer and level-up rules below were confirmed by the user on 2026-09-25 (see Architecture Decisions in `progress-tracker.md`).

## Game Rules

Extend `lib/game.ts`:

- `REPS_LIMITS = { min: 1, max: 100 }`
- `roundSeconds(compound: boolean)` → 120 for compound, 60 for isolation
- `applySet(state: LevelState, reps: number): { state: LevelState; leveledUp: boolean }`
  - `reps >= TARGET_REPS` → level + 1, `weightKg = roundKg(weightKg + stepKg)`, best reps back to 0, `leveledUp: true`
  - otherwise → best reps = max(best, reps), level and weight unchanged

Extend `lib/game.test.ts`:

- 12 reps levels up and adds the step; 11 does not
- 30 reps levels up exactly one level
- best reps track the maximum below 12 and reset after a level-up
- three level-ups from 20 kg with a 1.1 kg step end at exactly 23.3 kg (without rounding it would be 23.300000000000004)
- `roundSeconds` returns 120 and 60

## Round Timer

Create `components/exercise/round-timer.tsx` (client). While a round is active it replaces the action row of the level card.

- `Start round` starts a countdown of `roundSeconds(exercise.compound)`
- timestamp based: keep `endsAt = Date.now() + seconds * 1000` and render the remaining time from it on a 250 ms interval and on `visibilitychange`, so it's correct after the phone sleeps or the tab is throttled
- big `mm:ss` in `font-mono tabular-nums`, a progress bar, and the label `Round {n}` (n = rounds logged on this screen since it opened + 1)
- before reps are logged: primary `Log reps`, secondary `Cancel` (ends the round without logging)
- after reps are logged: the result line (below) and a primary `Next round` button; starting early (skipping the rest) is allowed
- at 0:00: `Time's up — log your reps` if nothing is logged yet, otherwise `Next round ready`; call `navigator.vibrate?.(200)` once. The timer stays at 0:00 until the user acts.
- keep the screen awake during a round with the Screen Wake Lock API when available (`navigator.wakeLock?.request('screen')`), release it when the round ends or the component unmounts, and ignore errors (it needs HTTPS)

In the exercise page header, show the round length next to the type: `Compound · 2 min rounds` / `Isolation · 1 min rounds`.

## Log Reps Sheet

Create `components/exercise/log-reps-sheet.tsx`:

- bottom `Sheet`, title `How many reps?`, subtitle `{formatKg(weight)} · LV {level}`
- one large numeric input: `type="number"`, `inputMode="numeric"`, `step="1"`, `min`/`max` from `REPS_LIMITS`, required, focused on open
- a full-width `Save` button directly under the input (the iOS number pad has no Enter key); Enter also submits
- on submit: `applySet`, update the state, mark the round as logged, close the sheet
- result line on the round panel when there's no level-up:
  - 11 → `So close — 11 / 12`
  - 9–10 → `Almost there — {reps} / 12`
  - 1–8 → `Keep going — {reps} / 12`

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
- rounds last 2:00 for Barbell Bench Press and 1:00 for Dumbbell Lateral Raise
- with reduced motion emulated, the overlay appears without animation
- no horizontal scroll at 360 px
- (phone) the countdown shows the right time after the phone is locked for 30 s mid-round, and the screen stays on during a round
- `npm run lint` and `npm run build` pass
- `progress-tracker.md` updated
