Add the static exercise catalog and the browse screens: muscle groups grid → exercises of a group → exercise page header. The catalog lives in code. No levels, no muscle map (spec 04), no database.

## Catalog Data

Create `lib/catalog.ts`. It must have no runtime imports (Node runs its test directly).

Export:

- `MUSCLE_GROUPS` — ordered `as const` list of `{ id, name, heads }` (tables below)
- `MuscleGroupId` and `MuscleHeadId` — derived from `MUSCLE_GROUPS`
- `MUSCLE_HEADS: Record<MuscleHeadId, { name: string; anatomy: string }>`
- `Equipment` = `'barbell' | 'dumbbell' | 'machine' | 'cable'`
- `Pattern` = `'push' | 'pull' | 'legs' | 'core'` (used by the AI generator in spec 14)
- `EXERCISES` — ordered `as const` list checked with `satisfies`, each `{ id, name, groupId, equipment, pattern, compound, maxWeightKg, primary, secondary }`
- `Exercise` = `(typeof EXERCISES)[number]` and `ExerciseId` = `Exercise['id']`
- `DEFAULT_STEP_KG: Record<Equipment, number>` — barbell 2.5, dumbbell 2, machine 5, cable 2.5
- `getGroup(id)`, `getExercise(id)`, `getExercisesByGroup(groupId)` — take a plain `string` and return `undefined` for unknown IDs

Exercise IDs are permanent: later specs store them in the database.

### Exercise Weight Limits

Every exercise requires its own finite `maxWeightKg`, at least the shared 0.5 kg minimum. Use all 50 values in [exercise-weight-limits.md](../exercise-weight-limits.md), including 200 kg for Barbell Bench Press, 80 kg for Barbell Curl, 30 kg per dumbbell for Incline Dumbbell Curl, and 600 kg for Leg Press. These are app progression ceilings, not recommended working weights or universal strength limits.

The entered weight and the ceiling use the same convention: barbell = bar plus plates; dumbbell = one dumbbell, even when using a pair; machine/cable stack = the selected load; Cable Crossover = one stack with both sides equal; plate-loaded machine = total added plates across the working sides, excluding bodyweight and unmarked sled/lever mass. Do not convert pulley ratios or double dumbbell weights.

Calibration, Adjust validation, and progression all read this catalog field. Keep existing progress and history unchanged when introducing these ceilings; specs 05, 06, and 09 define how existing above-limit weights remain usable.

### Muscle Groups and Heads

| Group (id / name)         | Head id           | Name                  | Anatomy                                   |
| ------------------------- | ----------------- | --------------------- | ----------------------------------------- |
| `chest` / Chest           | `chest-upper`     | Upper chest           | Clavicular head of pectoralis major        |
|                           | `chest-middle`    | Mid chest             | Sternal head of pectoralis major           |
|                           | `chest-lower`     | Lower chest           | Costal (lower) fibers of pectoralis major  |
| `back` / Back             | `back-lats`       | Lats                  | Latissimus dorsi                           |
|                           | `back-mid`        | Mid back              | Rhomboids and middle trapezius             |
|                           | `back-traps`      | Upper traps           | Upper trapezius                            |
|                           | `back-lower`      | Lower back            | Erector spinae                             |
| `shoulders` / Shoulders   | `delts-front`     | Front delt            | Anterior deltoid                           |
|                           | `delts-side`      | Side delt             | Lateral deltoid                            |
|                           | `delts-rear`      | Rear delt             | Posterior deltoid                          |
| `biceps` / Biceps         | `biceps-long`     | Biceps long head      | Outer head of biceps brachii               |
|                           | `biceps-short`    | Biceps short head     | Inner head of biceps brachii               |
|                           | `brachialis`      | Brachialis            | Elbow flexor under the biceps              |
| `triceps` / Triceps       | `triceps-long`    | Triceps long head     | Inner/back head, crosses the shoulder      |
|                           | `triceps-lateral` | Triceps lateral head  | Outer head (the "horseshoe")               |
|                           | `triceps-medial`  | Triceps medial head   | Deep head near the elbow                   |
| `quads` / Quads           | `quads-rectus`    | Rectus femoris        | Middle of the thigh, crosses the hip       |
|                           | `quads-lateral`   | Outer quad            | Vastus lateralis                           |
|                           | `quads-medial`    | Teardrop              | Vastus medialis                            |
| `hamstrings` / Hamstrings | `hams-outer`      | Outer hamstring       | Biceps femoris                             |
|                           | `hams-inner`      | Inner hamstring       | Semitendinosus and semimembranosus         |
| `glutes` / Glutes         | `glutes-max`      | Glute max             | Gluteus maximus                            |
|                           | `glutes-med`      | Glute med             | Gluteus medius                             |
| `calves` / Calves         | `calves-gastroc`  | Gastrocnemius         | Upper calf, two heads                      |
|                           | `calves-soleus`   | Soleus                | Deep lower calf                            |
| `abs` / Abs               | `abs-rectus`      | Abs                   | Rectus abdominis                           |
|                           | `abs-obliques`    | Obliques              | External obliques                          |

