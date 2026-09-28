# Current issues — user testing, 2026-09-28

Environment: `https://gym-ai-seven-alpha.vercel.app` on an iPhone using 4G. These are user reports, not confirmed fixes. The screenshots show one generated workout and the exercise-round screen; no device timing trace or production generation record has been reviewed.

## ISSUE-01 — A 90-minute workout is much shorter than the selected duration

- **Steps:** Select **90 min** and **Full body** in Generate workout, then start the generated plan.
- **Observed:** The workout screenshot lists only Barbell Back Squat (3 sets), Barbell Bench Press (2), and Lat Pulldown (2). That is **7 visible planned sets**; the user recalled 8. The user estimates this workout would take about 30–40 minutes, far below the selected 90 minutes.
- **Expected:** The generated plan should reasonably match the selected session length. If training preferences, equipment, or safety limits prevent that, show an honest estimated duration and explain the constraint before Start.
- **Initial code finding:** The generator accepts as few as three exercises and validates only that its estimated time does not **exceed** the chosen duration. The 90-minute choice therefore acts as a ceiling, not a target. Confirm the saved profile and actual generation input before selecting a volume rule.
- **Status:** Open; reproduce and measure the plan estimate against the selected duration.

## ISSUE-02 — “Full body” coverage feels incomplete

- **Steps:** Generate a **Full body** workout with the 90-minute choice.
- **Observed:** The same plan has one squat, one chest press, and one back pull. The squat does cover legs, so the screenshot is not literally chest and back only. The user still finds three exercises too narrow for a full 90-minute full-body session.
- **Expected:** A full-body plan should cover the major areas in a balanced way for the available time and the user's training profile, or clearly describe a deliberately limited session.
- **Initial code finding:** Full-body validation allows push, pull, legs, and core exercises but does not require a balanced selection across them. Assess coverage together with ISSUE-01; avoid adding volume that conflicts with experience or equipment limits.
- **Status:** Open; define and verify the intended coverage rule.

## ISSUE-03 — Set progress is unclear on the exercise action button

- **Steps:** Open an exercise from a planned workout, complete sets, and look at the action below the round timer.
- **Observed:** Progress appears in the page header (`Workout · set 2 of 3`), but the action says only `Next round`. The user has to look away from the action to know how many planned sets remain. Screenshot 2 illustrates this button layout.
- **Expected:** Show progress at the main action or immediately beside it: `0/3` before the first set, `1/3` after one saved set, and so on. At `3/3`, show `Exercise done` and a clear route back to the workout, or return there automatically. Keep the count accurate after Undo and failed saves.
- **Status:** Open; choose the completed-state interaction and verify the full set/Undo flow.

## ISSUE-04 — Moving between Home, Exercises, and Workout feels slow

- **Steps:** On the deployed app over mobile 4G, tap the Home, Exercises, and Workout navigation items in sequence.
- **Observed:** The user reports a noticeable delay between tapping a menu item and seeing its page. No timings or network trace were supplied.
- **Expected:** Navigation should respond promptly and show immediate feedback while a page loads.
- **Cause to investigate:** It is not yet known whether the delay comes from mobile network latency, Vercel/server startup, authentication or database work, or client rendering. Capture tap-to-feedback and tap-to-content timings, network requests, and server traces before assigning the cause or changing code.
- **Status:** Open; reproduce and measure on the deployed site and a comparable local build.
