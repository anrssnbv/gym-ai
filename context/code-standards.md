# Code Standards

## General

- Keep modules small and single-purpose.
- Fix root causes; don't layer workarounds.
- Respect the boundaries in `architecture.md`.
- No speculative abstractions: no wrapper, factory, hook or config for a single use.
- File names describe what they contain, in kebab-case (`weight-sheet.tsx`, `queries.ts`).

## TypeScript

- Strict mode is on and stays on. No `any`.
- `interface` for object shapes; string-literal unions for IDs (`MuscleHeadId`, `ExerciseId`).
- Derive types from `as const` data instead of repeating them.
- Type-only imports use `import type`. Node's type stripping (used by the tests) treats a plain `import { SomeType }` as a runtime import and fails.
- No TypeScript `enum` or `namespace` in `lib/` files; type stripping doesn't support them.
- Validate external input with Zod at the boundaries: Server Action arguments, AI output, and JSON read from the database.

## Next.js 16

- Read the matching guide in `node_modules/next/dist/docs/` before using an API (see `AGENTS.md`).
- `proxy.ts` replaces `middleware.ts`.
- `params` and `searchParams` are Promises: `const { exerciseId } = await params`.
- Server Components by default. Put `"use client"` on the smallest leaf that needs state or effects.
- Unknown group or exercise IDs call `notFound()`.
- Don't enable `cacheComponents`: every page is per-user and dynamic.

## Components

- shadcn/ui is initialized with Radix (`-b radix`). Compose with `asChild`, not `render`.
- Don't edit `components/ui/*`; style from app components through `className`.

## Server Actions

- Files live in `actions/` with `"use server"` at the top.
- Fixed order: `requireUserId()` → Zod parse → query scoped by `userId` → write → `revalidatePath` → return.
- Actions the UI reacts to return `{ ok: true, data }` or `{ ok: false, error }`. Expected validation errors are returned, not thrown.
- Game math comes from `lib/game.ts`; actions don't compute levels themselves.
- Writes that must stay consistent (log a set + level up, undo) run in one `prisma.$transaction`.
- Submit buttons are disabled while their action is pending.

## Styling

- Tailwind utilities built on the tokens in `app/globals.css` (see `ui-context.md`). No hex values and no raw palette classes (`zinc-*`, `lime-*`) in components.
  - Exception: `viewport.themeColor`, `app/manifest.ts` and `public/icon.svg` need literal hex values; copy them from `ui-context.md`.
- Mobile first: base classes target phones; `sm:` and up only for optional widening.
- Tap targets are at least 44 px (`h-11`).
- Inputs use `text-base` (16 px) so iOS doesn't zoom on focus.
- Our own animations only behind `motion-safe:`. One `prefers-reduced-motion` rule in `globals.css` also turns off library animations (e.g. the Sheet slide).

## Data

- Weights are in kg, stored as `Float` and rounded with `roundKg()` (2 decimals) before saving and before comparing.
- Timestamps are stored in UTC. Dates and times are formatted only in client components, so they use the browser's timezone.
- Time windows are rolling ("last 7 days"), never calendar weeks, so the server needs no user timezone.
- Derived numbers (best reps, power level, totals, volume) are computed from rows, not stored. See Derived Values in `architecture.md`.

## Tests

- Pure logic (`lib/game.ts`, `lib/catalog.ts`, later stats math) gets a `*.test.ts` file next to it using `node:test` and `node:assert`, run with `npm test`.
- Node 24 runs `.ts` files natively (type stripping). Test files import with the `.ts` extension, and files under test have no runtime imports that use the `@/` alias.
- No test framework is added unless a spec asks for one.

## File Organization

- `app/` — routes, layouts, `manifest.ts`, icons
- `actions/` — Server Actions (the only write path)
- `components/ui/` — shadcn, generated
- `components/<feature>/` — app components grouped by feature
- `lib/` — catalog, game rules, auth helper, queries, Prisma client, AI helper, `cn()`
- `prisma/` — schema and migrations
- `public/` — static icons
