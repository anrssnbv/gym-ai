# 16 — Training profile and first-sign-in survey

Add a short survey after a user's first authenticated entry, persist a training profile, and use it when suggesting a workout. Build on specs 07–15 and the QA fixes: Clerk identity, scoped Prisma actions, Generate sheet, and the existing single-session AI planner stay in place.

**Status: implemented and verified on 2026-09-25; physical-phone acceptance pending.** Profile storage/action, onboarding/edit UI, and existing generator integration were implemented and verified in that order. The additive migration is applied locally; deployment continues to use `prisma migrate deploy`.

## Implementation Verification

- 50 unit tests and 56 PostgreSQL integration checks pass; lint, TypeScript, production build, migration status, and whitespace checks pass. Existing training-table rows were compared before and after migration and remained unchanged.
- Playwright MCP verified real email signup, existing-account rollout, protected redirects, keyboard navigation, 360 × 640 layout, exact weekly totals, validation, draft reset, offline save, committed-save retry, and preferences shared across independent browser contexts.
- A controlled database outage showed Retry and Sign out instead of the survey; Retry recovered after database connectivity returned. Signed-out onboarding redirects to sign-in. No uncaught browser page errors occurred.
- One live personalized generation respected dumbbell access, beginner limits, schedule-aware Auto, and an explicit duration override. A second-context equipment edit rejected a stale preview; an already-started plan remained playable after another edit and completed with its history preserved. Insufficient candidates consumed no extra generation attempt. An old-tab set save committed once before the rollout gate appeared.
- Independent UI and backend reviews found no actionable issues. Both temporary Clerk accounts and all owned database rows were removed. No new dependencies or environment variables.
- Remaining manual acceptance: physical-phone signup/survey/workout and installed-app reopening. Real OAuth-provider interaction was not repeated for this feature; browser checks used email authentication.

## Product Decisions and Analysis

- Four steps, five answers: primary goal, gym experience, days per week, minutes per session, equipment access. Target roughly one minute to complete; no AI call during the survey.
- Ask for days and session length; show the resulting hours per week live. A separate weekly-hours input would create contradictory answers. The total is a planning preference, not an enforced attendance quota.
- Equipment access is the additional input with an immediate, enforceable use: unavailable equipment must never appear in a newly suggested workout.
- Completion is required before entering the app shell. Existing accounts without a profile complete it once too, at their next protected page load. Do not backfill invented answers or change their sets, progress, or active workout.
- Goal and experience personalize the existing resistance-training product. Choosing strength or weight management does not add low-rep programming, calorie targets, cardio, or a different progression system.
- No injuries, diagnoses, age, sex, height, body weight, photographs, or free-text health information. This version has no validated use for those fields. Do not imply that equipment/preferences provide injury screening.
- One editable profile; no onboarding drafts in the database, survey engine, weekly calendar, or new provider integration.

These decisions supersede spec 07's exclusion of a custom training-preferences page and specs 13–15's profile-free defaults/input rules. Earlier authentication, workout-history, daily-limit, and game contracts otherwise continue to apply.

## Survey Questions

All five fields are required. Goal, experience, and days start unanswered; session duration starts at 60 minutes. Equipment starts with all four selected, visibly editable. There is no Skip button; signing out remains available.

| Step | Question | Stored field and exact choices |
| --- | --- | --- |
| 1 | What is your main goal? | `goal`: `build_muscle` (Build muscle), `get_stronger` (Get stronger), `general_fitness` (General fitness), `weight_management` (Support weight management). Single choice. |
| 2 | What is your gym experience? | `experience`: `new` (New to gym training), `beginner` (Some experience — less than 6 months), `regular` (6 months to 2 years), `experienced` (More than 2 years). Self-reported, single choice. |
| 3 | How often can you train? How long per visit? | `daysPerWeek`: integer 1–7. `sessionMinutes`: existing `DURATIONS_MIN`, 30 / 45 / 60 / 90. |
| 4 | What equipment can you use? | `equipment`: nonempty unique array of existing `Equipment` IDs: `barbell`, `dumbbell`, `machine`, `cable`. Multi-select. |

Step 3 shows, for example, `3 days × 60 min = 3 hours per week`, or `3 days × 45 min = 2 hours 15 minutes per week`. Derive minutes as `daysPerWeek * sessionMinutes`; never round away a 15-minute increment or store a duplicate hours field. Say `You can change the time for each workout.`