The biceps has two heads; brachialis is listed with it because curls train it and it is what hammer curls target.

### Exercises

`C` = compound (`compound: true`), `I` = isolation.

**Chest** — pattern `push`

| id                       | Name                          | Equipment | C/I | Primary                    | Secondary                                  |
| ------------------------ | ----------------------------- | --------- | --- | -------------------------- | ------------------------------------------ |
| `barbell-bench-press`    | Barbell Bench Press           | barbell   | C   | chest-middle               | chest-upper, delts-front, triceps-lateral  |
| `incline-bench-press`    | Incline Barbell Bench Press   | barbell   | C   | chest-upper                | chest-middle, delts-front, triceps-lateral |
| `incline-dumbbell-press` | Incline Dumbbell Press        | dumbbell  | C   | chest-upper                | chest-middle, delts-front                  |
| `machine-chest-press`    | Chest Press                   | machine   | C   | chest-middle               | chest-lower, delts-front, triceps-lateral  |
| `wide-chest-press`       | Wide Chest Press              | machine   | C   | chest-middle, chest-lower  | delts-front                                |
| `pec-deck`               | Pec Deck Fly                  | machine   | I   | chest-middle               | chest-upper, chest-lower                   |
| `cable-crossover`        | Cable Crossover (High to Low) | cable     | I   | chest-lower                | chest-middle                               |

**Back** — pattern `pull`

| id                      | Name                  | Equipment | C/I | Primary              | Secondary                        |
| ----------------------- | --------------------- | --------- | --- | -------------------- | -------------------------------- |
| `lat-pulldown`          | Lat Pulldown          | cable     | C   | back-lats            | back-mid, biceps-short           |
| `seated-cable-row`      | Seated Cable Row      | cable     | C   | back-mid             | back-lats, delts-rear, biceps-long |
| `barbell-row`           | Barbell Row           | barbell   | C   | back-mid, back-lats  | delts-rear, back-lower           |
| `one-arm-dumbbell-row`  | One-Arm Dumbbell Row  | dumbbell  | C   | back-lats            | back-mid, delts-rear             |
| `straight-arm-pulldown` | Straight-Arm Pulldown | cable     | I   | back-lats            | triceps-long                     |
| `dumbbell-shrug`        | Dumbbell Shrug        | dumbbell  | I   | back-traps           | —                                |
| `back-extension`        | Back Extension        | machine   | I   | back-lower           | glutes-max, hams-inner           |

**Shoulders** — pattern `push`, except the two rear-delt exercises which are `pull`

| id                        | Name                           | Equipment | C/I | Pattern | Primary     | Secondary                     |
| ------------------------- | ------------------------------ | --------- | --- | ------- | ----------- | ----------------------------- |
| `overhead-press`          | Barbell Overhead Press         | barbell   | C   | push    | delts-front | delts-side, triceps-lateral   |
| `dumbbell-shoulder-press` | Seated Dumbbell Shoulder Press | dumbbell  | C   | push    | delts-front | delts-side, triceps-lateral   |
| `machine-shoulder-press`  | Shoulder Press                 | machine   | C   | push    | delts-front | delts-side, triceps-medial    |
| `dumbbell-lateral-raise`  | Dumbbell Lateral Raise         | dumbbell  | I   | push    | delts-side  | back-traps                    |
| `cable-lateral-raise`     | Cable Lateral Raise            | cable     | I   | push    | delts-side  | —                             |
| `reverse-pec-deck`        | Reverse Pec Deck               | machine   | I   | pull    | delts-rear  | back-mid                      |
| `face-pull`               | Face Pull                      | cable     | I   | pull    | delts-rear  | back-mid, back-traps          |

