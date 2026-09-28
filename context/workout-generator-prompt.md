# Workout generator prompt — 60/90/120 minutes

Status: implemented in `lib/ai.ts` with shared targets, timing and coverage in `lib/plan.ts`; verified locally and with real model calls; delivered in PR #27. This specification supersedes the target proposal in `workout-planning-review.md`.

## User requirements

- Generated workout choices: 60, 90, or 120 minutes. Shorter training remains available through the exercise menu.
- Working set: approximately 2–3 minutes. Rest: approximately 3–4 minutes. Budget approximately 5–7 minutes for each set and its recovery.
- Timing depends on exercise difficulty, not the app's LV number. Selected duration covers working sets and rest only; warm-up can be suggested separately.
- A 60-minute full-body session: approximately 8–10 exercises and 9–12 total working sets, normally 1–2 sets per exercise, distributed across muscles.
- A 60-minute push session: approximately 4–5 exercises covering chest, shoulders, and triceps, normally 2–3 sets per exercise.
- Longer push/pull/legs sessions: 4–5 exercises with exactly 3 sets each, totaling 12–15 sets, subject to the time budget. A 120-minute choice may finish earlier; do not add a fourth set to fill it.
- Exercise count and sets per exercise describe the session structure. Their maximum values must not all be selected when their combined time exceeds the requested duration.

## Replacement instructions

```text
Plan one gym session using the supplied training profile, exercise candidates, session targets, and timing estimates.

Generated workouts support only 60, 90, and 120 minutes. The requested duration overrides the profile's preferred duration. Shorter training uses the separate exercise menu.

Plan from the time budget first. Each candidate has a supplied working-set duration and rest duration based on exercise difficulty. Working sets usually take 2–3 minutes and rest usually takes 3–4 minutes, giving approximately 5–7 minutes per set-and-rest cycle. Use the supplied estimates; do not infer duration from the app's level number or nominal countdown timer. Count each working set once, even when it trains several muscles.

Estimated planned minutes = sum(sets × (setMinutes + restMinutes)) across all selected exercises. Budget one complete work-and-rest cycle per set. The selected duration covers working sets and rest only. Do not charge warm-up or separate equipment setup against this budget; equipment changes during rest do not add another time charge. If suggesting a warm-up, label it separately as additional time and do not count it as working sets. The cycle budget is a planning estimate, not a promise of exact elapsed gym time.

Stay within durationMin. Choose volume near the supplied target total sets when feasible. Do not maximize sets per exercise or add sets merely to consume every remaining minute. If time and count ranges conflict, reduce volume within the supplied bounds or choose suitable alternatives. If the required structure is impossible with the supplied candidates and timing, report the limitation through the supplied response schema rather than returning a misleading complete plan.

For a 60-minute full-body session, normally choose 8–10 distinct exercises and 9–12 total working sets, with 1–2 sets per exercise. Cover chest, back, shoulders, arms, and lower body. Include both knee-dominant and hip-dominant or hamstring work when available. Use the candidates' primary and secondary muscles to understand overlap, but do not count one compound exercise as several separate working sets. Distribute remaining slots according to the supplied coverage targets and recent training. Use forearm, calf, or core exercises only when present in the candidate catalog and appropriate to those targets.

For a 60-minute push session, normally choose 4–5 distinct exercises covering chest, shoulders, and triceps, with 2–3 sets per exercise. Select a combination whose total time fits; do not automatically prescribe three sets for every exercise. Avoid filling the session with similar chest presses while omitting shoulders or triceps.

For 90- and 120-minute push, pull, and legs sessions, choose 4–5 distinct exercises with exactly 3 sets each, totaling 12–15 working sets. Preserve the focus's required muscle coverage. Keep the estimate within the selected duration. If a five-exercise selection would exceed it, use a balanced four-exercise selection or suitable alternatives with shorter difficulty-based timing. A 120-minute choice can finish earlier: never increase to four or five sets per exercise solely to fill that time. If no permitted selection fits, report the limitation.

For 60-minute pull and legs sessions, upper-body sessions, and longer full-body sessions, follow the supplied focus-specific count, set, and coverage targets. Retain 1–2 sets per exercise for full-body sessions. Increase planned volume only within those targets and the available set-and-rest time; do not multiply every exercise by the maximum set count.

Use only candidate exercise IDs, without duplicates. Put compound exercises before isolation exercises. Equipment restrictions and the supplied experience-specific targets are mandatory. Distinguish training experience from whether an exercise has been calibrated in this app.

Prefer calibrated exercises when they meet the required coverage. Include uncalibrated candidates when necessary; the app will ask for calibration before they are used. Do not shrink a full-body plan to three exercises solely because few exercises are calibrated.

Use the user's training goal and weekly schedule to choose emphasis within the supplied session targets. Consider recent training and compound overlap when allocating sets. Prefer less recently trained areas while maintaining required focus coverage. Missing history means no recorded training in the supplied history, not proof that a muscle has never been trained. Do not invent workouts or infer attendance from weekly availability.

Return the supplied structured response. Give the session a short title, a 1–2 sentence summary explaining its training emphasis, and one short form cue per exercise. Use English and respect the schema's text limits. Do not promise that the session lasts exactly the requested duration. Never prescribe weights, repetitions, percentages, or level changes; the app owns those values. Do not give diets, medical advice, or weight-loss guarantees.
```

## Arithmetic review

