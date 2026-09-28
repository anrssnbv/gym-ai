# Workout planning calibration review — 2026-09-28

The target proposal below is superseded by `workout-generator-prompt.md`, which records the user's subsequent 60/90/120-minute and 5–7-minute set-and-rest requirements. The historical code findings below remain useful; its earlier target numbers are no longer the current proposal.

## Goal and scope

Review why a 90-minute full-body request can produce only three exercises, and propose a consistent policy for the user's target: 7–8 exercises, 1–2 sets per exercise, and 10–14 total sets. This is a product and code review; the proposed behavior is not implemented. These numbers express the requested app behavior, not a universal training prescription.

## Confirmed mechanisms

| Current rule | Effect |
| --- | --- |
| `planOutputSchema` accepts 3 exercises at every duration | There is no minimum size for a long session. |
| `profilePlanLimits` caps new/beginner profiles at 4 exercises and 3 sets each | A 7–8 exercise plan is impossible for these profiles. Regular/experienced profiles permit 8 exercises and 5 sets each at 90 minutes. |
| With 0, 1, or 2 eligible calibrated exercises, the new-exercise cap permits exactly 3 exercises in total | Longer requests cannot expand the plan. With 3–5 calibrated candidates, the maximum is 4–6 exercises. At least 6 are needed to permit 7 exercises. Coverage may still be blocked if calibration is concentrated in one area. |
| Calibration rules override coverage | A valid selection can omit an entire movement pattern. Both the static prompt and appended request instructions reinforce the cap. |
| Server validation rejects excess time, but not insufficient volume or missing coverage | Three push exercises can pass as `full_body`. Compound ordering is also only a prompt instruction. |
| The estimator uses 2 minutes per compound set, 1 per isolation set, and 1 per exercise change | Even 14 compound sets across 8 exercises estimate only 35 minutes. Maximizing this estimate conflicts with limiting a session to 10–14 sets. |

The actual production profile, candidate calibration state, and model response were not inspected. These are confirmed mechanisms and synthetic reproductions, not proof of which one caused the specific production result.

## Local evidence

Using the actual planning helpers and output schema:

- Three compound exercises with 3/3/2 sets pass generation's structural, selection, and time checks for a regular profile at 90 minutes. The estimator returns 18 minutes.
- Three chest presses with 2 sets each also pass those checks as `full_body`; the estimator returns 14 minutes.
- The eight-exercise, twelve-set example below passes with all exercises calibrated, but fails the new-exercise cap with no calibration. Its estimate is 28 minutes.
- All 14 existing `lib/plan.test.ts` tests pass. They explicitly preserve the restrictive calibration and beginner policies; a passing suite does not prove the requested new behavior.

## Recommended product policy

1. For `full_body` at 90 minutes, specify 7–8 exercises, 1–2 sets each, and 10–14 total sets when equipment and candidate availability permit. Use 8 exercises and 12 sets as the ordinary target. Keep shorter durations and other focuses outside this first change until their targets are defined.
2. Prefer calibrated exercises among choices that meet coverage. Allow uncalibrated candidates as needed to complete the target, using the existing calibration flow. Remove the old cap for this policy; keeping it makes the requested result impossible for many users. Being new to the app and being new to training are different inputs.
3. Replace the four-exercise beginner ceiling for this policy if the target applies to all experiences. Use clear cues and the lower end of the total-set range for less experienced profiles. This is a proposed product decision; the current code has not adopted it.
4. Define coverage explicitly: quads, hamstrings/glutes, chest, back, and shoulders, then use remaining slots for complementary back work, core, calves, or arms according to history. Use the catalog's existing primary/secondary muscles to account for compound contributions, so every small group need not receive a separate isolation exercise. Prefer direct coverage for the major areas. Avoid spending multiple slots on similar exercises before covering missing areas.
5. Make recency a preference within that structure. A recent chest session can influence exercise choice and set distribution without removing all pressing from full body.
6. Treat 90 minutes as available time. Stop at the planned volume instead of adding sets to consume the timer budget. Keep the existing estimate explicitly labeled as timed rounds and exercise changes. A real elapsed-session estimate needs separate assumptions or measurements for setup, rest, warm-up, and calibration; do not silently inflate round timers or label this example a measured 90-minute workout.
7. Detect insufficient candidates or unavailable coverage before paying for generation. Return a clear limitation or explicitly reduced session; do not present an arbitrary three-exercise result as meeting the full target. Test supported equipment combinations before making coverage requirements mandatory.

