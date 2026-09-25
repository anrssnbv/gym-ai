# Gym AI

## Overview

Gym AI is a mobile-first web app (installable as a PWA) that turns gym training into a game. Every exercise has levels. A level is a working weight, cleared by doing 12 reps in one set when the next weight fits the exercise ceiling. Clearing a level raises the weight by a fixed step. An AI coach builds the day's workout from training preferences, available equipment, requested time/focus, and recent training. It is for people who train on their own and want clear, motivating progression instead of guessing weights.

## Goals

1. A signed-in user can browse exercises by muscle group and see which muscle heads each exercise targets.
2. Every exercise has a level system: calibrate once, then clear levels by hitting 12 reps.
3. Logging a set at the gym on a phone takes one sheet: type the reps, save.
4. A dashboard shows progress: power level, workouts, time trained, muscles hit.
5. The AI generates a workout plan from training preferences, duration, focus and recent history.

## Core User Flow

1. User signs in. Without a saved training profile, they complete the four-step survey and then reach Home; returning users go straight into the app.
2. User opens Exercises, picks a muscle group (e.g. Chest), then an exercise (e.g. Barbell Bench Press), and sees the targeted heads on a body map.
3. First visit to an exercise: the user calibrates by entering a weight they can lift for 12 clean reps and the weight step (prefilled from the equipment). This unlocks Level 1.
4. User taps **Start round**. A round timer starts: 2 min for compound exercises, 1 min for isolation. They do one set and log the reps (at any moment of the round).
5. 12 or more reps: "Level cleared!", level + 1, weight + step when the next weight fits the exercise ceiling. Above that ceiling, the set is saved without a level-up. Fewer reps: the best at this level are shown (e.g. 9 / 12) and the level stays.
6. The first logged set opens a workout session automatically. **Finish workout** closes it. A session with no new sets for 3 hours counts as ended at its last set.
7. On the dashboard the user taps **Generate workout**, picks a duration and a focus, and the AI returns a list of catalog exercises with sets, taking recent training into account.
8. User starts the generated workout and plays it exercise by exercise with the same round flow.

## Game Rules

- Target reps: **12** for every exercise (one constant).
- Level = a working weight. Level 1 is the calibrated weight. The first round is usually an easy win, which is intended.
- A round = one set at the current level weight.
- 12+ reps in a round: level + 1 and weight + step immediately if the next weight is within the exercise's catalog ceiling. Otherwise save the set at the current level and explain the limit.
- A failed round never lowers the level.
- **Undo** targets the displayed latest set by ID. A newer set makes it stale; retrying an already-deleted target never removes another set. If the target was a level-up, the level and weight are restored.
- **Adjust** changes the current weight or step (different machine, coming back after a break). It never changes the level number.
- Round length: 120 s for compound exercises, 60 s for isolation exercises. The timer starts on tap. Reps can be logged at any time during or after the round.
- Dumbbell weights are per dumbbell.
- **Power level** = levels cleared = the sum of (level − 1) over all calibrated exercises. **Group power** = the same sum within one muscle group.
- **Rank** comes from power level: Rookie 0–9, Iron 10–29, Bronze 30–59, Silver 60–99, Gold 100–149, Platinum 150–249, Diamond 250+.
- **Volume** = sum of weight × reps over all sets (a dumbbell weight counts once).
- Units: kilograms only.

## Features

### Exercise Catalog

- 10 muscle groups: Chest, Back, Shoulders, Biceps, Triceps, Quads, Hamstrings, Glutes, Calves, Abs.
- Each group is split into heads or regions: chest upper / mid / lower, delts front / side / rear, triceps long / lateral / medial, biceps long / short + brachialis, and so on (27 in total).
- 50 loadable exercises (barbell, dumbbell, machine, cable), each with primary and secondary heads and a movement pattern (push, pull, legs, core).
- The catalog is static data in code (`lib/catalog.ts`), not in the database.

### Muscle Map