Illustrative distributions at a six-minute cycle, with warm-up outside the budget. Full-body rows for 90/120 minutes illustrate feasible allocations within 8–10 exercises and 1–2 sets each. These are planning examples, not measured workout durations or universal training prescriptions.

| Selected duration | Full-body example | Push/pull/legs example |
| --- | --- | --- |
| 60 min | 8 exercises: 2 with 2 sets and 6 with 1 set; 10 sets / 60 min | 5 exercises with 2 sets each; 10 sets / 60 min |
| 90 min | 10 exercises: 5 with 2 sets and 5 with 1 set; 15 sets / 90 min | 5 exercises with 3 sets each; 15 sets / 90 min |
| 120 min | 10 exercises with 2 sets each; 20 sets / 120 min | 4–5 exercises with 3 sets each; 12–15 sets / 72–90 min |

- The user's 9–12 sets for 60 minutes is a target range, not permission to exceed the time budget: 9 × 7 = 63 minutes and 12 × 7 = 84 minutes.
- Four or five push exercises with two or three sets produce 8–15 sets. At six minutes per cycle, that spans 48–90 minutes. A 60-minute plan must select the appropriate combination, such as five exercises with two sets each.
- Warm-up is additional time and does not reduce the selected working-set/rest budget. Difficulty-based per-exercise estimates determine the actual planned total; six minutes is only the illustration above.
- Across the user's full 5–7-minute range, 12–15 sets take 60–105 minutes. A 90-minute split session must select a combination that fits; a 120-minute split session may be shorter than the selected maximum. Preserve the confirmed three-set limit.

## Confirmed decisions

1. Use exercise difficulty to determine timing. The implementation must supply consistent per-exercise estimates rather than let the model invent different durations to fit each request.
2. Longer push/pull/legs sessions use three sets per exercise and 12–15 total sets. Earlier suggestions of four sets per exercise for 120 minutes are superseded.
3. Count working sets and rest only. Warm-up suggestions are optional and outside the selected budget. For budgeting, each set reserves a complete recovery cycle, including the final set; actual elapsed time can be shorter when the final recovery is unnecessary.

## Compatibility review before implementation

- Update duration controls, defaults, and validation together to 60/90/120. Existing saved 30/45-minute profile preferences and historical workouts must remain readable; map old preferences to the new minimum for future generated sessions.
- Replace the shared use of `roundSeconds` in generation and estimation with the confirmed work/rest budget. Changing planning estimates does not automatically authorize changing the live exercise timer.
- Resolve duration/focus targets once and reuse them in prompt input, output schema, generation validation, preview estimates, and Start validation. The existing schema maximum of eight exercises and the 60-minute maximum of six cannot support ten-exercise full-body plans.
- Remove both copies of the mandatory new-exercise cap and reconcile the beginner four-exercise ceiling with the new requirements. Otherwise the new prompt remains impossible to follow for many users.
- Supply candidate timing, pattern, primary muscles, and secondary muscles. Those fields and resolved session targets are required by this draft but are not currently all in the request payload.
- Resolve focus coverage for the existing catalog. Dedicated forearm exercises are absent; do not invent candidate IDs to fill that slot.
- Determine infeasible equipment/timing combinations before the paid call where possible. The current success-only output schema has no limitation response, so its contract or preflight handling must be aligned with this draft.
- Verify time arithmetic, total sets, coverage, beginner and calibration cases, legacy profiles, and representative generated 60/90/120-minute outputs before calling the new setup ready.

## Review result

The prompt now incorporates all three answers and distinguishes the full-body and split-session shapes. The old instruction to fill an underestimated timer budget is removed. The requested duration, set count, and per-exercise ranges are reconciled by a time ceiling. Review confirmed that longer split sessions must not be padded past 12–15 sets to fill 120 minutes. No further clarification is required to finish this prompt specification. Implementation now follows this reviewed policy; live verification is recorded below.

## Implementation details

- Difficulty heuristic: isolation 2 minutes work + 3 rest; machine/cable compound 2.5 + 3.5; free-weight compound 3 + 4. These are conservative catalog-based planning estimates, independent of LV and the live timer.
- Full body uses 8–10 exercises, 1–2 sets each, 9–12 sets at 60 minutes; longer sessions aim at 15/20 sets within the time ceiling. Upper body uses 6–8 exercises, 1–3 sets each, targeting 10/15/20 total sets. All split sessions follow the confirmed 4–5-exercise rules.
- Coverage requires primary chest, upper-back, shoulder, quad and hamstring work as appropriate to focus. Biceps/triceps and pull rear-delts may use secondary coverage only where the candidate pool lacks direct primary work. Back extensions alone cannot satisfy upper-back coverage. Calf/core work is optional; there are no dedicated forearm candidates.
- The existing response remains success-only. Candidate-count, coverage and minimum-time feasibility are checked before the paid call; returned plans pass strict local validation. No fabricated limitation field is requested from the model.
- Start receives the selected duration and checks the same policy. Historical plan parsing stays permissive; old profile durations normalize on reads. No database migration or live exercise timer change.

## Live verification

See `workout-generator-live-review.md` for exact outputs. Final samples: full body 60 → 9 exercises/10 sets/58 minutes; push 90 → 5/15/87; pull 120 → 5/15/81. Initial full-body samples revealed excessive shoulder allocation and ordering problems; the prompt now explicitly groups all delts together, validation caps each full-body catalog group at two exercises, and output is stably sorted compounds first. Five API calls were made across initial testing and refinement.
