Add the database: Prisma 7 on PostgreSQL, the three models, the client singleton and the first migration. No Server Actions, no queries, no UI changes.

## Setup

- Any PostgreSQL works: Neon, Supabase, Prisma Postgres or a local instance. Put the connection string in `.env.local` as `DATABASE_URL` and add the name to `.env.example`.
- Use a direct (non-pooled) connection string, because migrations don't work through a pooler. For Prisma Postgres, use the direct `postgres://` string, not the `prisma+postgres://` one.
- Pin to Prisma 7. npm's `latest` tag for `prisma` currently points to an 8.0 release candidate:
  - `npm i -D prisma@7`
  - `npm i @prisma/client@7 @prisma/adapter-pg@7 pg`
- Follow the Prisma 7 docs for Next.js:
  - `prisma.config.ts` at the root with the schema path, the migrations path and the datasource URL
  - load `.env.local` there with Node's built-in `process.loadEnvFile('.env.local')`, only when the file exists, so we don't need `dotenv`
  - pass the URL as `process.env.DATABASE_URL ?? ''`, not with the throwing `env()` helper, so `prisma generate` also works where the variable isn't set (fresh clone, CI)
  - the `@prisma/adapter-pg` driver adapter
- Add `/lib/generated/` to `.gitignore`, and `lib/generated/**` to the `globalIgnores` in `eslint.config.mjs`.
- Scripts in `package.json`:
  - `"postinstall": "prisma generate"`, so every install regenerates the client
  - `"vercel-build": "prisma migrate deploy && next build"`, so deployments apply migrations (Vercel runs `vercel-build` instead of `build` when it exists)

## Schema

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../lib/generated/prisma"
}

datasource db {
  provider = "postgresql" // the URL comes from prisma.config.ts in Prisma 7
}

model ExerciseProgress {
  id            String   @id @default(cuid())
  userId        String   // Clerk user ID
  exerciseId    String   // ID from lib/catalog.ts
  level         Int      @default(1)
  weightKg      Float
  stepKg        Float
  startWeightKg Float
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([userId, exerciseId])
}

model WorkoutSession {
  id        String    @id @default(cuid())
  userId    String
  startedAt DateTime  @default(now())
  endedAt   DateTime?
  sets      SetLog[]

  @@index([userId, startedAt])
}

model SetLog {
  id         String         @id @default(cuid())
  userId     String
  sessionId  String
  session    WorkoutSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  exerciseId String
  level      Int            // level attempted in this round
  weightKg   Float
  reps       Int
  leveledUp  Boolean        @default(false)
  createdAt  DateTime       @default(now())

  @@index([userId, createdAt])
  @@index([userId, exerciseId, createdAt])
  @@index([sessionId])
}
```

Don't add fields that aren't listed. `focus` and `plan` on `WorkoutSession` come with spec 14.

## Client

Create `lib/prisma.ts`:

- one `PrismaClient` using the `PrismaPg` adapter with `DATABASE_URL`
- cached on `globalThis` outside production, so hot reload doesn't open new connections
- imported from the generated client path

## Migration

1. `npx prisma generate` (Prisma 7's `migrate dev` no longer generates the client)
2. `npx prisma migrate dev --name init`

## Scope Limits

- no Server Actions, no queries, no UI changes
- no seed data (the catalog lives in code)
- no User table and no relation to Clerk beyond the `userId` string

## Check When Done

- `npx prisma migrate status` reports the database is up to date with the `init` migration
- the migration SQL has the unique `(userId, exerciseId)` constraint, the three `SetLog` indexes and `ON DELETE CASCADE` on `SetLog.sessionId`
- `lib/prisma.ts` exports a single cached instance
- deleting `lib/generated/` and running `npm install` without `DATABASE_URL` set regenerates the client
- `npm run lint` doesn't scan `lib/generated/`
- `npm run lint` and `npm run build` pass
- `progress-tracker.md` updated
