# Gym AI

## Overview

Gym AI is a mobile-first web app (installable as a PWA) that turns gym training into a game. Every exercise has levels. A level is a working weight, and you clear it by doing 12 reps in one set. Clearing a level raises the weight by a fixed step. An AI coach builds the day's workout from the time you have, the split you want, and what you trained recently. It is for people who train on their own and want clear, motivating progression instead of guessing weights.

## Goals

1. A signed-in user can browse exercises by muscle group and see which muscle heads each exercise targets.
2. Every exercise has a level system: calibrate once, then clear levels by hitting 12 reps.
3. Logging a set at the gym on a phone takes one sheet: type the reps, save.
4. A dashboard shows progress: power level, workouts, time trained, muscles hit.
5. The AI generates a workout plan from duration, focus and recent history.

## Core User Flow

1. User signs in and lands on the dashboard (Home).
2. User opens Exercises, picks a muscle group (e.g. Chest), then an exercise (e.g. Barbell Bench Press), and sees the targeted heads on a body map.
3. First visit to an exercise: the user calibrates by entering a weight they can lift for 12 clean reps and the weight step (prefilled from the equipment). This unlocks Level 1.
4. User taps **Start round**. A round timer starts: 2 min for compound exercises, 1 min for isolation. They do one set and log the reps (at any moment of the round).
5. 12 or more reps: "Level cleared!", level + 1, weight + step. Fewer: the best reps at this level are shown (e.g. 9 / 12) and the level stays.
6. The first logged set opens a workout session automatically. **Finish workout** closes it. A session with no new sets for 3 hours counts as ended at its last set.
7. On the dashboard the user taps **Generate workout**, picks a duration and a focus, and the AI returns a list of catalog exercises with sets, taking recent training into account.
8. User starts the generated workout and plays it exercise by exercise with the same round flow.

## Game Rules

- Target reps: **12** for every exercise (one constant).
- Level = a working weight. Level 1 is the calibrated weight. The first round is usually an easy win, which is intended.
- A round = one set at the current level weight.
- 12+ reps in a round: level + 1 and weight + step immediately. The next round uses the new weight.
- A failed round never lowers the level.
- **Undo** removes the most recent set of an exercise. If that set was a level-up, the level and weight go back to what they were before it. This is the fix for a mistyped rep count.
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
- Auto is decided in code before the AI is called: push, pull or legs, whichever was trained longest ago.
- Context sent to the AI: a summary of recent sessions, days since each muscle group was trained, current levels. No names or emails.
- Output: catalog exercises with a number of sets and a short note each. The AI never sets weights, reps or levels; those come from the level system.

## Scope

### In Scope

- Clerk sign-in and route protection
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

1. A signed-in user can calibrate an exercise, log a 12-rep round, and see the new level and weight. Undo restores the previous level and weight.
2. Levels, sets and sessions persist and show up on another device with the same account.
3. Dashboard numbers match the logged data.
4. The muscle map highlights the correct heads for every catalog exercise.
5. Generate workout returns a valid plan (catalog exercises only) in under ~20 s. With Auto, the focus is the push/pull/legs pattern trained longest ago.
6. The app can be installed to a phone home screen and used one-handed at 360 px width.