## Example of the requested shape

These are catalog candidates, assuming their equipment is available. This illustrates the app policy rather than a personalized prescription.

| Exercise | Sets |
| --- | ---: |
| Barbell Back Squat | 2 |
| Romanian Deadlift | 2 |
| Barbell Bench Press | 2 |
| Lat Pulldown | 2 |
| Seated Cable Row | 1 |
| Dumbbell Lateral Raise | 1 |
| Standing Calf Raise | 1 |
| Cable Crunch | 1 |
| **Total** | **12** |

## Prompt changes, after the policy is agreed

Replace the conflicting count, calibration, and duration instructions together. Preserve the existing goal, weekly schedule, display-text, and no-weights/reps rules.

> Follow the supplied session targets for exercise count, sets per exercise, total sets, and required coverage. For a 90-minute full-body session, choose 7–8 distinct exercises with 1–2 sets each and 10–14 total sets; normally aim for 8 exercises and 12 sets. Cover quads, hamstrings/glutes, chest, back, and shoulders before adding complementary work for core, calves, arms, or another back movement. Account for the primary and secondary muscles supplied with each candidate. Put compound exercises before isolation exercises.
>
> Prefer calibrated exercises when they meet the coverage needs. Include uncalibrated candidates when needed to complete this session structure; the app will calibrate them before use. Prefer groups trained least recently within a balanced session. Do not remove an entire required area merely because it was trained recently.
>
> Requested duration is the available-time ceiling. Meet the supplied volume and coverage targets within that ceiling; do not add sets solely to fill unused time. The timed-round estimate excludes additional setup and rest. Never claim the workout will last exactly the requested duration.

This excerpt is not a drop-in fix: the old appended calibration instruction, schema limits, and validators must change in the same release. The server must resolve feasible targets before sending them to the model.

## Smallest implementation and verification plan

- Extend the existing planning helpers to compute the applicable targets once. Reuse those targets for the prompt, schema, and generation validation. No new planner framework or dependency is needed.
- Include existing `pattern`, `primary`, and `secondary` catalog fields in candidate input. Currently the model gets `group`, but not those richer coverage fields.
- Enforce exercise count, per-exercise sets, total sets, coverage, compound ordering, uniqueness, equipment, and the time ceiling locally. Keep validation failure handling explicit; do not silently add paid retries or arbitrary extra sets.
- Update Start's current-profile limits with the new policy. Start currently uses the 90-minute profile maximum and does not receive the original requested duration or recheck calibration. If exact generation-target validation at Start is required, carry the request context forward; do not infer the requested duration from profile preferences. Preserve parsing of existing stored sessions.
- Add focused regression cases: zero/one/two calibrated candidates can reach the new target; many calibrated chest candidates cannot crowd out legs/back; beginner behavior matches the chosen policy; 3 exercises, missing coverage, 9 or 15 total sets, and 3 sets on one exercise are rejected when the complete target is feasible. Validate equipment-constrained fallbacks separately.
- Verify a representative generated result, including its actual request and returned selection, after deterministic checks pass. UI verification should confirm totals, calibration entry points, and honest duration labeling.

## Other prompt accuracy finding

`getPlanningContext` reads only 30 days of set history. An absent `daysSinceGroup` entry can mean no training in that window, not necessarily never trained. Change the wording to “no recorded training in the supplied history” or fetch true all-time last-trained dates before asserting “never trained.” The existing round timer also finishes when a set is logged, so its nominal duration is not measured elapsed training time.

## Review

The main cause is conflicting application policy, reinforced by permissive validation. Prompt wording alone cannot enforce the requested result. Local helper reproductions and all 14 planning tests were run; no live generation or production-profile inspection was performed. Product code remains unchanged. ISSUE-01 and ISSUE-02 remain open for the clarified acceptance target.
