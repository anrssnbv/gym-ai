# UI Context

## Theme

Dark only, mobile first, "arcade gym". Near-black layered surfaces, one neon lime color for actions and progress, gold for levels and rewards, violet for anything the AI does. Big numbers, short labels, one primary action per screen.

All colors are CSS custom properties in `app/globals.css`, mapped to Tailwind with `@theme inline`. Components use the Tailwind names below, never hex values or raw palette classes. shadcn's own variables (`--background`, `--foreground`, `--card`, `--primary`, `--border`, `--ring`, …) are set to these values in `:root`; there is no `.dark` class switching.

The page background is called `page`, not `base`, because `text-base` is already Tailwind's 16 px font size.

## Colors

| Role                          | CSS variable                | Value                      | Tailwind name              |
| ----------------------------- | --------------------------- | -------------------------- | -------------------------- |
| Page background               | `--bg-page`                 | `#0a0a0f`                  | `bg-page`                  |
| Surface (cards, tab bar)      | `--bg-surface`              | `#12121a`                  | `bg-surface`               |
| Elevated (sheets, overlays)   | `--bg-elevated`             | `#1a1a24`                  | `bg-elevated`              |
| Subtle (chips, inputs)        | `--bg-subtle`               | `#232330`                  | `bg-subtle`                |
| Border                        | `--border-default`          | `#262633`                  | `border-line`              |
| Strong border                 | `--border-strong`           | `#3a3a4a`                  | `border-line-strong`       |
| Primary text                  | `--text-primary`            | `#f5f5f7`                  | `text-copy`                |
| Secondary text                | `--text-secondary`          | `#c2c2d0`                  | `text-copy-secondary`      |
| Muted text                    | `--text-muted`              | `#8a8a9c`                  | `text-copy-muted`          |
| Action / progress (neon lime) | `--accent-primary`          | `#c6ff3d`                  | `bg-brand`, `text-brand`   |
| Action dim                    | `--accent-primary-dim`      | `rgba(198, 255, 61, 0.12)` | `bg-brand-dim`             |
| Text on action color          | `--accent-primary-contrast` | `#0a0a0f`                  | `text-on-brand`            |
| Level / reward (gold)         | `--accent-level`            | `#ffb627`                  | `text-level`, `bg-level`   |
| AI coach (violet)             | `--accent-ai`               | `#8b7bff`                  | `text-ai`, `bg-ai`         |
| AI dim                        | `--accent-ai-dim`           | `rgba(139, 123, 255, 0.14)`| `bg-ai-dim`                |
| Error                         | `--state-error`             | `#ff5c6c`                  | `text-danger`, `bg-danger` |
| Warning                       | `--state-warning`           | `#fbbf24`                  | `text-warning`             |
| Success                       | `--state-success`           | `#34d399`                  | `text-success`             |
| Body parts (not muscles)      | `--body-base`               | `#1f1f2a`                  | `fill-body`                |
| Muscle, idle                  | `--muscle-idle`             | `#2e2e3e`                  | `fill-muscle-idle`         |
| Muscle, low                   | `--muscle-1`                | `rgba(198, 255, 61, 0.28)` | `fill-muscle-1`            |
| Muscle, mid                   | `--muscle-2`                | `rgba(198, 255, 61, 0.58)` | `fill-muscle-2`            |
| Muscle, high                  | `--muscle-3`                | `#c6ff3d`                  | `fill-muscle-3`            |

## Typography

| Role                       | Font       | CSS variable        |
| -------------------------- | ---------- | ------------------- |
| UI text                    | Geist Sans | `--font-geist-sans` |
| Numbers, levels, headings  | Oxanium    | `--font-display`    |
| Timer digits               | Geist Mono | `--font-geist-mono` |

All three are loaded with `next/font/google` in `app/layout.tsx`. Numbers use `tabular-nums`.

- Screen title: `font-display text-2xl`
- Big stat or weight: `font-display text-4xl`
- Body: `text-sm`; inputs: `text-base`

## Border Radius

| Context                        | Class                          |
| ------------------------------ | ------------------------------ |
| Buttons, inputs, chips         | `rounded-xl`                   |
| Cards                          | `rounded-2xl`                  |
| Bottom sheets / overlays       | `rounded-t-3xl` / `rounded-3xl`|

## Component Library

shadcn/ui on Tailwind v4 with Radix primitives (`-b radix`). Components live in `components/ui/` and are added with the shadcn CLI, never written by hand. Starting set: Button, Card, Badge, Progress, Sheet, Input, Label. A spec adds more only when it needs them.

The `<html>` element always has the `dark` class, so the `dark:` variants inside shadcn components are always on, whatever the phone's system theme is.

## Layout Patterns

- **App shell**: sticky top bar (a `h-14` row plus the top safe-area inset) with the app name on the left and the user button on the right. Fixed bottom tab bar (a `h-16` row plus the bottom safe-area inset) with Home, Exercises, Workout.
- **Content column**: `mx-auto w-full max-w-md px-4`, with bottom padding so the tab bar never covers content.
- **Desktop**: the same phone-width column, centered. No desktop-only layouts.
- **Forms and confirmations**: bottom `Sheet`, not centered dialogs. The full-width primary button sits directly under the inputs, not pinned to the bottom of the sheet, so it stays above the phone keyboard. The iOS number pad has no Enter key.
- **Lists**: full-width cards stacked with `gap-3`.
- **Heights**: `min-h-dvh`, never `100vh`. The viewport uses `viewport-fit=cover`, so every fixed bar pads itself with `env(safe-area-inset-*)`.

## Game Visuals

- **Level badge**: `LV 7` in `font-display text-level`.
- **Progress to 12**: `Progress` with the brand fill, labelled `9 / 12`.
- **Level-up**: full-screen overlay for about 1.5 s: `LEVEL 8` scales in with a gold glow, then the new weight. Vibrates with `navigator.vibrate` where supported. Motion only under `motion-safe:`.
- **Rank**: rank name with the power level, which counts levels cleared (e.g. `Bronze · 42`).
- **AI surfaces** (generate sheet, plan notes): `text-ai` / `bg-ai-dim` with the `Sparkles` icon.
- **Copy**: short and upbeat: "Level cleared!", "So close — 11 / 12", "Round 2". No fitness jargon without an explanation.

## Muscle Map

- Stylized low-poly body, front and back views, one region per muscle head.
- Region fill by intensity: idle / 1 / 2 / 3 (tokens above). Non-muscle parts use `fill-body`.
- Exercise views: primary heads = 3, secondary heads = 1.
- Heat map: sets in the last 7 days, bucketed to 1–3.
- 1 px stroke in the page background color separates regions.

## Icons

lucide-react, stroke icons only. `h-4 w-4` inline, `h-5 w-5` in buttons and the tab bar, `h-8 w-8` in empty states.

| Use            | Icon                 |
| -------------- | -------------------- |
| Home tab       | `House`              |
| Exercises tab  | `Dumbbell`           |
| Workout tab    | `Flame`              |
| AI             | `Sparkles`           |
| Level          | `Trophy`             |
| Level up       | `ChevronsUp`         |
| Round / timer  | `Timer`              |
| Start round    | `Play`               |
| Adjust         | `SlidersHorizontal`  |
| Locked         | `Lock`               |
| Back           | `ChevronLeft`        |
