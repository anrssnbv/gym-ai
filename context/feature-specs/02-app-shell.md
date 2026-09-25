We need the mobile app shell that frames every screen: the top bar, the bottom tab navigation, the route skeleton, and PWA installability. This is gym-ai's version of the "editor chrome". No data, no auth.

## Routes

Create a route group `app/(app)/` with a shared layout and three placeholder pages:

- `app/(app)/page.tsx` → `/` (Home)
- `app/(app)/exercises/page.tsx` → `/exercises`
- `app/(app)/workout/page.tsx` → `/workout`

Delete the token preview in `app/page.tsx` from spec 01.

Each placeholder shows its screen title (`font-display text-2xl`) and an empty state: an icon (`h-8 w-8 text-copy-muted`) and one line of text.

- Home (`House`): `Your progress will show up here.`
- Exercises (`Dumbbell`): `Muscle groups are coming next.`
- Workout (`Flame`): `No active workout.`

## App Layout

Create `app/(app)/layout.tsx` as a Server Component:

- `min-h-dvh bg-page`
- top bar, then `<main>` with the content column `mx-auto w-full max-w-md px-4`
- `<main>` bottom padding: `pb-[calc(5rem+env(safe-area-inset-bottom))]`, so the tab bar never covers content
- bottom tab bar

## Top Bar

Create `components/app-shell/top-bar.tsx`:

- sticky at the top, `bg-page/90` with backdrop blur, bottom `border-line` border
- outer element `pt-[env(safe-area-inset-top)]`: in the installed iOS app the status bar overlays the page
- inner row `h-14`, aligned to the same `max-w-md` column as the page
- left: `Gym AI` in `font-display`, linking to `/`
- right: an empty slot. The Clerk `UserButton` goes there in spec 07

## Bottom Tabs

Create `components/app-shell/bottom-nav.tsx` as a client component (it needs `usePathname`):

- fixed to the bottom, `bg-surface`, top `border-line` border
- outer element `pb-[env(safe-area-inset-bottom)]`; inner row `h-16` holds the tabs, so the home indicator doesn't eat into them
- three tabs, icon above label: Home (`House`, `/`), Exercises (`Dumbbell`, `/exercises`), Workout (`Flame`, `/workout`)
- active tab `text-brand`, inactive `text-copy-muted`
- Exercises stays active on nested routes (`/exercises/chest/...`); Home is active only on `/`
- each tab is a `Link` whose whole area is tappable (at least 44 px), with `aria-current="page"` on the active tab

## Viewport and PWA

In `app/layout.tsx`, export `viewport`:

- `themeColor: '#0a0a0f'` (the page background)
- `viewportFit: 'cover'`
- `interactiveWidget: 'resizes-content'`, so on Android the keyboard shrinks the layout instead of covering sheets
- don't set `maximumScale` or `userScalable` (zoom must keep working)

Add `appleWebApp: { capable: true, title: 'Gym AI', statusBarStyle: 'black-translucent' }` to the root `metadata`.

Create `app/manifest.ts` (read `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md` first):

- `id: '/'`, `name` and `short_name`: `Gym AI`
- `start_url: '/'`, `display: 'standalone'`, `orientation: 'portrait'`
- `background_color` and `theme_color`: `#0a0a0f`
- icons: `/icon-192.png` (192×192), `/icon-512.png` (512×512), and `/icon-512.png` again with `purpose: 'maskable'`

## Icons

- Create `public/icon.svg`: a simple mark (a dumbbell with an up chevron, or a bold `G`) in neon lime `#c6ff3d` on a full-bleed `#0a0a0f` square. Keep the mark inside the maskable safe zone, a centered circle with a diameter of 80 % of the icon.
- Generate `public/icon-192.png`, `public/icon-512.png` and `app/apple-icon.png` (180×180) from it with a one-off `node -e` command using `sharp`, which Next already installs. Don't add `sharp` to `package.json` and don't keep a script file.
- Copy the SVG to `app/icon.svg` so Next uses it as the favicon.
- Delete `app/favicon.ico` and the unused create-next-app SVGs in `public/` (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`).

## Scope Limits

- no auth, no data, no catalog content
- don't build the dashboard, exercise or workout UIs
- no service worker, no install button

## Check When Done

- `/`, `/exercises` and `/workout` render inside the shell and the active tab follows the URL
- at 360 × 640 nothing scrolls horizontally and the tab bar never hides content
- `/manifest.webmanifest` is served and all icons load
- Chrome DevTools → Application → Manifest shows no errors (warnings about missing screenshots are fine)
- (phone) installed to the home screen, the top bar clears the status bar and the tabs clear the home indicator
- `npm run lint` and `npm run build` pass
- `progress-tracker.md` updated
