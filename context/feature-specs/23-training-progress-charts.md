# 23 — Exercise progress and weekly training sets

Make logged progress visible without changing how workouts are generated or sets are scored. Add an exercise trend and a four-week muscle-group view using existing `SetLog` data.

## Measures and queries

- Add read-only, user-scoped queries in `lib/queries.ts`. The exercise trend uses the most recent twelve sessions with a set for the selected exercise, ordered oldest to newest. Make one point per session: its highest logged `weightKg`, with the highest reps at that weight shown in the text detail. Label the measure `Top logged weight`, not a one-rep max or strength score.
- Weekly sets use four non-overlapping rolling seven-day windows ending at the current time, labelled `Last 7 days`, `8–14 days ago`, and so on. For each set, count one set for each distinct primary muscle group of its catalog exercise; never multiply by secondary muscles or by the number of heads in one group. Unknown historical exercise IDs are skipped rather than crashing.
- Include only saved sets owned by the current user. Bound the exercise trend query to twelve sessions and weekly queries to 28 days. Reuse the catalog's group names; do not store aggregate copies or add a schema migration.
- A point appears only after a set is saved. Undo removes it from the derived view after refresh. An active session with saved sets may appear as the newest point; clearly label it `In progress`.

## Progress page

- Add a `Progress` link from Home to `/progress`. The page offers an exercise selector containing exercises the user has logged, with a clear empty state and a link to Exercises when no sets exist.
- Show a small responsive line or dot chart for the selected exercise and a text list/table of the same dates, top weights, and reps. This keeps exact values available to keyboard and screen-reader users. Use native SVG and existing components; avoid a chart dependency for two simple views.
- Show weekly set counts by muscle group as labelled horizontal bars or a compact table. List zero-count groups only when needed to make an empty state clear. Keep units as kg and make the date/window definition visible.
- Loading, query error, and empty states must be explicit. Preserve the current Home dashboard's totals and seven-day muscle map rather than replacing them.

## Dependencies

- Reuse `SetLog`, `lib/catalog.ts`, current Prisma access, `formatKg`, and dashboard styles. No new package, migration, provider call, or environment variable.

## Scope Limits

- No estimated one-rep max, PR badge, medical recovery score, calendar program, cross-user leaderboard, or promise that volume alone measures training quality.

## Check When Done

- For a known fixture, the exercise points match the top weight and reps in each of twelve newest sessions; older sessions are excluded. An Undo changes the derived result correctly.
- Weekly counts use each set's distinct primary muscle groups once, exclude secondary groups, and place boundary timestamps in exactly one seven-day window. The four displayed totals match fixture data.
- New accounts see a useful empty state; another user's data never appears. Check keyboard and screen-reader access to exact values, no horizontal scroll at 360 px, `npm test`, `npm run lint`, and `npm run build`; update `context/progress-tracker.md` after implementation.
