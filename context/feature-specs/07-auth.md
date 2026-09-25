Wire Clerk into the app: provider, sign-in and sign-up pages, access checks and the user button. Before starting, the user creates a Clerk application with email code as the main sign-in method (Google is optional, see the checks) and puts its keys in `.env.local`.

## Setup

Install `@clerk/nextjs` and `@clerk/ui`, and follow the current Clerk quickstart for the Next.js App Router.

Env vars in `.env.local` (never committed):

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`

Create `.env.example` with the two key names left empty and the two URL variables with their values (they aren't secret). Add `!.env.example` to `.gitignore`, because the existing `.env*` rule would ignore it.

## Provider and Theme

- Wrap the root layout in `ClerkProvider` with Clerk's `shadcn` theme from `@clerk/ui/themes` (`appearance={{ theme: shadcn }}`), plus the CSS import Clerk's docs require for that theme.
- That theme reads shadcn's CSS variables (`--primary`, `--card`, `--foreground`, …), which spec 01 already points at our tokens, so there is no manual color mapping and no hardcoded colors.

## Access Checks

Clerk 7.9 deprecates path matching in middleware (`createRouteMatcher`). Auth checks live next to the protected content instead.

- `proxy.ts` at the project root (not `middleware.ts`): `export default clerkMiddleware()` with Clerk's recommended `matcher`. It protects nothing by itself; it makes `auth()` available. The matcher already skips static files, so `/manifest.webmanifest` and the icons stay public.
- `app/(app)/layout.tsx`: call `await auth.protect()` first. Signed-out visitors are redirected to `/sign-in`.
- Spec 16 then loads the authenticated user's training profile before rendering the shell. Missing/malformed profiles redirect to `/onboarding`; read failures offer Retry and Sign out. Onboarding is authenticated but outside `(app)`, with no bottom tabs/banner. Keep profile checks out of middleware and `requireUserId()`.
- The sign-in and sign-up pages live outside `(app)`, so they stay public.
- From spec 09 on, every query and action also checks with `requireUserId()` (see `architecture.md`).

## Auth Pages

Create `app/sign-in/[[...sign-in]]/page.tsx` and `app/sign-up/[[...sign-up]]/page.tsx` outside the `(app)` group, so there are no tabs:

- one centered column, mobile first, with `pt-[env(safe-area-inset-top)]`: the app icon, `Gym AI` in `font-display`, the tagline `Level up every lift.`, then the Clerk `SignIn` / `SignUp` component
- under the tagline, three short muted lines: `Calibrate once.` `Hit 12 reps.` `Level up.`
- no hero images, no gradients, no feature cards
- the same column centered on desktop

## User Button

- Put Clerk's `UserButton` in the right slot of the top bar (spec 02).
- Keep Clerk's default menu and profile flows. Don't rebuild Clerk internals.

## Dependencies

- Install: `@clerk/nextjs`, `@clerk/ui`
- Env: the four variables above

## Scope Limits

- No local identity/User table. Spec 16 adds a separate owned `TrainingProfile` table for training preferences.
- Clerk account-management screens stay unchanged; spec 16 adds `/onboarding` and `/settings/training` for training preferences.
- no roles or permissions
- don't use `createRouteMatcher`

## Check When Done

- signed out, `/`, `/exercises/chest` and `/workout` redirect to `/sign-in`
- Signing up reaches onboarding before Home; completing the survey always goes to `/`. Saved profiles preserve normal sign-in return URLs without repeating the survey. Signing out returns to `/sign-in`.
- `/manifest.webmanifest` and the icons load while signed out
- the auth pages match the app theme, have no hardcoded colors, and fit 360 px without horizontal scroll
- `.env.example` exists and is not ignored by git
- no Clerk deprecation warnings in the dev server log
- (phone) email-code sign-in works in the installed app. If Google is enabled, test it in the installed iOS app too; if it fails there, keep email code as the main method.
- `npm run lint` and `npm run build` pass
- `progress-tracker.md` updated
