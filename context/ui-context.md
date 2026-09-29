# UI Context

## Direction A — Anatomy Studio

Spec 18 replaces the original arcade presentation. Dark charcoal surfaces, soft lime primary actions, neutral anatomical illustrations, readable Geist typography, and one dominant action per screen. The user approved detailed anatomical artwork after rejecting schematic SVG figures.

Colors live in `app/globals.css`; components use semantic Tailwind tokens. Clerk's supported shadcn theme consumes the same variables. The app stays dark regardless of the device theme.

| Role | CSS variable | Value | Tailwind |
| --- | --- | --- | --- |
| Page | `--bg-page` | `#101414` | `bg-page` |
| Surface | `--bg-surface` | `#1a2020` | `bg-surface` |
| Elevated sheet | `--bg-elevated` | `#222a29` | `bg-elevated` |
| Subtle | `--bg-subtle` | `#2b3532` | `bg-subtle` |
| Divider | `--border-default` | `#3a4843` | `border-line` |
| Input / strong border | `--border-strong` | `#788d81` | `border-line-strong` |
| Primary text | `--text-primary` | `#f4f7f5` | `text-copy` |
| Secondary text | `--text-secondary` | `#c7d1cb` | `text-copy-secondary` |
| Muted text | `--text-muted` | `#afbeb5` | `text-copy-muted` |
| Action / selected / progress | `--accent-primary` | `#c6f36b` | `bg-brand`, `text-brand` |
| Action tint | `--accent-primary-dim` | `rgba(198,243,107,0.1)` | `bg-brand-dim` |
| Text on primary | `--accent-primary-contrast` | `#16220d` | `text-on-brand` |
| Small reward label | `--accent-level` | `#d5c697` | `text-level` |
| AI attribution | `--accent-ai` | secondary text | `text-ai` |
| AI surface | `--accent-ai-dim` | subtle surface | `bg-ai-dim` |
| Error | `--state-error` | `#ff7380` | `text-danger` |
| Warning | `--state-warning` | `#fbbf24` | `text-warning` |
| Success | `--state-success` | `#34d399` | `text-success` |
| Body | `--body-base` | `#87948e` | `fill-body` |
| Idle muscle | `--muscle-idle` | `#a6b1ab` | `fill-muscle-idle` |
| Secondary / low activity | `--muscle-1` | `#849967` | `fill-muscle-1` |
| Medium activity | `--muscle-2` | `#a6c97a` | `fill-muscle-2` |
| Primary / high activity | `--muscle-3` | `#c6f36b` | `fill-muscle-3` |

## Typography and spacing

- Geist Sans for titles, body, weights and stats; the compatibility `font-display` alias resolves to Geist Sans. Geist Mono only for countdown digits. Numeric data uses `tabular-nums`.
- Page headings: 28 px, section headings: 20 px, primary content/input: 16 px, secondary copy: 14 px. Wrap long titles and action labels.
- Spacing scale: 4, 8, 12, 16, 24, 32 px. Phone gutters and card padding: 16 px. Cards: 16 px radius; controls: 12 px.
- Shared application button CSS overrides generated utility defaults for a 48 px minimum height and multiline labels. Inputs have a 48 px minimum. Do not hand-edit generated `components/ui` primitives to restyle individual screens.

## Layout and interaction

- Sticky opaque top bar, centered `max-w-md` content, fixed labelled Home / Exercises / Workout navigation. Active tab has a border, tint, and stronger label. Fixed elements respect safe-area insets.
- Desktop retains the centered mobile column. Reserve enough bottom padding to scroll every action above the tab bar.
- Home leads with Resume when active, otherwise Generate; recent sessions and statistics follow, with rank lower down. Suppress redundant shell banners on Home, workout pages, and exercise detail.
- Workout: capped planned completion, featured next exercise, quiet remaining/completed rows, separate additional sets. Finishing is secondary while planned exercises remain.
- Exercise: name/equipment, workout context, weight and set controls, expandable movement guide, independently expandable muscle details, history.
- Planned fractions count successfully saved sets. Labels: Start set 0/n, Next set x/n, Exercise done n/n. A failed save does not advance; Undo reverses completion. Manual sessions have no denominator.
- Preserve timer behavior: stop on successful logging; it is a set countdown, not a rest timer. Level-up feedback retains dismissal and focus restoration, with a small level label and no glow.
- Use existing keyboard-aware sheets for weight/reps. Inputs and their primary action scroll together above the visual keyboard. Generation preview has a sticky action region inside its scrolling sheet.
- Preference choices adapt their columns to available width and enlarged text. Preserve native radios/checkboxes and field validation.
- Empty, pending, errors, and completion use readable text; never communicate state with color alone. Keep visible focus and reduced-motion support.

## Anatomy and movement artwork

- Muscle maps: two shared shaded gray anatomical WebPs with registered SVG highlight regions; primary heads = 3, secondary = 1. Preserve natural body proportions and comparable upper-body framing. SVG filter/mask failures leave neutral space and usable target text. Small shoulder thumbnails show the primary side; full maps show front/back. Dashboard intensity still means recorded sets over seven days, not physiological recovery. See `muscle-map-artwork.md`.
- Movement guides: original reviewed flat anatomical raster illustrations, 960 × 1200 local WebP, at most 160 KB. Detailed connected body contours, identifiable equipment, lime primary and olive secondary muscles, no photographic skin or gym scenery.
- Two vertically stacked positions; HTML identifies Top: Start and Bottom: the exercise-specific second position, followed by setup, movement/return instructions, and a text/color muscle legend.
- Same shared demo on exercise detail and plan preview. Files load only on opening; instructions survive media failure. See `exercise-demo-artwork.md` for the per-exercise inventory.

## Components and icons

Reuse installed shadcn/Radix primitives and Lucide icons. Navigation/action icons normally 20–24 px, with 44 px minimum interactive targets; empty-state icons may be 32 px. AI buttons use the same lime primary treatment as other actions.