**Biceps** — pattern `pull`

| id                      | Name                  | Equipment | C/I | Primary                    | Secondary    |
| ----------------------- | --------------------- | --------- | --- | -------------------------- | ------------ |
| `barbell-curl`          | Barbell Curl          | barbell   | I   | biceps-long, biceps-short  | brachialis   |
| `incline-dumbbell-curl` | Incline Dumbbell Curl | dumbbell  | I   | biceps-long                | biceps-short |
| `preacher-curl`         | Preacher Curl         | machine   | I   | biceps-short               | brachialis   |
| `hammer-curl`           | Hammer Curl           | dumbbell  | I   | brachialis                 | biceps-long  |
| `cable-curl`            | Cable Curl            | cable     | I   | biceps-short, biceps-long  | brachialis   |

**Triceps** — pattern `push`

| id                         | Name                     | Equipment | C/I | Primary                         | Secondary                     |
| -------------------------- | ------------------------ | --------- | --- | ------------------------------- | ----------------------------- |
| `cable-pushdown`           | Cable Pushdown           | cable     | I   | triceps-lateral, triceps-medial | —                             |
| `overhead-cable-extension` | Overhead Cable Extension | cable     | I   | triceps-long                    | triceps-medial                |
| `ez-bar-skull-crusher`     | EZ-Bar Skull Crusher     | barbell   | I   | triceps-long, triceps-medial    | triceps-lateral               |
| `close-grip-bench-press`   | Close-Grip Bench Press   | barbell   | C   | triceps-lateral, triceps-medial | chest-middle, delts-front     |
| `seated-dip-machine`       | Seated Dip               | machine   | C   | triceps-lateral, triceps-medial | triceps-long, chest-lower     |

**Quads** — pattern `legs`

| id                      | Name                           | Equipment | C/I | Primary                     | Secondary                              |
| ----------------------- | ------------------------------ | --------- | --- | --------------------------- | -------------------------------------- |
| `barbell-back-squat`    | Barbell Back Squat             | barbell   | C   | quads-lateral, quads-medial | quads-rectus, glutes-max, back-lower   |
| `leg-press`             | Leg Press                      | machine   | C   | quads-lateral, quads-medial | glutes-max                             |
| `hack-squat`            | Hack Squat                     | machine   | C   | quads-lateral, quads-medial | quads-rectus, glutes-max               |
| `leg-extension`         | Leg Extension                  | machine   | I   | quads-rectus                | quads-lateral, quads-medial            |
| `bulgarian-split-squat` | Dumbbell Bulgarian Split Squat | dumbbell  | C   | quads-medial, glutes-max    | quads-lateral, glutes-med              |

**Hamstrings** — pattern `legs`

| id                           | Name                       | Equipment | C/I | Primary                | Secondary                |
| ---------------------------- | -------------------------- | --------- | --- | ---------------------- | ------------------------ |
| `romanian-deadlift`          | Romanian Deadlift          | barbell   | C   | hams-outer, hams-inner | glutes-max, back-lower   |
| `dumbbell-romanian-deadlift` | Dumbbell Romanian Deadlift | dumbbell  | C   | hams-outer, hams-inner | glutes-max               |
| `lying-leg-curl`             | Lying Leg Curl             | machine   | I   | hams-outer             | hams-inner, calves-gastroc |
| `seated-leg-curl`            | Seated Leg Curl            | machine   | I   | hams-inner             | hams-outer               |

**Glutes** — pattern `legs`

