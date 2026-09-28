# 17 — Exercise movement illustrations

Show users what an exercise is and how its movement looks before they start it. Add one exercise-specific, two-position illustration to every catalog exercise. Keep the existing muscle map: it answers **what the exercise trains**, while the new illustration answers **what to do**. This spec builds on the catalog, exercise detail screen, and workout generator preview; it adds no training rules or data storage.

**Status: implemented; physical-phone check pending.** All 50 local illustrations, the two entry points, and automated and desktop-mobile checks are complete. The installed iPhone legibility/scroll check remains a release follow-up.

## Existing behavior and user problem

- `lib/catalog.ts` contains 50 permanent exercise IDs, names, equipment types, and muscle metadata. It contains no movement images or instructions.
- `app/(app)/exercises/[groupId]/[exerciseId]/page.tsx` displays the name, equipment badge, muscle map, Targets, and the level/round controls. The muscle map shows targeted anatomy, not body position or machine use.
- `components/workout/plan-preview.tsx` lists generated exercises before Start, including a short AI form cue, but no demonstration. Active workout rows already link to the exercise detail page.
- A name such as **Hack Squat** and its muscle map do not show the machine, where to stand, or the movement. A user must be able to inspect it before accepting a plan and again from the exercise screen.

## Artwork and instruction contract

Add `public/exercise-demos/<exerciseId>.webp`, with exactly one unique asset for each current ID in `EXERCISES`. The file name uses the ID unchanged (for example, `public/exercise-demos/hack-squat.webp`). Each asset is a **static, portrait two-position illustration**: clearly labelled Start and a second key position in one image, arrows for the movement and return where needed, the person, and the exercise's actual equipment. Label the second position for that exercise (for example, `Lowered` for Hack Squat or `Raised` for a curl), rather than calling a mid-repetition position Finish. Use a consistent dark-compatible background and readable figure outline. The labels and arrows are visual aids; the same information must be available as HTML text. Compose for a 960 × 1200 source and legibility when shown at approximately 328 CSS pixels wide on a phone. Compress each file to at most 160 KB unless visual review shows an exception is needed and records it.

For Hack Squat, show a person in a **hack squat machine**, feet on its platform and torso against its back pad at the start and lowered positions, with the return movement explained in text. Do not substitute a free-weight back squat, leg press, or generic standing figure. For every other ID, verify the pictured equipment, grip or contact points, body orientation, and positions against that catalog entry. An image reused under a different exercise ID fails review even if the same muscles are trained.

Artwork must be created for this app or used under a license that permits its distribution. Add `context/exercise-demo-artwork.md` as a 50-row asset inventory: ID, source or creator, license/permission if external, and content-review result. Keep the images in the repository; do not hotlink a third-party image or request a generated image from OpenAI when a user opens the page. Any generated or adapted image is checked for plausible anatomy, equipment, hand/foot placement, and movement direction before release. The editor should reject an uncertain illustration rather than label it as an exercise it may not depict.

Create `lib/exercise-demos.ts` with:

```ts
type ExerciseDemo = {
  alt: string;
  secondPosition: string;
  setup: string;
  movement: string;
};

export const EXERCISE_DEMOS: Record<ExerciseId, ExerciseDemo> = { /* all catalog IDs */ };
export function exerciseDemoSrc(id: ExerciseId): string; // `/exercise-demos/${id}.webp`
```

Write short, exercise-specific English setup and movement sentences that agree with the two frames and explain the return when the picture shows only the outward phase. The `alt` describes the visible person, equipment, and two positions; it must not merely repeat the exercise name or say “exercise image.” For Hack Squat, the text identifies the back pad and foot platform, then describes bending and extending the knees with control. Avoid universal load, depth, pain, or injury claims. Do not copy AI plan cues into this static content. The typed record makes a new catalog ID require demo text at build time; the asset audit below requires its file.

## UI placement and interaction

