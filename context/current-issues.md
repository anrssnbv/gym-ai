# Current issues — user testing, 2026-09-28

Environment: `https://gym-ai-seven-alpha.vercel.app` on an iPhone using 4G. These are user reports, not confirmed fixes. The screenshots show one generated workout and the exercise-round screen; no device timing trace or production generation record has been reviewed.

## ISSUE-01 — A 90-minute workout is much shorter than the selected duration

- **Steps:** Select **90 min** and **Full body** in Generate workout, then start the generated plan.
- **Observed:** The workout screenshot lists only Barbell Back Squat (3 sets), Barbell Bench Press (2), and Lat Pulldown (2). That is **7 visible planned sets**; the user recalled 8. The user estimates this workout would take about 30–40 minutes, far below the selected 90 minutes.
- **Expected:** The generated plan should reasonably match the selected session length. If training preferences, equipment, or safety limits prevent that, show an honest estimated duration and explain the constraint before Start.
- **Initial code finding:** The generator accepts as few as three exercises and validates only that its estimated time does not **exceed** the chosen duration. The 90-minute choice therefore acts as a ceiling, not a target. Confirm the saved profile and actual generation input before selecting a volume rule.
- **Status:** Code addressed in PR #27 (2026-09-28) using the subsequently confirmed policy in `workout-generator-prompt.md`. Generated choices are 60/90/120 minutes; work plus rest costs 5–7 minutes per set. Full body has 8–10 exercises and 1–2 sets each, with 9–12 total sets at 60 minutes and targets of 15/20 for longer sessions. Calibration/beginner count caps were removed. Live 60-minute full body produced 9 exercises/10 sets/58 minutes; 90-minute push and 120-minute pull produced 15 sets/87 and 81 minutes. Full-body 90/120 runtime samples and physical-phone timing were not repeated in this three-case test.

## ISSUE-02 — “Full body” coverage feels incomplete

- **Steps:** Generate a **Full body** workout with the 90-minute choice.
- **Observed:** The same plan has one squat, one chest press, and one back pull. The squat does cover legs, so the screenshot is not literally chest and back only. The user still finds three exercises too narrow for a full 90-minute full-body session.
- **Expected:** A full-body plan should cover the major areas in a balanced way for the available time and the user's training profile, or clearly describe a deliberately limited session.
- **Initial code finding:** Full-body validation allows push, pull, legs, and core exercises but does not require a balanced selection across them. Assess coverage together with ISSUE-01; avoid adding volume that conflicts with experience or equipment limits.
- **Status:** Code addressed in PR #27 (2026-09-28). Shared generation/Start checks require focus-specific primary muscle coverage, including upper back and both quad/hamstring work for full body; secondary arm coverage is allowed only when direct candidates are unavailable. Full body permits at most two exercises per catalog group. The final live full-body sample covers chest, back, shoulders, biceps, triceps, quads, hamstrings and calves. Regression checks reject incomplete coverage and shoulder-heavy plans. Exact outputs and refinement history are in `workout-generator-live-review.md`.

## ISSUE-03 — Set progress is unclear on the exercise action button

- **Steps:** Open an exercise from a planned workout, complete sets, and look at the action below the round timer.
- **Observed:** Progress appears in the page header (`Workout · set 2 of 3`), but the action says only `Next round`. The user has to look away from the action to know how many planned sets remain. Screenshot 2 illustrates this button layout.
- **Expected:** Show progress at the main action or immediately beside it: `0/3` before the first set, `1/3` after one saved set, and so on. At `3/3`, show `Exercise done` and a clear route back to the workout, or return there automatically. Keep the count accurate after Undo and failed saves.
- **Status:** Code addressed: planned exercises show saved-set progress on the round action and `Exercise done` at the target, which returns to Workout. The count reconciles a locally acknowledged save with refreshed server sets. Database integration checks pass; an authenticated browser check of the button, failed save, and Undo remains.

## ISSUE-04 — Moving between Home, Exercises, and Workout feels slow

- **Steps:** On the deployed app over mobile 4G, tap the Home, Exercises, and Workout navigation items in sequence.
- **Observed:** The user reports a noticeable delay between tapping a menu item and seeing its page. No timings or network trace were supplied.
- **Expected:** Navigation should respond promptly and show immediate feedback while a page loads.
- **Cause to investigate:** It is not yet known whether the delay comes from mobile network latency, Vercel/server startup, authentication or database work, or client rendering. Capture tap-to-feedback and tap-to-content timings, network requests, and server traces before assigning the cause or changing code.
- **Status:** Code addressed for responsiveness: tabs now show immediate pending feedback, and the shared layout runs its independent profile/session reads concurrently. Next.js documentation confirms these dynamic pages may wait for a server response before navigation. No authenticated phone timing trace is available yet, so the contribution of 4G, Vercel, and database latency remains unproven; measure after deployment before claiming a speed gain.