| id                       | Name                   | Equipment | C/I | Primary    | Secondary                               |
| ------------------------ | ---------------------- | --------- | --- | ---------- | --------------------------------------- |
| `barbell-hip-thrust`     | Barbell Hip Thrust     | barbell   | C   | glutes-max | hams-outer, glutes-med                  |
| `dumbbell-walking-lunge` | Dumbbell Walking Lunge | dumbbell  | C   | glutes-max | quads-lateral, quads-medial, hams-inner |
| `cable-glute-kickback`   | Cable Glute Kickback   | cable     | I   | glutes-max | glutes-med, hams-outer                  |
| `hip-abduction-machine`  | Hip Abduction          | machine   | I   | glutes-med | —                                       |

**Calves** — pattern `legs`

| id                     | Name                 | Equipment | C/I | Primary        | Secondary      |
| ---------------------- | -------------------- | --------- | --- | -------------- | -------------- |
| `standing-calf-raise`  | Standing Calf Raise  | machine   | I   | calves-gastroc | calves-soleus  |
| `seated-calf-raise`    | Seated Calf Raise    | machine   | I   | calves-soleus  | calves-gastroc |
| `leg-press-calf-raise` | Leg Press Calf Raise | machine   | I   | calves-gastroc | calves-soleus  |

**Abs** — pattern `core`

| id                  | Name              | Equipment | C/I | Primary      | Secondary    |
| ------------------- | ----------------- | --------- | --- | ------------ | ------------ |
| `cable-crunch`      | Cable Crunch      | cable     | I   | abs-rectus   | abs-obliques |
| `machine-crunch`    | Ab Crunch Machine | machine   | I   | abs-rectus   | —            |
| `cable-woodchopper` | Cable Woodchopper | cable     | I   | abs-obliques | abs-rectus   |

## Catalog Test

Create `lib/catalog.test.ts` with `node:test` and `node:assert`, importing `./catalog.ts`:

- exercise IDs are unique
- all 50 exercises have finite individual limits at or above the shared minimum; check the representative values above
- every exercise has at least one primary head, and no head is both primary and secondary in the same exercise
- every head in `MUSCLE_GROUPS` is primary in at least one exercise
- every group has at least 3 exercises
- `getExercise('nope')` returns `undefined`

Add `"test": "node --test lib/*.test.ts"` to `package.json` scripts, and `"allowImportingTsExtensions": true` to `tsconfig.json` (valid because `noEmit` is already true) so the `.ts` import type-checks.

## Screens

### `/exercises` — Muscle Groups

Replace the placeholder in `app/(app)/exercises/page.tsx`:

- title `Exercises`
- 2-column grid of the 10 groups in catalog order
- each card (`bg-surface rounded-2xl`, whole card is a link to `/exercises/[groupId]`): group name, `{n} exercises`, and the head names joined with ` · ` in muted text

### `/exercises/[groupId]` — Group

Create `app/(app)/exercises/[groupId]/page.tsx`:

- unknown `groupId` → `notFound()`
- back link (`ChevronLeft`) to `/exercises`, title = group name
- one card per exercise in catalog order, linking to `/exercises/[groupId]/[exerciseId]`:
  - name
  - equipment Badge and `Compound` / `Isolation` in muted text
  - primary head chips (`bg-brand-dim text-brand`) and secondary head chips (`bg-subtle text-copy-muted`), using the head names

### `/exercises/[groupId]/[exerciseId]` — Exercise

Create `app/(app)/exercises/[groupId]/[exerciseId]/page.tsx`:

- unknown `exerciseId`, or an exercise whose `groupId` differs from the URL → `notFound()`
- back link to the group, title = exercise name, equipment Badge, `Compound` / `Isolation`
- **Targets** section: primary heads (name in `text-copy`, anatomy in muted text below) and an **Also works** list with the secondary heads
- leave room below for the level card (spec 05); no placeholder text

## Scope Limits

- no muscle map, no levels, no search or filters
- no database; don't store the catalog anywhere else
- no exercise images or videos

## Check When Done

- 10 groups and 50 exercises render with the names and heads from the tables above
- every exercise has its documented `maxWeightKg`; dumbbell limits represent one dumbbell
- `/exercises/chest/pec-deck` works; `/exercises/back/pec-deck` and `/exercises/nope` return 404
- `npm test` passes
- no horizontal scroll at 360 px; cards are fully tappable
- `npm run lint` and `npm run build` pass
- `progress-tracker.md` updated