- Stylized front/back body SVG with one region per head.
- Highlights primary heads strongly and secondary heads softly, and can zoom to one muscle group.
- On the dashboard the same map shows a heat map of muscles trained in the last 7 days.

### Exercise Levels

- Calibration, level card (level, weight, step, best reps at this level), round timer, rep logging, level-up celebration, undo, adjust, set history.

### Workout Sessions

- Auto-start on the first logged set, manual finish, treated as ended 3 hours after the last set.
- Sessions drive the stats and give the AI its recent-training context.

### Dashboard

- Power level and rank, workouts (total and last 7 days), time trained, total volume, 7-day muscle heat map, recent workouts, active-workout banner, Generate workout button.

### AI Workout Generator

- Inputs: duration (30 / 45 / 60 / 90 min) and focus (Auto, Push, Pull, Legs, Upper, Full body). "Lower" is the same as Legs, so it is one option.
- Duration starts from saved preferences; an explicit choice overrides it. Auto selects Full body for 1–3 planned days, otherwise push/pull/legs by oldest training. Explicit focus always wins.
- Context sent to the AI: five training-preference fields, eligible equipment, recent sessions, days since each muscle group was trained, current levels. No identity or medical fields.
- New/beginner users receive at most four exercises and three sets each, within the requested duration. Equipment filters apply before spending an AI attempt; insufficient candidates produce a preferences/focus error.
- Start checks current equipment and experience against the preview. Editing preferences does not rewrite active or historical workouts.
- Output: catalog exercises with a number of sets and a short note each. The AI never sets weights, reps or levels; those come from the level system.

## Scope

### In Scope

- Clerk sign-in and route protection
- Required first-entry training survey and editable training preferences
- Static exercise catalog and muscle map
- Per-exercise levels: calibrate, rounds, logging, level-up, undo, adjust, history
- Workout sessions with automatic start and end
- Dashboard stats, power level, ranks, heat map
- AI workout generation and playing a generated workout
- Installable PWA (manifest, icons, standalone display)

### Out of Scope

- Native iOS/Android apps (the PWA covers mobile)
- Offline set logging and background sync
- Bodyweight and assisted exercises (pull-ups, dips, push-ups): they don't fit weight-based levels
- Heavy low-rep lifts that don't suit a 12-rep target (conventional deadlift)
- Custom user-created exercises
- Pounds (lb)
- Per-exercise rep ranges (the target is always 12)
- Streaks, badges, achievements (backlog)
- Social features, leaderboards
- Push notifications
- Payments

## Success Criteria

### Training preferences — implemented in spec 16

After first authenticated entry, users complete a four-step training survey: primary goal, gym experience, days per week and minutes per session, and available catalog equipment. Weekly hours are derived exactly from days × minutes. Existing users without a profile complete it once after rollout; preferences can later be edited at `/settings/training`. Drafts are local component state and are lost on reload. The app does not collect medical details or body measurements for this feature.

The saved session length becomes the Generate default, equipment restricts suggestions, and goal/experience inform selection, cues, and volume. New/beginner profiles allow at most four exercises and three sets per exercise; existing duration limits still apply. Auto uses Full body for 1–3 planned days and existing recency-based push/pull/legs for 4–7 days; explicit choices take precedence. These are product defaults for the existing resistance-training app, not a weekly schedule or a change to its 12-rep game. Active and historical workouts are preserved. Exact contracts and verification live in `feature-specs/16-training-profile-onboarding.md`.

### Current application

1. A signed-in user can calibrate an exercise, log a 12-rep round, and see the new level and weight. Undo restores the previous level and weight.
2. Levels, sets and sessions persist and show up on another device with the same account.
3. Dashboard numbers match the logged data.
4. The muscle map highlights the correct heads for every catalog exercise.
5. Generate workout returns a valid plan using eligible catalog exercises and profile volume limits. Auto follows the weekly schedule and recent training; an explicit duration/focus choice takes precedence.
6. The app can be installed to a phone home screen and used one-handed at 360 px width.
