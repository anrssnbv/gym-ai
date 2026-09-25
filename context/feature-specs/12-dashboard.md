Turn Home into the dashboard: power level and rank, stats, the 7-day muscle heat map and recent workouts. Read-only: no new actions, no schema changes.

## Game Rules

Extend `lib/game.ts`:

- `RANKS` — ordered `{ name, min }`: Rookie 0, Iron 10, Bronze 30, Silver 60, Gold 100, Platinum 150, Diamond 250 (see Game Rules in `project-overview.md`)
- `rankFor(power)` → `{ name, min, nextMin: number | null }` (`null` for Diamond)
- `heatLevel(setCount)` → 0 for 0 sets, 1 for 1–3, 2 for 4–8, 3 for 9+

Extend `lib/game.test.ts`: 9 → Rookie, 10 → Iron, 249 → Platinum, 250 → Diamond with `nextMin` null; `heatLevel` at 0, 1, 3, 4, 8, 9.

## Query

Add `getDashboard(userId, now = new Date())` to `lib/queries.ts`:

```ts
{
  power: number;          // powerLevel of all progress rows
  unlocked: number;       // calibrated exercises
  workouts: { total: number; last7Days: number }; // sessions with ≥ 1 set; last7Days by startedAt ≥ now − 7 days
  timeTrainedMs: number;  // sessions with ≥ 1 set: ended + stale open; active excluded; end via sessionEndAt
  volumeKg: number;       // one $queryRaw: SUM("weightKg" * "reps") for the user (Prisma's aggregate can't multiply columns)
  heat: Partial<Record<MuscleHeadId, number>>; // sets from the last 7 days, +1 on every primary head of the set's exercise
  recent: { id: string; startedAt: Date; endedAt: Date; setCount: number; levelUps: number }[];
    // last 5 sessions with ≥ 1 set, newest first, active session excluded, endedAt resolved like timeTrainedMs
}
```

Use `sessionEndAt(endedAt, lastSet?.createdAt ?? startedAt, now)` and the session helpers from `lib/game.ts` for "active" and "end", so the numbers match the banner and the summary pages.

## Home Page

Rewrite `app/(app)/page.tsx` (Server Component, `requireUserId()` → `getDashboard`):

1. **Power card** (`bg-surface rounded-2xl`): label `Power level`, the number in `font-display text-4xl text-level`, the rank name, and a `Progress` bar from `min` to `nextMin` labelled `{power} / {nextMin}`. Diamond shows `Max rank`.
2. **Stats**, a 2 × 2 grid of tiles:
   - Workouts: `{total}` and `{last7Days} in the last 7 days`
   - Time trained: `formatDuration`
   - Volume: `formatVolume`
   - Unlocked: `{unlocked} / {EXERCISES.length}` exercises
3. **Muscles — last 7 days**: `MuscleMap` (both views) with `intensity` = `heatLevel` of each head's count (heads with 0 left out). With no sets in 7 days, show the idle map and `Log a set to light up your muscles.`
4. **Recent workouts**: up to 5 rows, each linking to `/workout/{id}`: `LocalTime` date, `formatDuration(end − start)`, `{n} sets`, and `LV ↑ {k}` when k > 0. Empty: `No workouts yet.` with a link to `/exercises`.

Build map intensity as `Partial<Record<MuscleHeadId, 1 | 2 | 3>>`: iterate catalog head IDs, call `heatLevel(count ?? 0)`, and assign only values greater than 0 after narrowing. Declare `heatLevel` as returning `0 | 1 | 2 | 3`; do not cast a numeric record into the prop type.

Extend `MuscleMap` with an optional `ariaLabel?: string` override, preserving its existing exercise-target label by default. Dashboard label describes activity, for example `Muscles trained in the last 7 days: upper chest, 4 sets; mid chest, 2 sets.` Empty label: `No muscles trained in the last 7 days.` Do not announce heat intensity as exercise targets.

The active-workout banner (spec 11) already sits above the content.

## Scope Limits

- no Generate workout button (spec 13)
- no charts, streaks or badges
- no new actions or schema changes

## Check When Done

- `npm test` passes
- a brand-new account sees zeros, `Rookie`, an idle map and the empty recent list, with no errors
- for a test account, the numbers match `npx prisma studio`: sessions with sets, total duration, SUM(weight × reps), and power = Σ(level − 1)
- the heat map lights primary heads trained in the last 7 days, brighter with more sets; its typed intensity excludes 0 and screen-reader label describes activity/counts, not targets
- recent rows open the matching summary page
- no horizontal scroll at 360 px; `npm run lint` and `npm run build` pass
- `progress-tracker.md` updated