Create `components/exercise/exercise-demo.tsx`, a small client component with `exerciseId: ExerciseId`. It uses the catalog name and `EXERCISE_DEMOS` to render a button labelled `Show how to do <exercise name>` (and `Hide…` when open). Set `type="button"`, a minimum 44 px touch height, a visible focus style, and `aria-expanded`/`aria-controls`. Only mount the image when opened, so a generated plan of 8–10 exercises does not download all its illustrations. Use the installed `next/image` with the local WebP source, its intrinsic 960 × 1200 size, `unoptimized`, and the reviewed `alt`; preserve aspect ratio with no horizontal scroll. Show `Start` and the exercise's `secondPosition` as nearby HTML labels and the `setup`/`movement` text below the picture. Keep text available when the image is slow or fails; show a concise `Illustration unavailable` state for a failed image request rather than a broken-image icon. Opening, closing, and loading media must not submit a form, start a round, change a workout, or call the AI.

Insert this component:

1. In `app/(app)/exercises/[groupId]/[exerciseId]/page.tsx`, directly after the exercise name/equipment row and before the muscle map. Its closed button is visible near the top of the page. The muscle map, Targets, Calibrate/Start round, timer, history, and back links continue to work.
2. In each row of `components/workout/plan-preview.tsx`, after the existing note. A user can inspect an unfamiliar proposed exercise before tapping Start, then close the illustration and continue reviewing the plan. Opening it scrolls within the existing Generate sheet; it neither dismisses the sheet nor clears the generated plan. The active-workout list keeps linking to the exercise detail page, so it needs no duplicated image grid.

Both entry points use the same static content and asset. The control defaults closed on each visit. No separate modal, autoplay, video player, exercise thumbnail in every list row, or additional request to the AI is needed.

## Authentication, loading, and failures

- The existing page and workout actions keep their authentication and ownership rules. The static demo files and text contain no user data and need no Server Action, API route, Prisma migration, or new environment variable.
- Unknown exercise IDs and mismatched group routes retain `notFound()`; never construct an image path from an unvalidated URL segment.
- The text and button render before the image downloads. A slow or failed image does not block the level controls, Start, logging, or the generated preview. Do not replace a missing illustration with the muscle map and call it a movement demo.
- Image requests use local static files. Cache them through normal asset delivery; no runtime provider dependency or user photo upload is introduced.

## Dependencies

- Already installed: Next.js `Image`, React, existing catalog and UI tokens.
- Install: none.
- Environment variables: none.
- This spec supersedes spec 03's original “no exercise images or videos” scope limit. It leaves the 50 IDs, muscle map, timer, calibration, workout planning, and history contracts intact.

## Scope limits

- Static two-position illustrations and two short text instructions only. Animation, narrated videos, personalized coaching, automatic form assessment, and replacement exercise suggestions are separate work.
- Do not change `components/ui/*`, applied migrations, catalog IDs, AI prompt or plan schema.
- Do not ship partial catalog coverage or generic placeholder art as a completed feature. If any image is inaccurate, correct that asset before release.

## Check when done

- A catalog-driven check confirms exactly one `EXERCISE_DEMOS` entry and one readable WebP file per current exercise ID, no orphan filenames, portrait dimensions, and the agreed size budget. The license/creator inventory covers the same 50 IDs.
- Review a contact sheet of **all 50** illustrations against catalog names and equipment. Inspect Hack Squat at full size, plus representative barbell, dumbbell, machine, cable, compound, and isolation examples for start/finish accuracy and readable labels. Correct mismatches before release.
- At 360 × 640, open Hack Squat from a generated plan preview and directly through `/exercises/quads/hack-squat`: the machine and both positions are identifiable, the text agrees, no horizontal scroll occurs, and the button remains reachable with the bottom tab bar. Verify a long generated plan loads no demo files before any demo is opened, then only the selected image is requested.
- Keyboard and screen reader checks cover the button name and expanded state, image alt, Start/Finish and instruction text, closing the view, and focus retention. Simulate an image failure: instructions and exercise actions still work.
- Exercise page back navigation, calibration, running round, Undo, preview Start/Regenerate and workout completion still work. Invalid exercise/group URLs still return 404. No plan, set, or calibration data changes when a demo is opened.
- Run focused catalog/media checks, `npm test`, `npm run lint`, and `npm run build`; update `progress-tracker.md` with implementation evidence. **(phone)** Verify image legibility and the Generate sheet's scroll behavior in the installed iPhone app.
