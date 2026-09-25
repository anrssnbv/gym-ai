# Exercise weight limits

Part of [the QA fix plan](qa-fix-plan.md), updated 2026-09-25 after the user requested an individual limit for every exercise.

These are **app progression ceilings** for the existing gym catalog, implemented with the QA fixes. They are deliberately high-end values, not suggested working weights or universal human strength limits. The exact values below are product choices; no source establishes a single correct ceiling for every person or machine.

## Basis and units

The relative scale is informed by Strength Level's community benchmarks for [bench press](https://strengthlevel.com/strength-standards/bench-press/kg), [barbell curl](https://strengthlevel.com/strength-standards/barbell-curl/kg), and [sled leg press](https://strengthlevel.com/strength-standards/sled-leg-press/kg). Those are one-repetition-max comparisons, with different values by bodyweight and sex. They are not directly equivalent to this app's 12-rep progression targets; the proposed limits are not a mechanical conversion of those tables.

Use the following logging convention consistently in calibration, Adjust, history, and the limit label:

- **Barbell:** total bar plus plates; EZ-bar exercises use the same convention.
- **Dumbbell:** one dumbbell, including exercises performed with a pair. Do not double the stored weight or the ceiling.
- **Selectorized machine/cable:** the selected load shown on the equipment. For Cable Crossover, use the setting on one stack, with both sides set equally.
- **Plate-loaded machine:** total added plates across the working sides. Exclude bodyweight and unmarked sled/lever mass.

Machine numbers cannot be compared directly across models. For example, Life Fitness documents both [2:1](https://www.lifefitness.com/en-us/catalog/strength-training/storage-racks/life-fitness-dual-adjustable-puley-4-1) and [4:1](https://www.lifefitness.com/en-us/catalog/strength-training/cable-machines-functional-trainers/life-fitness-dual-adjustable-pulley) pulley designs. These machine/cable ceilings therefore govern the entered load, not an inferred force at the handle. No machine-ratio conversion is planned.

## Initial limits

All values are kilograms in the convention above. IDs match `lib/catalog.ts`; all 50 exercises have an explicit value.

| Group | Exercise ID | Maximum kg |
| --- | --- | ---: |
| Chest | `barbell-bench-press` | 200 |
| Chest | `incline-bench-press` | 160 |
| Chest | `incline-dumbbell-press` | 60 |
| Chest | `machine-chest-press` | 200 |
| Chest | `wide-chest-press` | 200 |
| Chest | `pec-deck` | 120 |
| Chest | `cable-crossover` | 50 |
| Back | `lat-pulldown` | 150 |
| Back | `seated-cable-row` | 150 |
| Back | `barbell-row` | 160 |
| Back | `one-arm-dumbbell-row` | 80 |
| Back | `straight-arm-pulldown` | 60 |
| Back | `dumbbell-shrug` | 80 |
| Back | `back-extension` | 120 |
| Shoulders | `overhead-press` | 120 |
| Shoulders | `dumbbell-shoulder-press` | 50 |
| Shoulders | `machine-shoulder-press` | 150 |
| Shoulders | `dumbbell-lateral-raise` | 25 |
| Shoulders | `cable-lateral-raise` | 25 |
| Shoulders | `reverse-pec-deck` | 80 |
| Shoulders | `face-pull` | 60 |
| Biceps | `barbell-curl` | 80 |
| Biceps | `incline-dumbbell-curl` | 30 |
| Biceps | `preacher-curl` | 80 |
| Biceps | `hammer-curl` | 40 |
| Biceps | `cable-curl` | 80 |
| Triceps | `cable-pushdown` | 100 |
| Triceps | `overhead-cable-extension` | 80 |
| Triceps | `ez-bar-skull-crusher` | 80 |
| Triceps | `close-grip-bench-press` | 180 |
| Triceps | `seated-dip-machine` | 200 |
| Quads | `barbell-back-squat` | 250 |
| Quads | `leg-press` | 600 |
| Quads | `hack-squat` | 300 |
| Quads | `leg-extension` | 150 |
| Quads | `bulgarian-split-squat` | 60 |
| Hamstrings | `romanian-deadlift` | 250 |
| Hamstrings | `dumbbell-romanian-deadlift` | 80 |
| Hamstrings | `lying-leg-curl` | 100 |
| Hamstrings | `seated-leg-curl` | 120 |
| Glutes | `barbell-hip-thrust` | 350 |
| Glutes | `dumbbell-walking-lunge` | 50 |
| Glutes | `cable-glute-kickback` | 60 |
| Glutes | `hip-abduction-machine` | 150 |
| Calves | `standing-calf-raise` | 250 |
| Calves | `seated-calf-raise` | 150 |
| Calves | `leg-press-calf-raise` | 400 |
| Abs | `cable-crunch` | 100 |
| Abs | `machine-crunch` | 120 |
| Abs | `cable-woodchopper` | 60 |

## Behavior at the limit

- Calibration and new Adjust values must stay within that exercise's limit. Show the limit and applicable units near the input.
- A next full step landing exactly at the limit is allowed.
- If 12 or more reps would take the next weight above the limit, save the performed set at its actual weight but leave weight and level unchanged. Show a limit message instead of the level-up reward.
- Below the limit, the user can choose a smaller step to fit. At the limit, they can keep logging sets without automatic progression. Do not suggest reducing the actual reported load just to gain levels.
- Preserve existing records. Before rollout, inspect current progress above the new limits. Existing weights remain visible and loggable; unchanged above-limit weights may be retained in step-only edits, but cannot be increased. Adjusting to a value within the new limit ends that exception. Never silently change historical weights or volume.

These numbers are required `maxWeightKg` catalog metadata, shared by calibration, Adjust, action validation, and progression.
