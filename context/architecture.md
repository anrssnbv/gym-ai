# Architecture Context

## Stack

| Layer      | Technology                                      | Role                                                |
| ---------- | ----------------------------------------------- | --------------------------------------------------- |
| Framework  | Next.js 16 (App Router) + React 19 + TypeScript | Pages, Server Components, Server Actions            |
| UI         | Tailwind CSS v4 + shadcn/ui (Radix) + lucide    | Mobile-first components and styling                 |
| Auth       | Clerk (`@clerk/nextjs`)                         | Sign-in, sessions                                   |
| Database   | Prisma 7 + PostgreSQL                           | Exercise progress, workout sessions, set logs       |
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
- `app/(app)/` — the signed-in mobile shell (top bar + bottom tabs): Home `/`, Exercises `/exercises/...`, Workout `/workout`.
- `app/sign-in`, `app/sign-up` — Clerk pages, outside the shell.
- `actions/` — Server Actions. The only code that writes to the database or calls OpenAI.
- `lib/catalog.ts` — static exercise catalog: muscle groups, heads, exercises with movement patterns. Source of truth for exercise IDs.
- `lib/game.ts` — pure game rules: target reps, round length, level-up, session staleness, power level, rank. No I/O, no runtime imports.
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
  - `WorkoutSession` — start and end time. Spec 14 adds the resolved focus and the AI plan JSON.
  - `SetLog` — every logged round: exercise, level attempted, weight, reps, leveled-up flag.
- **Code (`lib/catalog.ts`)**: exercises, muscle groups, heads. Database rows reference exercises by string ID.
- **Clerk**: identity and profile. No local User table; every `userId` column holds the Clerk user ID.
- **Browser**: nothing required. Timer state lives in component state.

## Derived Values

Computed from rows when read, never stored:

- **Best reps at the current level**: the max `reps` of the user's `SetLog` rows for that exercise where `level` = current level and `weightKg` = current weight; 0 if there are none.
- **Power level**: sum of (`level` − 1) over the user's `ExerciseProgress` rows. **Group power**: the same sum per muscle group.
- **Volume**: sum of `weightKg × reps`.
- **Session end**: `endedAt`; for an open session whose last activity is more than 3 hours old, its last activity time.

## Auth and Access Model

- `proxy.ts` runs `clerkMiddleware()` so `auth()` works everywhere. It doesn't decide access: Clerk has deprecated path-matching checks (`createRouteMatcher`) in favour of checks next to the data.
- `app/(app)/layout.tsx` calls `auth.protect()`, so signed-out visitors are redirected to `/sign-in`.
- Every query and Server Action gets the user through `requireUserId()` and filters by it. That is the real access check.
- Public: `/sign-in`, `/sign-up`, the manifest and the icons.
- Data has a single owner. No sharing between users.

## Workout Session Model

- The active session is the user's latest `WorkoutSession` with `endedAt = null` whose last activity (its latest set, otherwise `startedAt`) is less than 3 hours old.
- Logging a set attaches it to the active session. If there is none, a stale open session is first closed at its last activity time, then a new session is created. This happens inside the action; there are no cron jobs.
- **Finish workout** sets `endedAt = now`, or the last activity time if the session is already stale.
- Starting an AI workout attaches the plan to the active session if there is one, otherwise it creates a new session.
- Stats count only sessions with at least one set. Duration = session end − `startedAt`.
- One pure helper in `lib/game.ts` decides staleness and end time, so every read and write uses the same 3-hour rule.

## Level Changes

- **Log set**: the action receives `expectedLevel`. Inside one transaction it inserts the `SetLog` and updates `ExerciseProgress` only `where level = expectedLevel`. On a mismatch it rolls back and returns `{ ok: false }`, so a double-tapped Save can't level up twice.
- **Undo**: deletes the most recent `SetLog` of that exercise. If it was a level-up, `level` and `weightKg` go back to the values stored on that set.
- **Adjust**: changes `weightKg` and `stepKg`, never `level`.
- The new level and weight always come from `lib/game.ts`.

## AI Generation Model

- Entry point: the `generateWorkout` Server Action.
- Auto is resolved in code before the AI call: push, pull or legs, whichever pattern was trained longest ago (never trained = oldest; ties in that order). The AI and the stored session get the resolved focus.
- Candidates: catalog exercises whose `pattern` belongs to the focus: push → push; pull → pull; legs → legs + core; upper → push + pull; full body → all.
- Input: duration, focus, candidates, and a compact history summary computed in code (last 3 sessions, days since each muscle group was trained, current levels). No names or emails are sent to OpenAI.
- Output: OpenAI Structured Outputs parsed with a Zod schema whose `exerciseId` is an enum of the candidate IDs, sets 1–5, exercise count limited by duration.
- The plan is only a preview until the user taps Start.
- The AI never produces weights, reps or level changes.
- The model name lives in one constant in `lib/ai.ts`: OpenAI's current small model that supports Structured Outputs (check the OpenAI docs when implementing).

## Invariants

1. Only Server Actions mutate data. Every action gets the user from `requireUserId()` and validates its input with Zod before touching the database.
2. Every Prisma query is scoped by the current user's `userId`.
3. Exercise IDs in `lib/catalog.ts` are permanent. Never rename or delete one that may have rows; add new IDs instead.
4. Levels and weights change only through `lib/game.ts` rules, never in UI code and never from AI output.
5. AI output is parsed and validated before use; unknown exercise IDs are rejected.
6. Pages are Server Components by default. `"use client"` only for interactivity (timer, sheets, forms, navigation state).
7. Every screen works at 360 px wide.
