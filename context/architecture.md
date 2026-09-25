# Architecture Context

## Stack

| Layer      | Technology                                      | Role                                                |
| ---------- | ----------------------------------------------- | --------------------------------------------------- |
| Framework  | Next.js 16 (App Router) + React 19 + TypeScript | Pages, Server Components, Server Actions            |
| UI         | Tailwind CSS v4 + shadcn/ui (Radix) + lucide    | Mobile-first components and styling                 |
| Auth       | Clerk (`@clerk/nextjs`)                         | Sign-in, sessions                                   |
| Database   | Prisma 7 + PostgreSQL                           | Training profiles, progress, sessions, set logs and generation attempts |
| AI         | OpenAI (official `openai` SDK)                  | Structured workout plan generation                  |
| Validation | Zod                                             | Server Action input and AI output parsing           |
| PWA        | Next.js `app/manifest.ts`                       | Installable, standalone display (no service worker) |

Not used, on purpose (ghost-ai needed them, gym-ai doesn't):

- **Liveblocks**: single user, no real-time collaboration.
- **Trigger.dev**: the only long call is one AI request of a few seconds, which fits in a Server Action.
- **Vercel Blob**: nothing large to store; the AI plan is a small JSON column.
- **REST API routes**: Server Actions and Server Components cover every read and write.

## System Boundaries

- `app/` — routes only: layouts, pages, loading/error states, `manifest.ts`, icons. Pages are Server Components that read through `lib/queries.ts`.
- `app/(app)/` — the signed-in, profile-gated mobile shell (top bar + bottom tabs): Home `/`, Exercises `/exercises/...`, Workout `/workout`, Training preferences `/settings/training`.
- `app/onboarding/` — authenticated four-step training survey outside the shell. Missing or malformed profiles enter here; completed profiles redirect Home.
- `app/sign-in`, `app/sign-up` — Clerk pages, outside the shell.
- `actions/` — Server Actions. The only code that writes to the database or calls OpenAI.
- `lib/catalog.ts` — static exercise catalog: muscle groups, heads, exercises with movement patterns. Source of truth for exercise IDs.
- `lib/game.ts` — pure game rules: target reps, round length, level-up, session staleness, power level, rank, number formatting. No I/O, no runtime imports.
- `lib/plan.ts` — pure planning rules, safe for the client: foci, durations, `WorkoutPlan`, equipment-filtered candidates, schedule-aware Auto, experience limits, duration estimates, and the daily AI limit. Runtime imports are local catalog/game helpers.
- `lib/training-profile.ts` — client-safe profile types, choices and labels; `lib/training-profile-schema.ts` holds strict server validation and canonical equipment ordering.
- `lib/plan-schema.ts` — server-only Zod schemas for the AI output and stored plans, kept separate so Zod never ships to the phone.
- `lib/auth.ts` — `requireUserId()`: the one way queries and actions get the current user.
- `lib/queries.ts` — read helpers, always scoped by `userId`.
- `lib/prisma.ts` — Prisma client singleton.
- `lib/ai.ts` — OpenAI client, workout plan schema, prompt building.
- `components/ui/` — shadcn-generated components.
- `components/<feature>/` — app components: `app-shell`, `muscle-map`, `exercise`, `workout`, `dashboard`.
- `prisma/` — schema and migrations.
- `proxy.ts` — runs Clerk's middleware (Next 16 name for middleware).

## Storage Model

- **PostgreSQL (Prisma)**: user state only.
  - `ExerciseProgress` — one row per user + exercise: level, current weight, step, start weight.
  - `WorkoutSession` — start and end time. Spec 14 adds the AI plan JSON, including its resolved focus; no duplicate focus column.
  - `SetLog` — every logged round: exercise, level attempted, weight, reps, leveled-up flag.
  - `PlanGeneration` — one row per AI generation attempt, for the daily limit (spec 14).
  - `TrainingProfile` — one row keyed by Clerk `userId`: goal, experience, days per week, session minutes, equipment, and timestamps. A complete valid row means onboarding is finished; no local identity or duplicate completion/weekly-hours fields.
- **Code (`lib/catalog.ts`)**: exercises, muscle groups, heads. Database rows reference exercises by string ID.
- **Clerk**: identity and account management. Training preferences live in PostgreSQL. No local User table; every `userId` column holds the Clerk user ID.
- **Browser**: nothing required. Timer and unsaved survey state live in component state; reloading discards unsaved answers.

## Derived Values

Computed from rows when read, never stored:

- **Best reps at the current level**: the max `reps` of the user's `SetLog` rows for that exercise where `level` = current level and `weightKg` = current weight; 0 if there are none.
- **Power level**: sum of (`level` − 1) over the user's `ExerciseProgress` rows. **Group power**: the same sum per muscle group.
- **Volume**: sum of `weightKg × reps`.
- **Session end**: `endedAt`; for an open session whose last activity is more than 3 hours old, its last activity time.

## Auth and Access Model

- `proxy.ts` runs `clerkMiddleware()` so `auth()` works everywhere. It doesn't decide access: Clerk has deprecated path-matching checks (`createRouteMatcher`) in favour of checks next to the data.
- `app/(app)/layout.tsx` calls `auth.protect()`, then checks the owned training profile before rendering the shell. Signed-out visitors go to Clerk; missing/invalid profiles go to `/onboarding`. Profile read outages reach Retry/Sign out error UI.
- `/onboarding` checks authentication separately. Its save action atomically upserts all answers and revalidates the root layout. Confirmed saves return Home; settings reuse the form. Profile checks do not live in middleware or `requireUserId()`.
- Every query and Server Action gets the user through `requireUserId()` and filters by it. That is the real access check.
- Public: `/sign-in`, `/sign-up`, the manifest and the icons.
- Data has a single owner. No sharing between users.

## Workout Session Model

- The active session is the user's latest `WorkoutSession` with `endedAt = null` whose last activity (its latest set, otherwise `startedAt`) is no more than 3 hours old.
- Logging a set attaches it to the active session. If there is none, a stale open session is first closed at its last activity time, then a new session is created. This happens inside the action; there are no cron jobs.
- **Finish workout** sets `endedAt = now`, or the last activity time if the session is already stale. With no sets, last activity is `startedAt`; stale zero-set sessions have zero duration and all zero-set sessions are excluded from stats.
- `findOpenSession` centralizes open-session lookup; every reader/writer uses the same staleness rules. The banner rechecks expiry while mounted and on visibility changes.
- Starting an AI workout attaches the plan to the active session if there is one, otherwise it creates a new session. Session mutations use serializable transactions with bounded conflict retries so concurrent requests preserve this rule.
- Stats count only sessions with at least one set. Duration = session end − `startedAt`.
- One pure helper in `lib/game.ts` decides staleness and end time, so every read and write uses the same 3-hour rule.

## Level Changes

- **Log set**: a round ID makes retries idempotent. The transaction checks the captured level, weight and step before writing; a mismatch returns a stale error without logging at another screen's weight.
- **Undo**: targets an exact owned set ID and requires it still be the newest set for that exercise. A missing target is harmless retry success. A level-up Undo restores the level and weight stored on that set; retry never deletes its neighbor.
- **Adjust**: changes `weightKg` and `stepKg`, never `level`.
- The new level and weight always come from `lib/game.ts`.
- Every catalog exercise has its own weight ceiling. A successful set whose next step exceeds it is saved without a level-up; reaching the ceiling exactly is allowed. Existing above-ceiling rows may retain their weight during a step-only edit.

## AI Generation Model

- Entry point: the `generateWorkout` Server Action.
- Auto is resolved before the AI call: 1–3 planned days selects Full body; 4–7 days selects push, pull or legs by oldest training (never trained = oldest; ties in that order). Explicit focus wins. The resolved focus is stored in the plan JSON.
- Candidates intersect profile equipment with focus patterns: push → push; pull → pull; legs → legs + core; upper → push + pull; full body → all. Fewer than three candidates or a missing profile returns an actionable error before quota reservation/API calls.
- Input: requested duration, resolved focus, filtered candidates, the five profile fields, and compact recent history. No Clerk IDs, names, emails, medical fields or body measurements are sent to OpenAI. Requested duration overrides preferred duration.
- Output: Structured Outputs with the same filtered IDs and experience limits used in local parsing. New/beginner users get at most four exercises and three sets each; regular/experienced users retain duration-based exercise limits and five sets. The minimum is three exercises. Calibration/new-exercise counts use eligible equipment only; duration estimates are checked after deduplication.
- The plan is only a preview until the user taps Start. Start attaches it to the active session, or creates a session.
- Start checks the current profile's equipment and experience limits inside its transaction before changing sessions. Profile changes that invalidate a preview require regeneration; goal/days/duration edits alone do not invalidate it. Stored and active plans use the profile-independent schema, never today's calibration count.
- The AI never produces weights, reps or level changes.
- Limit: 10 generations per user per rolling 24 h, counted in `PlanGeneration`. A row is written before each OpenAI call, because every call costs money.
- The model name lives in one constant in `lib/ai.ts`: `gpt-5.4-mini` (the newest small model in openai 7.23), fallback `gpt-5-mini`. The client is created inside the call, so a missing key never breaks the build.

## Invariants

### Training profile — spec 16

- Profile saving, the onboarding/edit UI, and existing AI integration are implemented and verified in that order. The additive migration leaves training tables unchanged.
- Initial onboarding always finishes at Home. Existing users without a profile complete the same survey once; saved data and active workouts remain intact.
- Manual Save/Undo/Finish do not require profile completion. Their normal revalidation can redirect an old tab after its committed mutation; unsaved round UI is not retained across that redirect.
- Generate sheets seed duration from the saved profile on mount. Explicit input survives background refresh, Regenerate and reopening the same mounted sheet.
- No new package, environment variable, provider, webhook, medical collection or weekly scheduling service was added.

### Current invariants

1. Only Server Actions mutate data. Every action gets the user from `requireUserId()` and validates its input with Zod before touching the database.
2. Every Prisma query is scoped by the current user's `userId`.
3. Exercise IDs in `lib/catalog.ts` are permanent. Never rename or delete one that may have rows; add new IDs instead.
4. Levels and weights change only through `lib/game.ts` rules, never in UI code and never from AI output.
5. AI output is parsed and validated before use; unknown exercise IDs are rejected.
6. Pages are Server Components by default. `"use client"` only for interactivity (timer, sheets, forms, navigation state).
7. Every screen works at 360 px wide.
