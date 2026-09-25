Add the Generate workout sheet (the "create new session" dialog): duration and focus inputs, and a plan preview. UI only. The preview shows a hardcoded sample plan until spec 15 connects the AI from spec 14.

This is the original UI checkpoint: sample data and disabled Start below describe that checkpoint only. Spec 15 replaced them with live generation/Start. Spec 16 now requires `defaultDurationMin: TrainingProfile['sessionMinutes']`, supplied by Home and the empty Workout page, and adds a Training preferences link. Initialize duration once per mount; explicit choices survive Regenerate, reopening and background refresh. A new mount uses the current saved default.

## Plan Types

Create `lib/plan.ts`. Only a type-only import from `./catalog.ts`, so Node can test it later.

- `FOCUSES = ['push', 'pull', 'legs', 'upper', 'full_body'] as const` and `type Focus` (focus is stored inside the plan JSON; no Prisma enum)
- `type FocusChoice = Focus | 'auto'` and `FOCUS_CHOICES: FocusChoice[]` = auto first, then `FOCUSES`
- `FOCUS_LABELS: Record<FocusChoice, string>` — Auto, Push, Pull, Legs, Upper body, Full body
- `FOCUS_HINTS: Record<FocusChoice, string>`
  - auto: `Uses your weekly schedule and recent training.` (spec 16)
  - push: `Chest, shoulders, triceps.`
  - pull: `Back, biceps, rear delts.`
  - legs: `Quads, hamstrings, glutes, calves, abs.`
  - upper: `Push and pull together.`
  - full_body: `A bit of everything.`
- `DURATIONS_MIN = [30, 45, 60, 90] as const`
- `interface WorkoutPlan { focus: Focus; title: string; summary: string; exercises: { exerciseId: ExerciseId; sets: number; note: string }[] }` — spec 14 keeps this client-safe interface and checks its server Zod schema against it with `satisfies z.ZodType<WorkoutPlan>`

## Components

Add the shadcn toggle group: `npx shadcn@4.21.0 add toggle-group`.

### Plan Preview

Create `components/workout/plan-preview.tsx` (no hooks):

- props: `plan: WorkoutPlan`
- the title in `font-display text-xl`, a focus Badge (`bg-ai-dim text-ai`) and the summary in `text-copy-muted`
- a numbered list of exercises: name from the catalog, `{sets} × 12`, and the note in small `text-ai`; unknown IDs are skipped

### Generate Sheet

Create `components/workout/generate-sheet.tsx` (client):

- `children` is the trigger, so each page renders its own button
- bottom `Sheet`, `max-h-[90dvh]` with scrolling content, safe-area bottom padding like the other sheets
- title `Generate workout` with a `Sparkles` icon in `text-ai`
- **Duration**: single-select toggle group of 30 / 45 / 60 / 90 min; the original checkpoint default was 60, superseded by the required saved-profile default in spec 16.
- **Focus**: single-select toggle group laid out as a 2-column grid of the six `FOCUS_CHOICES`, default Auto. Under it, `FOCUS_HINTS` for the current choice in `text-copy-muted`.
- Both toggle groups are controlled. Ignore an empty `onValueChange` value when the selected item is tapped again; only accept members of `DURATIONS_MIN` / `FOCUS_CHOICES`. Keep the current selection and hint.
- `Generate` full-width button: `bg-ai text-on-brand` (dark text on violet has enough contrast), with a `Sparkles` icon
- after Generate, the sheet switches to `PlanPreview` of `SAMPLE_PLAN`, a hardcoded pull-day plan with 5–6 catalog exercises defined in this file. Summary: `Sample plan — the AI coach arrives in the next update.`
- under the preview: `Start workout` (disabled until spec 15) and `Change inputs` (back to the form, keeping the selections)

## Placement

- Home (`app/(app)/page.tsx`): a full-width `Generate workout` button (`Sparkles`, `bg-ai text-on-brand`, `h-11`) between the power card and the stats
- Workout empty state: the same button above `Browse exercises`

## Scope Limits

- no Server Action, no AI call, no persistence (specs 14 and 15)
- don't change the dashboard numbers or the workout screens beyond adding the button

## Check When Done

- The sheet opens from Home and the empty Workout tab with the saved profile's session duration and Auto. A 30-minute explicit choice overrides a 90-minute preference and survives Regenerate/reopening.
- toggle groups work by touch and keyboard; screen readers announce selection; tapping the selected item never clears it or sends an empty value
- Generate shows the sample preview with catalog names; Change inputs returns with the choices kept
- no horizontal scroll at 360 px; the sheet scrolls when the preview is taller than the screen
- `npm run lint` and `npm run build` pass
- `progress-tracker.md` updated
