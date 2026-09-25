# Application QA — current issues

Audit date: 2026-09-25. Revision: `b0ff75a3dfe82605ed0fc0d715fd988468d63214` (`main`).

Scope: specs 01–15, Playwright MCP against `http://localhost:3100`, source review, terminal logs, unit tests, database integration tests, and production build. Later specs supersede the earlier mock/local-state requirements.

## Production issues found after deployment — 2026-09-25

These are new findings from Vercel runtime logs and the deployed app. The original local QA audit below remains historical; its passing generation checks do not cover the current Vercel environment. **PROD-03 is resolved; PROD-01 and PROD-02 remain open pending key rotation and live generation verification.** Secret values are redacted here.

### PROD-01 — P1: Generate workout always returns a retry error on the primary production site

- **User report:** Open Generate workout, choose a duration and focus, then submit. The sheet displays `Couldn't generate a workout. Try again.` and no preview appears.
- **Observed evidence:** In project `gym-ai`, Vercel logged a `POST /workout` at `2026-09-25 14:33:45 UTC` with HTTP 200 and `Workout generation failed TypeError: Headers.append: "Bearer [REDACTED]\nNEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/" is an invalid header value.` An earlier production request logged the same error. HTTP 200 is the Server Action transport status, not generation success.
- **Cause:** The production `OPENAI_API_KEY` value contains a newline followed by another environment-variable assignment. The OpenAI SDK tries to use that entire value as the Bearer authorization header; header construction fails before an OpenAI request is sent. This is a Vercel secret-value configuration error. `actions/workout.ts` catches it and returns the generic message shown in the sheet.
- **Additional impact:** `generateWorkout` creates a `PlanGeneration` row before calling `generatePlan`, so each failed request that reaches this point consumes one of the app's 10 attempts per rolling 24 hours. The log does not show a paid OpenAI request. Once the secret is corrected, a user who exhausted the local quota may still see `Daily limit reached (10 plans)` until attempts age out.
- **Fix and acceptance:** Rotate the exposed OpenAI key, set the new key as one clean value in the active Vercel project's Preview and Production environments, and redeploy. Confirm a signed-in production user can generate a preview for a selected duration/focus. Check the remaining daily quota without deleting real user history. Keep the API key out of logs and issue reports.

### PROD-02 — P0: A production error log exposed the OpenAI API key

- **Observed evidence:** The `Headers.append` exception above included the complete Bearer value in Vercel runtime logs. The value is intentionally omitted from this file.
- **Cause:** `actions/workout.ts` logs the raw caught exception with `console.error("Workout generation failed", error)`. The invalid-header exception embeds the authorization value in its message.
- **Impact:** Anyone with access to those logs could copy the key. Correcting the Vercel variable alone does not invalidate the disclosed key.
- **Fix and acceptance:** Revoke the exposed key in OpenAI, create a replacement, and update the Vercel secret. Change generation logging to emit safe error metadata without authorization values; verify a malformed-key regression cannot write credentials to logs. Review the OpenAI project usage around the disclosure.

### PROD-03 — P1: The second connected Vercel project returns HTTP 500 before authentication

- **Status: Resolved 2026-09-25.** Replaced the project's Clerk publishable key with a non-secret Config value for Preview and Production, updated the secret key from the matching local Clerk instance, and allowed a fresh production deployment (`Dkg6Yw1wioNnU1NqhyAiC19bCJyn`, merge `8140279`). `GET https://gym-ai-z3nm.vercel.app/` now returns 307 to Clerk sign-in, which returns 200. The old deployment's 500 is no longer served at the alias.
- **Observed evidence:** Project `gym-ai-z3nm` logged `@clerk/nextjs: Clerk keys are missing from your environment` for a production `GET /` at `2026-09-25 14:33:14 UTC`. A separate direct request to `https://gym-ai-z3nm.vercel.app/` returned HTTP 500. This is distinct from the primary `gym-ai-seven-alpha.vercel.app` site.
- **Original assessment:** Clerk reported missing keys at runtime despite Vercel listing the variable names. A Ready build had not verified the request path. The publishable key's Secret storage type was incompatible with Vercel's `NEXT_PUBLIC_` variable requirement; correcting the key configuration and redeploying removed the 500.
- **Acceptance:** The production alias redirects signed-out `/` to a rendered Clerk sign-in page. Whether the duplicate project is needed remains a separate project-management decision.