Step 4 explains `Choose the equipment available at your gym. Machine and cable choices cover the catalog categories; individual stations can vary.` Show a compact review of all answers and the weekly total below the equipment choices, followed by `Save and continue`.

Before saving, show: `Your training preferences and recent workout history are used to generate workouts with OpenAI. You can edit these preferences later.` No new consent checkbox or marketing signup is added.

## Profile Types, Validation, and Storage

Create `lib/training-profile.ts` for client-safe constants, labels, and types. Reuse `Equipment` and the existing duration type through type-only imports where needed; avoid a runtime import cycle with `lib/plan.ts`. Keep Zod out of this file.

```ts
interface TrainingProfile {
  goal: "build_muscle" | "get_stronger" | "general_fitness" | "weight_management";
  experience: "new" | "beginner" | "regular" | "experienced";
  daysPerWeek: number;
  sessionMinutes: 30 | 45 | 60 | 90;
  equipment: Equipment[];
}
```

Create `lib/training-profile-schema.ts` with server-only `trainingProfileSchema`, declared with `satisfies z.ZodType<TrainingProfile>`:

- Strict object with exactly the five fields above. Reject extra keys, including `userId`; no coercion from strings.
- Validate enum values, integer days 1–7, duration membership, and 1–4 unique known equipment IDs. Reject empty or duplicate equipment arrays.
- Normalize equipment to the fixed order barbell, dumbbell, machine, cable before writing/returning.
- A complete valid row means onboarding is finished; no separate boolean, nullable answers, or completion timestamp.

Add one model to `prisma/schema.prisma` with an additive migration named `training-profile`:

