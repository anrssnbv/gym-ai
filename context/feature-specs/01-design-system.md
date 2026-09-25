Read `AGENTS.md` and every file in `context/` before starting.

We're adding the design system: shadcn/ui, the dark "arcade gym" theme tokens, fonts and icons. No real screens yet.

## shadcn/ui

Initialize with Radix primitives (shadcn 4.21 defaults to Base UI, which uses `render` instead of `asChild`):

```bash
npx shadcn@4.21.0 init -b radix
```

After init, check that `components.json` has `"iconLibrary": "lucide"` and that `app/layout.tsx` still loads Geist Sans and Geist Mono. Revert anything else the init changed in the layout.

Add these components with the same CLI version:

- Button
- Card
- Badge
- Progress
- Sheet
- Input
- Label

Do not modify the generated `components/ui/*` files after installation. Keep the `cn()` helper in `lib/utils.ts` that the CLI creates.

## Theme Tokens

Edit the generated `app/globals.css` in place. Keep the imports and the `@layer base` block the CLI added.

- Remove the create-next-app leftovers: the `prefers-color-scheme` block and the Arial body font.
- Define every CSS variable from the Colors table in `context/ui-context.md` in `:root`.
- Map all of them in `@theme inline` so every Tailwind name in that table works (`bg-page` … `fill-muscle-3`).
- Point shadcn's color variables at ours, in `:root`:

  | shadcn variable                                   | Our variable                |
  | ------------------------------------------------- | --------------------------- |
  | `--background`                                    | `--bg-page`                 |
  | `--card`                                          | `--bg-surface`              |
  | `--popover`                                       | `--bg-elevated`             |
  | `--secondary`, `--muted`, `--accent`              | `--bg-subtle`               |
  | `--foreground` and every other `--*-foreground`   | `--text-primary`            |
  | `--muted-foreground`                              | `--text-muted`              |
  | `--primary`, `--ring`                             | `--accent-primary`          |
  | `--primary-foreground`                            | `--accent-primary-contrast` |
  | `--destructive`                                   | `--state-error`             |
  | `--border`, `--input`                             | `--border-default`          |

  Map any other color variables the CLI generated (charts, sidebar) the same way. Leave `--radius` at the CLI default.
- Dark only, whatever the phone's system theme is:
  - keep the CLI's `@custom-variant dark (&:is(.dark *));`
  - delete the CLI's `.dark { … }` block (the values in `:root` are already dark)
  - add `className="dark"` to `<html>` in `app/layout.tsx` and `color-scheme: dark` on `:root`
- `body` uses the page background, primary text color, `font-sans` and `antialiased`.
- Add one reduced-motion rule that also covers library animations:

  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```

## Fonts

In `app/layout.tsx`:

- keep Geist Sans (`--font-geist-sans`) and Geist Mono (`--font-geist-mono`)
- add Oxanium from `next/font/google` as `--font-display`, weights 500–700
- expose it in `@theme inline` so `font-display` works
- keep `lang="en"`; set `metadata.title` to `Gym AI` and `metadata.description` to `Level up every lift.`

## Icons

`lucide-react` (the shadcn init normally installs it; install it if not).

## Token Preview

Replace `app/page.tsx` with a temporary preview of the theme: the four surfaces, the three text colors, a primary and a secondary Button, a Badge, a Progress at 75 %, `LV 7` in `font-display text-level`, a Sheet opened from a button (`side="bottom"`), and an Input with a Label. Spec 02 deletes this page.

## Scope Limits

- no navigation, no real screens
- don't add components beyond the list above
- no hex values outside `globals.css`

## Check When Done

- all listed components import and render without errors
- the preview looks the same with the OS in light mode and in dark mode (check with DevTools "Emulate prefers-color-scheme")
- the Sheet and the Input render dark, with no default shadcn light colors
- `font-display` renders Oxanium and `font-mono` renders Geist Mono
- no horizontal scroll at 360 px
- `npm run lint` and `npm run build` pass
- `progress-tracker.md` updated