The primary project's production logs also contain the PostgreSQL `sslmode=require` compatibility warning already listed under Terminal warnings below. It appeared on page requests and does not explain the Generate failure.

### Recovery progress — 2026-09-25

- [PR #20](https://github.com/anrssnbv/gym-ai/pull/20) merged as `8140279` and deployed to both projects. The action rejects malformed keys before reserving quota and logs only a fixed stage on failure; integration tests verify that fake secrets stay out of logs and attempts. The primary alias still redirects signed-out visitors to sign-in (307). No authenticated production generation has been claimed yet.
- Unit tests 50/50, PostgreSQL integration tests 56/56 in serial mode, focused generation tests 10/10, lint, and production build passed. Parallel integration files repeatedly caused unrelated transaction retry exhaustion; the standard integration script now runs serially.
- The exposed OpenAI key must still be revoked and replaced in the same $10-budget project. The replacement must then be installed as one clean secret in Vercel and a fresh deployment tested. This is the remaining gate for PROD-01 and PROD-02.

**Original audit: 5 confirmed defects (2 high, 1 medium, 2 low), two validation gaps, and three observations.** The original reproductions below are retained as regression cases.

## Fix verification — 2026-09-25

Implemented on `fix/qa-training-integrity`; PR delivery is tracked in `progress-tracker.md`.

| Finding | Current status | Evidence |
| --- | --- | --- |
| QA-01 wrong recorded weight | Fixed | Required level/weight/step snapshot; transaction rejects stale settings before writes. Database tests and two independently signed-in browser contexts pass. |
| QA-02 unsafe Undo | Fixed | Exact set ID, newest-row check, already-absent no-op, original retry target retained. Stale tab deletes nothing; response-loss retry removes exactly one set; concurrent Undo tests pass. |
| QA-03 weight limit mismatch | Fixed with user-selected exercise limits | All 50 exercises define maxWeightKg; forms/actions/progression agree. Blocked increments save the performed set without advancing. Exact-limit increments pass. Existing above-limit records remain loggable and support unchanged-weight step edits. Inventory after integration cleanup found zero existing above-limit rows. |
| QA-04 stale Undo feedback | Fixed | Shared client owner reconciles completed set IDs. Browser Undo returns to Start without old success text; Undo of an older set preserves a different running timer (02:00 to 01:58). |
| QA-05 header target | Fixed | Browser measured 67 × 44 px. |
| GAP-01 duration validation | Fixed | Catalog-based time estimate checked after deduplication. Over-budget model fixture now returns an error; exact fit passes. |
| GAP-02 invalid stored/submitted plans | Fixed | Shared schema rejects duplicate IDs and off-focus exercises; failed Start leaves sessions untouched; invalid stored plans retain manual fallback and sets. |
| OBS-01 transport crash | Not reproduced with corrected harness | Fresh contexts recovered from offline failure, a controlled HTTP 503, and lost responses after commit. No page errors/error boundaries; Save replay produced one set. No framework patch justified. |
| OBS-02 offline authentication | Not reproduced with independent sign-in | 86 seconds offline retained the 9-rep sheet/timer; reconnect and retry saved once on the same exercise URL. Revoking the temporary session redirected to sign-in with the exercise return URL; email-code login returned there without a phantom unsaved set. No redirect loop. |
| OBS-03 signup challenge | Automated flow passed with supported test tooling | Clerk development Testing Token and its documented Playwright response handling allowed real UI signup, email verification, Home landing, and sign-out. Live human CAPTCHA completion remains a manual acceptance check; application bot protection was unchanged. |

Verification: **45 unit tests, 45 PostgreSQL integration checks, ESLint, TypeScript/production build, and diff checks passed**. Independent code review found no actionable defect. A fresh live Auto plan completed all nine UI-logged sets and produced a named summary with 1.8 t. A manual session also completed successfully. New browser contexts reported no uncaught page errors during these checks. Both temporary accounts and their database rows were deleted; test contexts were closed and the original user tabs preserved.

Local ignored evidence: `.playwright-mcp/qafix-stale.png`, `.playwright-mcp/qafix-plan-complete.png`. Clerk testing follows its [testing overview](https://clerk.com/docs/guides/development/testing/overview) and [Playwright helper implementation](https://github.com/clerk/javascript/blob/main/packages/testing/src/playwright/setupClerkTestingToken.ts). No testing token or secret is committed.

The Node module/TLS warnings below remain documented maintenance work. No dependency or production-authentication configuration was changed to silence development warnings. Physical-device limitations still apply.

## Confirmed defects

### QA-01 — P1: A running round can save a weight the user did not lift

- **Area:** specs 05, 09, 10; exercise actions and training history.
- **Reproduction:** Calibrate Barbell Bench Press to 20 kg, step 2.5 kg, LV 1. Start a round in mobile tab A. Open Log reps: it displays `20 kg · LV 1`. In desktop tab B, Adjust the exercise to 40 kg without changing its level. Save 10 reps in A.
- **Actual:** History records `40 kg × 10`. No stale-state error appears. The round was displayed at 20 kg, but volume is calculated using 40 kg.
- **Expected:** Detect the changed round configuration and reject the stale save, or apply an explicitly defined policy that preserves the actual attempted load. The current behavior silently changes recorded training data.
- **Cause:** `components/exercise/exercise-level.tsx:44` captures the round state, but line 64 sends only `expectedLevel`. `actions/exercise.ts:79` adjusts weight/step without changing level; line 99 checks only level; line 113 records the latest database weight.
- **Impact:** Incorrect set history, volume, and potentially progression when the other tab also changes the step.
- **Evidence:** Reproduced with two Playwright contexts signed into the same disposable account; corroborated by executing the real action with an in-memory database stub. Local screenshot: `.playwright-mcp/audit-wrong-weight.png`.
- **Fix direction:** Compare a complete round revision/snapshot atomically, including changes that do not advance the level. Add a concurrent Adjust/log regression case.
- **Specification note:** Spec 09's expected-level-only signature contains this gap; the implementation follows that limited contract.

### QA-02 — P1: Undo deletes an unseen set and can delete another set on retry

- **Area:** specs 09–10; destructive history action.
- **Reproduction A — stale tab:** Both tabs display newest set `40 kg × 10`. Log `40 kg × 8` in A. Without refreshing B, click Undo beside the displayed 10-rep set and confirm.
- **Actual A:** The unseen 8-rep set is deleted. The displayed 10-rep set remains.
- **Reproduction B — lost response:** Create consecutive 10-, 6-, and 7-rep sets. Allow Undo to complete on the server, then simulate loss of its response. The UI reports `Couldn't reach the server. Try again.` and retains the old list. Retry Undo.
- **Actual B:** The first request deletes the 7-rep set. The retry deletes the 6-rep set. An observer tab confirmed both separate deletions.
- **Expected:** Undo must identify the displayed set. A repeated request must not delete another set. A stale target should produce a conflict or a defined idempotent result.
- **Cause:** `components/exercise/set-history.tsx:30` sends only `exerciseId`; `actions/exercise.ts:146` finds whichever set is newest at execution time and line 151 deletes it. There is no expected set ID or replay protection.
- **Impact:** Unintended data loss; deleting an unseen level-up can also roll progress back.
- **Evidence:** Both variants reproduced in Playwright. For B, a one-shot `window.fetch` wrapper awaited the real POST and consumed its response before throwing `TypeError('Simulated response lost after commit')`; the next request used normal fetch. A separate context verified persisted rows before and after retry. This clean reproduction did not use the problematic route interception described below.
- **Fix direction:** Send the displayed set ID and perform a scoped, transactional latest-set check with safe replay behavior. Cover stale-tab and post-commit response-loss cases.
- **Specification note:** Specs 09–10 currently specify an exercise-only Undo call; that contract needs revision.

### QA-03 — P2: Level-up creates a weight that Adjust refuses to save

- **Area:** specs 05–06, 09–10; progression bounds.
- **Reproduction:** Calibrate Leg Press to 1000 kg with a 50 kg step, both accepted inputs. Log 12 reps. Reload, open Adjust, change only the step to 25, and Save.
- **Actual:** Progress persists as LV 2 / 1050 kg. Adjust prefills 1050, but its maximum is 1000. Native validation blocks saving: `Значение должно быть меньше или равно 1000.` (value must be at most 1000).
- **Expected:** Progression and editing must share a defined maximum-weight policy. A state created by the app should remain editable without first reducing the weight.
- **Cause:** `lib/game.ts:110` adds the step without an upper bound. `components/exercise/weight-sheet.tsx:93` and `actions/exercise.ts:16` enforce a 1000 kg maximum; the level-up action persists the unchecked result.
- **Evidence:** Browser reproduction and pure-code check of `applySet(calibrate(1000, 50), 12)`. Screenshot: `.playwright-mcp/audit-weight-limit.png`.
- **Fix direction:** Decide the ceiling behavior, apply it consistently, and test progression at the boundary. Spec 05 explicitly claims the limit prevents this case, but unbounded addition does not satisfy that claim.

### QA-04 — P3: Undo leaves “Level cleared!” and the round count unchanged

- **Area:** specs 06, 10; feedback consistency.
- **Reproduction:** At LV 1 / 30 kg, log 12 reps. Wait for LV 2 / 32.5 kg and the new history entry. Undo that set.
- **Actual:** The persisted card correctly returns to `LV 1`, `30 kg`, `0 / 12`, but the round still says `Level cleared!` and offers Next round. Its local completed-round count also retains the undone round.
- **Expected:** Feedback should reflect that the result was undone; the page should not simultaneously show reverted progress and a successful level-clear result.
- **Cause:** `components/exercise/exercise-level.tsx:31`–`32` retain local round/result/count state. Its result is assigned at line 77; the separate `SetHistory` Undo refreshes server data without reconciling that state.
- **Evidence:** Reproduced after waiting for the reverted LV 1 heading. Screenshot: `.playwright-mcp/audit-undo-feedback.png`.
- **Fix direction:** Reconcile the active round's result/count with a successful Undo of its set.

### QA-05 — P3: The header Home link is below the required tap-target height

- **Area:** specs 01–02 and `context/code-standards.md:50`.
- **Reproduction:** Measure the `Gym AI` header link at 360 px viewport width.
- **Actual:** Approximately 67 × 28 px. The shared standard requires targets of at least 44 px.
- **Expected:** Give the clickable element a minimum 44 px height while preserving its visual text size.
- **Cause:** `components/app-shell/top-bar.tsx:8` applies typography only, with no minimum target height/padding.
- **Evidence:** Playwright DOM bounding box. Bottom navigation targets met the size requirement.

## Additional code validation gaps

These are source-confirmed gaps, **not observed failures in normal generated plans**.

### GAP-01 — Generated duration is not validated after the model responds

`lib/ai.ts:13` instructs the model to fit the duration. `lib/plan.ts:75` (`isValidPlanSelection`) checks focus and calibration limits but accepts no duration. `lib/plan-schema.ts:5` bounds counts and sets but cannot enforce total time. Three calibrated compound exercises with five sets each require approximately 32 minutes under the stated formula and can pass these checks for a 30-minute request.

The live 30-minute plan in this audit did fit: two compounds at three sets each plus one isolation at two sets, approximately 16 minutes including changes. Add deterministic duration validation if fitting the requested time is a strict requirement.

### GAP-02 — Start accepts duplicate exercise IDs / a mismatched focus in crafted plans

`lib/plan-schema.ts:17` validates individual catalog IDs and the focus enum, but not uniqueness or their relationship. `startWorkout` uses that schema. Normal generation deduplicates and validates earlier, so the ordinary UI did not expose this defect. Crafted input or malformed stored JSON can produce repeated checklist entries or a plan whose badge disagrees with its exercises. Validate these invariants at the persistence boundary if they must hold for all stored plans.

## Observed errors and unresolved cases

### OBS-01 — Development transport crash during route fault injection

The exercise page reached `This page couldn’t load` during an early attempt to drop an action response through Playwright route interception. `.next/dev/logs/next-development.log`, around elapsed timestamps `00:18:43`–`00:20:22`, recorded:

```text
TypeError: Cannot write to a closing/CLOSED writable stream
TypeError: Cannot close a CLOSED writable stream
Uncaught TypeError: chunk.reason.enqueueModel is not a function
```

The harness also reported `Route is already handled!` and `Cannot accept dialog which is already handled!`. This makes that reproduction unreliable. A fresh context with a one-shot fetch failure recovered with the intended inline message, and normal round logging replayed safely. **Do not treat this as an established normal-production crash.** Keep it for an isolated transport-failure investigation. Screenshot: `.playwright-mcp/audit-lost-response-crash.png`.

### OBS-02 — Auth redirect after extended offline testing

One test context returned to Home instead of retaining its exercise/reps sheet on recovery from a longer offline interval. The attempted 9-rep set did not appear in history. The log repeatedly reported:

```text
The <SignIn/> component cannot render when a user is already signed in ...
Clerk is redirecting to the `afterSignIn` URL instead.
```

The context subsequently recovered, and fresh online flows and a clean lost-response round retry passed. Token refresh after offline testing and reused authentication state are possible contributors; the cause is not established. Needs a clean, independently authenticated browser reproduction with session-refresh network tracing before assigning this to app code.

### OBS-03 — Full UI sign-up blocked by an anti-bot challenge

The sign-up form rendered and rejected an empty password. After valid email/password submission, it stayed on `/sign-up`; a `challenges.cloudflare.com` Turnstile frame was present and no session was created. The input form was replaced by the account-creation card without a completed next step during the test. No CAPTCHA bypass was attempted. Screenshot: `.playwright-mcp/audit-signup-stuck.png`.

This is an automation-blocked acceptance check, not proof that normal users cannot sign up. Email-code sign-in with a pre-created disposable account and profile-menu sign-out did pass. A manual sign-up completion remains necessary.

## Terminal warnings

- Native TypeScript test/helper execution emits `[MODULE_TYPELESS_PACKAGE_JSON]`: modules are reparsed as ESM because package type is implicit. Tests still pass. Review module configuration separately; adding `type: module` blindly could affect other configuration files.
- PostgreSQL tooling emits `SECURITY WARNING` that `sslmode=prefer/require/verify-ca` currently behave as `verify-full`, with different semantics planned for pg-connection-string v3 / pg v9. Current migrations and integration checks passed. Make the intended TLS verification explicit before such an upgrade.
- Clerk reports development keys and their usage limits. Expected in this local development audit; production authentication configuration was not audited.
- React DevTools notices and expected failed requests during deliberate offline tests are not application defects. No Clerk deprecation warning was found in the inspected logs.
- Playwright selector timeouts/strict-mode failures and the route-handler errors above were harness errors. They were corrected or marked inconclusive rather than counted as product bugs.

## Coverage and passing checks

| Spec | Verification performed in this audit | Result / limits |
| --- | --- | --- |
| 01 Design system | Theme/colors and Oxanium font; light/dark preference; reduced motion; representative mobile/desktop layouts | No horizontal overflow; QA-05 target-size issue |
| 02 App shell | Home/Exercises/Workout navigation; nested active tabs; public manifest/icons; viewport metadata | Passed browser checks; physical installation/safe areas not proven |
| 03 Exercise catalog | All 10 group routes and all 50 exercise routes; counts, navigation; invalid group/exercise combinations | All 60 valid routes HTTP 200; invalid routes 404 |
| 04 Muscle map | Map accessible labels on all 50 exercise screens; visual/source review; polygon/catalog tests; dashboard heat map | No concrete rendering defect found; not an anatomical expert review |
| 05 Exercise level | Locked/calibrated states; empty/negative/zero/over-max weight validation; Adjust; reload persistence | Normal flow passed; QA-01, QA-03 |
| 06 Round flow | Compound 02:00 and isolation 01:00; timer reaching zero; Cancel; below-target saves; 12-rep reward; reduced motion | Normal flow passed; QA-03, QA-04; physical sleep/vibration/wake lock unverified |
| 07 Auth | Protected-route redirects; email-code sign-in; separate accounts; profile sign-out; auth page rendering | Sign-in/out passed; sign-up challenge and offline-session observation above; OAuth not completed |
| 08 Prisma | Production build/client generation; migration status; real persistence and separate-browser reads; database integration suite | Two migrations applied; database up to date; warnings recorded |
| 09 Exercise actions | Validation, ownership, concurrency, stale-level rejection, replay, calibration/adjust/log/Undo | Suite passed; additional browser cases found QA-01 and QA-02 |
| 10 Wire exercise screen | Full calibration/log/history flow, offline errors, cross-context persistence, stale level, Undo | QA-01/02/04; clean lost-response Save retry retained exactly one 9-rep set |
| 11 Workout session | Automatic manual session; banner; grouped sets/totals; offline Finish error and retry; summary; foreign summary 404 | Passed; stale/empty/concurrent cases covered by integration suite |
| 12 Dashboard | Empty state and isolation; populated totals after manual/planned workouts; recent summary links; power/unlocked/heat state | Observed 1 power level, 2/50 unlocked and 12.4 t after the manual workout; derived-query tests passed |
| 13 Generate sheet | Defaults 60/Auto; selected-option retap; 30-minute selection; modal Escape/focus return; width/scroll checks | Selection retained; no horizontal overflow at 320/360/768/1280 px; settled modal fits viewport |
| 14 AI generator | Live Auto with history; output/catalog/focus checks; provider/schema unit tests; daily limit fixture | Pull plan returned in 5.6 s; 10-attempt limit returned inline error and stayed at 10 attempts; GAP-01 |
| 15 Wire AI workout | Offline Generate and Regenerate; retained preview; Start; all eight planned sets; completion markers; Finish and named summary | Complete flow passed; persisted 8 sets / 1.6 t; malformed/ownership/concurrent-start cases covered in integration tests; GAP-02 |

Automated verification run during this audit:

```text
npm test                     39 tests passed
npm run test:integration      38 PostgreSQL integration checks passed
npm run lint                 passed
npm run build                passed (including TypeScript)
npx prisma migrate status    database schema up to date
```

The generated workout used Lat Pulldown 3 sets, Seated Cable Row 3 sets, Face Pull 2 sets. Each set was logged through the UI at 20 kg × 10. The checklist reached 3/3, 3/3, 2/2 and the summary preserved `Pull Session` / `Pull`. Screenshots: `.playwright-mcp/audit-ai-preview.png`, `.playwright-mcp/audit-plan-complete.png`.

## Limits and cleanup

- Browser coverage uses Chromium with touch/mobile viewport emulation and a desktop context. It is not a physical-phone test, Safari/WebKit test, or installed-PWA test.
- Physical keyboard resizing, notches/safe areas, screen locking/wake lock, haptics, iOS installed-app OAuth, and actual email delivery remain unverified.
- The audit generated one fresh live Auto plan. All focus rules also have source/unit/integration coverage; prior spec-15 work recorded live testing of all six choices, but that is not claimed as six new live calls in this audit.
- Daily-quota enforcement was verified by a scoped fixture, the UI error, and unchanged attempt count. No upstream network trace was captured; source flow returns before the OpenAI call when quota is exhausted.
- Browser tests used the development server. Production compilation passed; deployed production behavior was not tested. Vercel deployment remains deferred.
- Both disposable Clerk users and all their SetLog, WorkoutSession, ExerciseProgress and PlanGeneration rows were deleted. Test browser contexts were closed; the original user context/tabs were preserved.
- Screenshots and helper scripts are local ignored evidence under `.playwright-mcp/`, not committed report attachments. They contain no intentionally recorded credentials.
- Existing unrelated deletion of `context/feature-specs/09-15-review.md` was left untouched.

Recommended order: QA-01 and QA-02 first (training data integrity), QA-03 next (progression boundary), then QA-04/05. Resolve the product rules for the two validation gaps and reproduce the auth/transport observations independently.