```prisma
model TrainingProfile {
  userId         String   @id // Clerk user ID; identity remains in Clerk
  goal           String
  experience     String
  daysPerWeek    Int
  sessionMinutes Int
  equipment      String[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

String choices are validated with the shared Zod schema on writes and reads. No local identity/User table, Clerk metadata duplication, or foreign-key dependency on Clerk. Do not alter prior migrations or existing training records. Generate the migration using the project's Prisma 7 workflow, regenerate the client, and verify existing tables/data are unchanged. Deployment applies this additive migration before the new application code. Rolling back app code may leave the unused table in place.

## Query and Server Action

Add `getTrainingProfile(userId): Promise<TrainingProfile | null>` to `lib/queries.ts`:

- Query only `where: { userId }`; select/validate the five answer fields, not database timestamps as part of the strict input schema.
- Missing or malformed data returns `null`; malformed values never reach OpenAI. A database outage must throw into the route's existing retry/error handling, not masquerade as missing data.

Create `actions/training-profile.ts`:

```ts
saveTrainingProfile(input: unknown): Promise<ActionResult<TrainingProfile>>
```

- `requireUserId()` → strict schema parse → scoped `upsert` by the authenticated `userId` → `revalidatePath('/', 'layout')` → return the saved profile.
- Invalid input: `{ ok: false, error: 'Check your training preferences and try again.' }`, without writes. Do not accept an ID or identity from the browser.
- Create/update all five answers together in one atomic upsert. Identical retries are harmless; concurrent saves leave one complete profile, with the last committed save winning. No append-only submission rows or version system.
- Use `callAction` in the client, a submission guard, disabled controls while saving, and cleanup in `finally`. Lost response/network/database failure keeps all answers and an inline retry error. Do not advance optimistically before confirmed success.
- Never log raw survey payloads or send Clerk IDs, email, or names to OpenAI.

## First-Sign-In Routing

- Add authenticated `app/onboarding/page.tsx` **outside** `(app)`. It calls `auth.protect()` and `requireUserId()`, then `getTrainingProfile`.
- A completed profile visiting `/onboarding` redirects to `/`; otherwise render the survey. Reuse the existing user button/sign-out control with a simple header, but omit the bottom navigation and active-workout banner here.
- In `app/(app)/layout.tsx`, check the profile after authentication and before rendering the shell. Missing/invalid profile redirects to `/onboarding`. Do not move profile checks into `proxy.ts` or into `requireUserId()`; either would also block saving onboarding or create redirect loops.
- After the first successful save, use `router.replace('/')` and refresh server state. Initial onboarding always finishes at Home, even when entered through an exercise deep link. No user-supplied return URL is introduced.
- Already-completed users keep the current Clerk redirect/return-URL behavior and are not surveyed again after logout, refresh, or another device's login.
- Use profile existence, not a browser flag or the Clerk registration timestamp. It covers email signup, social signup, and accounts created before rollout without a webhook.
- Do not add a polling redirect that interrupts a running round. Gate protected route entry and layout revalidation. Existing authenticated manual save/Undo/Finish actions remain allowed without a profile and complete their database mutation; their existing root-layout revalidation may then redirect an already-open old tab to onboarding. Preserve committed data and active sessions, but do not promise to retain unsaved round UI across that redirect. Generation and Start enforce profile requirements separately on the server.
- Add onboarding loading/error boundaries as needed for its location outside `(app)`: loading uses the same page width; a read failure offers Retry and Sign out. Keep authentication redirects outside generic catch handlers.

## Survey and Editing UI

Create `components/onboarding/training-profile-form.tsx`, a client component:

```ts
TrainingProfileForm({
  initialProfile, // TrainingProfile | null
  mode,           // 'onboarding' | 'edit'
})
```

- Four steps with `Step n of 4`, a labelled progress indicator, one heading, short option labels, Back and Continue. Last step uses `Save and continue` for onboarding and `Save changes` for editing.
- Use existing buttons/cards/toggles and native labelled form controls. Single choices cannot become empty when the selected option is tapped again. Equipment uses checkbox semantics. Enter must not save before the final step.
- Validate each step before advancing; errors identify the field, receive appropriate focus, and are announced. First invalid field receives focus on final validation failure. On step change, focus the new heading.
- Preserve selections when using Back and during failed saves. Unsaved drafts live only in component state: a reload restarts onboarding at step 1; editing reloads the last saved profile. State this as a tested limit, not a promise to resume drafts.
- Follow `ui-context.md`: dark surfaces, lime primary action, violet only for AI explanations, 44 px targets, readable focus rings, reduced-motion support, safe-area padding, no horizontal overflow at 360 × 640. Buttons stay in normal document flow so content can scroll above the keyboard.
- At the final step, each review section has an Edit button returning to its step. Keep the survey under four steps; do not add an empty success page or automatically generate a paid plan.

Create `app/(app)/settings/training/page.tsx` with heading `Training preferences`, prefilled form in edit mode, and a `Back to Home` link. Add a labelled 44 px training-preferences icon link next to the existing Clerk user button in `components/app-shell/top-bar.tsx`; keep both controls accessible at 360 px. Do not change Clerk's account-management screens.

Successful editing returns to Home with refreshed saved values; leaving without saving retains the old profile. Editing affects future generations and new Start requests. It does not rewrite a current or historical workout, equipment calibration, levels, weights, or past sets.

## Use the Profile in Workout Suggestions

### Defaults and Auto

- Home and the empty Workout page load the profile and pass required `defaultDurationMin: TrainingProfile['sessionMinutes']` to `GenerateSheet`.
- Initialize duration from that value rather than hard-coded 60. A user's explicit duration choice for this sheet session wins, including Regenerate and reopening the same mounted sheet. A new mount after editing preferences uses the saved default. Do not overwrite touched inputs on a background refresh.
- Keep all current duration and focus choices. Explicit focus always wins over profile defaults.
- Add `resolveProfileAutoFocus(lastTrained, daysPerWeek): Focus` in `lib/plan.ts`: 1–3 planned days → `full_body`; 4–7 days → existing `resolveAutoFocus(lastTrained)` with its current tie order. This is a transparent product default, not a generated weekly schedule or a clinical prescription.
- Update Auto's helper copy to `Uses your weekly schedule and recent training.` Explain full-body selection in the returned summary when relevant.

### Equipment and Experience Constraints

- Extend `candidateExercises(focus, equipment?)`; omitted equipment preserves today's full-catalog behavior for existing schema/history callers. Provided equipment intersects with the focus candidates.
- Add `profilePlanLimits(durationMin, experience)` returning `{ maxExercises, maxSets }`: for `new`/`beginner`, `maxExercises = Math.min(maxExercises(durationMin), 4)` and `maxSets = 3`; for `regular`/`experienced`, use the current duration maximum and 5 sets. Keep minimum 3 exercises and minimum 1 set. These are app defaults, not claims about medically optimal training.
- Extend `planOutputSchema(ids, max, maxSets = 5)` so the provider schema and local generation parsing enforce the same limit. Existing `workoutPlanSchema` keeps its current global limits and focus/uniqueness refinements; stored plans must not be invalidated by changing today's profile.
- Extend `isValidPlanSelection(plan, levels, equipment?)` to calculate both candidates and the calibrated/new-exercise limit from the same equipment-filtered list. Never count calibrated exercises using unavailable equipment. Keep the existing 0/1/2-calibrated-candidate rules.
- Fewer than 3 candidates for the resolved focus returns `Not enough exercises for this focus and equipment. Choose another focus or update Training preferences.` Show a link to preferences. No OpenAI call, quota reservation, workout creation, or silent widening of equipment/focus. Auto uses the same rule; selecting Full body is a user action, not a hidden fallback.
- Equipment filtering is a recommendation constraint. Manual catalog browsing/logging remains available; broad categories cannot guarantee an individual gym has every listed station.

### Generation and Start

- Extend `PlanningContext` with `profile: TrainingProfile | null`; `getPlanningContext(userId)` loads it with the existing owned history/progress reads. Historical statistics stay independent of the profile.
- `generateWorkout` keeps its public `{ durationMin, focus }` input. Load the authoritative profile on the server; missing/invalid → `Complete your Training preferences before generating a workout.` Provide the preferences/onboarding link and return before reserving quota or calling OpenAI.
- Resolve Auto, filter candidates, calculate limits, and check candidate sufficiency before the existing atomic quota reservation. Retain API-key checks, the rolling 10-attempt limit, response-loss handling, and existing error boundaries.
- `generatePlan` requires a non-null profile in its input context. Include only `{ goal, experience, daysPerWeek, sessionMinutes, equipment }` as `trainingProfile` alongside current history and candidates. Requested `durationMin` overrides the preferred session length. Weekly hours are derived, never treated as remaining budget or inferred attendance.
- Apply exactly the same candidate list and limits to the provider enum, prompt's calibrated IDs/new-exercise cap, local parsing, and post-generation validation. Keep uniqueness, focus, calibration, and `estimatePlanMinutes(plan) <= durationMin` checks after deduplication. Estimates cover existing rounds/transitions; do not promise exact total gym time including warm-up, queues, or changing.
- Prompt goal guidance: muscle → balanced muscle coverage; strength → practice relevant compound movements first; general fitness/weight management → balanced resistance sessions and consistency. Experience changes cue clarity and volume within the explicit limits. Never output weight-loss guarantees, diets, load prescriptions, reps, level changes, or an invented history.
- All existing timer lengths, 12-rep targets, calibration, level-ups, and per-exercise ceilings remain unchanged. The survey is not a strength test; never initialize progress from experience.
- `startWorkout` retains `{ plan }`. Inside its existing serializable transaction, read/validate the user's current profile before changing sessions. Missing profile → complete-preferences error. Equipment mismatch, more than 4 exercises for new/beginner, or more than 3 sets on any exercise for new/beginner → `Your Training preferences no longer match this plan. Generate a new workout.` Return without attaching/creating/closing any session. This catches a preview created before another tab edited preferences.
- Do not reapply current calibration/new-exercise counts to Start or stored plans: calibration legitimately changes after preview. Goal/days/duration edits alone do not invalidate a preview. Existing duration validation remains at generation, because stored `WorkoutPlan` has no duration field.
- Already-started and historical plans continue to render with the existing `workoutPlanSchema`, regardless of subsequent profile edits. No new plan JSON version or profile snapshot is required.

## Files and Ordered Implementation Checkpoints

1. **Profile foundation:** `prisma/schema.prisma`, new migration, `lib/training-profile.ts`, `lib/training-profile-schema.ts`, `lib/queries.ts`, `actions/training-profile.ts`; pure validation and database/action checks before route changes.
2. **Onboarding/edit wiring:** `app/onboarding/page.tsx` and its loading/error UI, `components/onboarding/training-profile-form.tsx`, `app/(app)/layout.tsx`, `app/(app)/settings/training/page.tsx`, `components/app-shell/top-bar.tsx`; verify login/save/edit and redirect boundaries.
3. **Existing generator wiring:** `lib/plan.ts`, `lib/plan-schema.ts`, `lib/ai.ts`, `actions/workout.ts`, `components/workout/generate-sheet.tsx`, `app/(app)/page.tsx`, `app/(app)/workout/page.tsx`; use shared limits/filtering and update existing fixtures.
4. Update affected specs 07, 13, 14, and 15 plus current-behavior context docs after implementation. Keep spec 16 planned until its acceptance checks pass; track real-phone checks separately.

## Dependencies and Scope Limits

- Reuse installed Clerk, Prisma 7/PostgreSQL, Zod, React, OpenAI SDK, and existing UI components. No new packages, environment variables, paid service, Clerk webhook, or analytics.
- No survey designer, medical screening, nutrition/cardio plans, bodyweight exercises, custom exercises, exercise-exclusion selector, multi-goal ranking, automatic weekly scheduling, notifications, profile export, or per-user rep/timer/weight-limit changes.
- Do not edit `components/ui/*`, existing exercise IDs, or applied migrations. Retain deployment's existing `prisma migrate deploy` workflow.

## Check When Done

### Data and Ownership

- Schema tests accept each goal/experience and 1/7-day boundaries; reject out-of-range/fractional days, invalid durations, unknown/duplicate/empty equipment, and an injected `userId`.
- Database/action checks cover first save, edit, duplicate submission, concurrent first save, identical retry after a lost response, unauthenticated access, and cross-user isolation. Profile writes never modify training tables.
- Additive migration preserves existing sessions, progress, sets, and generation attempts. All fixture cleanup includes TrainingProfile rows; no test user is left behind.

### Routing and UI — Playwright MCP

- New email or social signup reaches onboarding before Home. Save all four steps → Home; reload/logout/login/second device → no repeat survey.
- Existing user without a profile sees the same survey once, retaining history and any active session. Direct `/workout`, exercise, settings, and `/onboarding` visits have the specified outcomes without loops. Signed-out onboarding redirects to Clerk.
- An old training tab belonging to a missing-profile user can commit Save/Undo/Finish during rollout; subsequent revalidation may show onboarding. After completing the survey, verify the mutation persisted exactly once and the workout's saved state is intact. No unsaved round is fabricated on return.
- Invalid/malformed profile returns onboarding; database read failure shows Retry, not a fabricated new-user state. No partial shell appears while redirecting.
- Back preserves choices, review Edit navigates correctly, selected single choices cannot clear, and equipment cannot submit empty. Weekly display is exact for 1 × 30, 3 × 45, and 7 × 90 minutes.
- Offline Save retains all answers, retries safely, and does not show completion early. Reload before Save restarts as documented; edit mode reload restores saved values. Signing out during onboarding permits another account without leaking the previous user's draft.
- Complete with keyboard and at 360 × 640: labelled progress/choices, focus movement, inline announced errors, visible buttons, 44 px targets, no horizontal overflow or uncaught page errors.
- (phone) Finish signup → survey → generate → log a workout; verify touch, scrolling, browser navigation, and saved preferences after reopening the installed app.

### Personalization and Regressions

- Schedule default seeds both Generate entry points; an explicit 30-minute override still wins over a 90-minute preference. Regenerate keeps the chosen duration.
- Auto gives Full body for days 1 and 3; days 4 and 7 use existing recency/tie rules. Explicit Pull remains Pull regardless of days.
- All generation stages share equipment filtering: a dumbbell-only user never receives cable, machine, or barbell exercises. Verify 0/1/2 calibrated eligible candidates and calibrated but excluded exercises.
- Too few candidates and missing profiles consume no generation attempt and call no API. A valid beginner plan has 3–4 exercises and 1–3 sets each; excessive model output is rejected. Experienced limits and the exact-duration boundary remain correct.
- Mocked SDK test verifies only the five profile fields enter the payload, request duration wins, goal/experience instructions exist, and no identity or medical fields are sent. No requirement to make a paid call in automated tests.
- Preview → equipment/experience edit in another tab → Start rejects incompatible plan without session mutation. Already-started/historical plans and manual logging remain usable after the same edit.
- Full regression suite passes, including old wrong-weight/Undo/weight-cap fixes, quota reservation races, invalid stored plans, and manual/generated workout completion. Update old integration fixtures to create profiles where generation/Start now requires them.
- `npm test`, `npm run test:integration`, `npm run lint`, `npm run build`, migration status, and diff checks pass. One controlled live personalized generation validates the existing provider schema; retain the configured API spending limit and clean temporary data.
- Update `progress-tracker.md`, task review, and context docs with actual results. Follow the established branch → PR → merge → local main/development sync workflow after implementation.
