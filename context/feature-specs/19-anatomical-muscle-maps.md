# 19 — Detailed anatomical muscle maps

**Status: specified; implementation not started.**
**Date:** 2026-09-29.

Replace the geometric muscle maps with naturally proportioned, shaded anatomical figures matching the approved exercise movement illustrations from Spec 18. Prioritize the Exercises menu and exercise lists; preserve the shared map's existing target and activity highlighting.

## Problem and current implementation

The user reports that the chest looks excessively wide, the back looks short, and the maps look flat compared with the detailed “How to do” illustrations.

`components/muscle-map/body-paths.ts` contains mirrored polygon geometry. `GROUP_FOCUS` in `muscle-map.tsx` uses different tight crops for each muscle group. Together, the schematic shapes and inconsistent framing produce the reported visual mismatch. The current SVG already preserves aspect ratio; changing CSS width alone will not replace the underlying drawing style.

The shared `MuscleMap` currently appears in:

- `/exercises`: ten muscle-group cards, highlighting every head in the group.
- `/exercises/[groupId]`: exercise thumbnails, highlighting that exercise's primary and secondary heads.
- `/exercises/[groupId]/[exerciseId]`: expandable “Muscles worked,” showing front and back.
- Home: front/back activity map for the last seven days.

## Visual contract

- Match the approved Hack Squat, Bench Press, and Cable Curl artwork: detailed neutral-gray anatomy, connected contours, restrained shading that conveys depth, charcoal surroundings, lime primary regions and muted olive secondary regions.
- Use one consistent adult anatomical figure in neutral front and rear poses. Keep the same body proportions, scale, lighting and level of detail across both views. Arms should sit slightly away from the torso so targets remain readable.
- Give the chest, shoulders, waist, back and legs natural relative proportions. Show enough surrounding anatomy to locate each highlighted region. Avoid an isolated stretched chest or a compressed back fragment.
- Use static artwork with a three-dimensional appearance. No interactive 3D viewer, rotation controls, animation, equipment or exercise poses in the muscle map.
- Keep the existing movement illustrations intact. Use them as visual references, rather than cropping a person out of a machine or exercise pose.
- Do not bake muscle labels, legends or highlights into the neutral base figures. Names and intensity continue to come from the catalog and caller.
- The catalog's muscle-head divisions are explanatory regions, including simplified views of deeper structures; do not present them as a diagnostic anatomical scan.

## Asset and rendering approach

Reuse the existing `MuscleMap` component and its callers. Use two detailed neutral base illustrations plus aligned, individually addressable highlight regions. This supports all exercises and activity combinations without generating a separate image for every combination.

1. Create `public/muscle-maps/front.webp` and `back.webp`: matching portrait canvases, 960 × 1920, at most 160 KiB each. Keep an identical charcoal background and consistent margins; record creator, sources and review in `context/muscle-map-artwork.md`.
2. Replace the schematic geometry in `components/muscle-map/body-paths.ts` with regions traced to these exact base figures. Retain `BodyView` and complete typed coverage of every `MuscleHeadId` in `HEAD_PATHS`. Stop assuming every asset can be constructed by mirroring a half-body polygon.
3. Render the base and highlights in one SVG coordinate system. Use registered masks/paths with a tint treatment that retains underlying muscle shading. Isolate blending inside the illustration so page backgrounds cannot change its appearance. Keep neutral regions gray.
4. Preserve `MuscleMap` props: `intensity`, `view`, `focusGroup`, `className`, and `ariaLabel`. Preserve `exerciseIntensity`: primary → 3; secondary → 1. Preserve the 0/1/2/3 activity palette and existing Home calculations.
5. Maintain the server-compatible renderer and local static assets. No runtime image generation, new data requests, dependencies or per-exercise asset collection.

The neutral figures and registered regions must be reviewed together. A detailed background under the old polygon shapes is not acceptable: highlight boundaries must follow the new muscles, remain aligned while resizing, and preserve useful distinctions such as upper versus lower chest.

## Framing and screen integration

- **Group cards:** use a consistent image area around 120 px high, adjusting only as needed after checking 360 px screens. Chest and back use comparable upper-body framing and scale. Show shoulders/waist context rather than magnifying each isolated shape to fill the card.
- **Exercise thumbnails:** start at approximately 80 × 104 px with preserved aspect ratio. Keep enough surrounding anatomy to identify the region; retain room for long exercise names, weight and target labels. Primary and secondary differences must remain visible in representative thumbnails.
- **Full map:** preserve front/back views in expandable muscle details; stack them on narrow screens if side-by-side figures become unreadable. Keep existing text descriptions and training controls ahead of the map.
- **Home:** the shared renderer adopts the new figures; preserve the seven-day counts, thresholds, legend and accessible activity summary. Do not change the dashboard layout or reinterpret intensity as recovery/readiness.
- Use `preserveAspectRatio="xMidYMid meet"` and bounded containers. Crops may change framing, never body proportions. Include meaningful context for arms and legs, and avoid clipping highlighted regions.

Likely touched files: `components/muscle-map/muscle-map.tsx`, `body-paths.ts`, `body-paths.test.ts`, the three existing Exercises routes, the two new assets, their inventory, and current UI/tracker documentation. Change Home's caller only if required to preserve its layout or fallback. No Server Actions or schema changes.

## Accessibility, loading and failure

- Preserve catalog-derived accessible target names and the Home-specific `ariaLabel` override. A map remains a single labelled image, not dozens of announced paths.
- Retain visible primary/secondary text and legend; color alone must not carry the meaning.
- Reserve layout space before assets load. Reuse the same two asset URLs across cards; never embed repeated base64 images in every SVG.
- If an illustration fails, keep the card link, exercise name, target text and activity summary usable. Provide a neutral placeholder; do not show detached highlight shapes as a finished body.
- Verify that hidden/closed exercise movement guides still make no movement-image requests. Keep disabled category prefetch and existing navigation behavior.

## Implementation sequence

1. Mark Spec 19 in progress. Capture the current chest/back cards and a full map as comparison evidence.
2. Build the front/rear base figures and registered pilot highlights for chest, back and shoulders. Show the pilots in actual group-card, exercise-thumbnail and full-map sizes beside an approved movement guide.
3. Review those pilots with the user before tracing the remaining regions. Validate natural proportions and shading first; do not repeat the rejected schematic-figure approach.
4. Complete every catalog region and update the shared renderer/crops. Verify all ten groups and all 50 exercise highlight combinations, plus the Home intensity states.
5. Run focused audits and manual Playwright checks, fix defects, update the inventory/UI context/tracker, then follow the repository release workflow after implementation is verified.

## Dependencies and scope limits

Builds on Specs 04, 17 and 18. Reuse installed React, Next.js, SVG and image tooling. No packages or environment variables required.

This spec supersedes Spec 04's low-poly drawing and half-body mirroring requirements. Preserve catalog IDs, primary/secondary assignments, saved data, authentication, workout generation, timers, logging, Undo, progression and all 50 movement guides. Do not modify generated `components/ui/*` or add anatomy interaction features.

## Check when done

- [ ] User approves chest, back and shoulder pilots at real card/thumbnail/full-map sizes.
- [ ] Chest width and back length look natural; all ten group cards use coherent framing and match the movement-guide style.
- [ ] Every catalog head has correctly registered, visible coverage in an appropriate view; no missing regions or highlights spilling onto adjacent muscles.
- [ ] Bench Press, Incline Dumbbell Press, Hammer Curl, Overhead Cable Extension, Leg Extension, Seated Calf Raise and Face Pull retain their distinct primary/secondary targeting.
- [ ] Full front/rear and zero/low/medium/high Home states preserve existing data semantics and accessible descriptions.
- [ ] Asset audit confirms both files, dimensions and size limits; geometry tests check complete IDs and new canvas bounds. Remove obsolete half-body assumptions from tests.
- [ ] Playwright checks at 360 × 640, 390 × 844, desktop and 200% text show no distortion, clipped targets, horizontal overflow or unreadable labels.
- [ ] Blocked asset requests leave understandable text and usable controls; keyboard and screen-reader names remain intact.
- [ ] Network review shows only the required shared anatomy assets, no runtime generation, no movement-image downloads while closed and no category-prefetch regression.
- [ ] `npm test`, `npm run lint` and `npm run build` pass. No training-behavior changes occur.
- [ ] Phone: the user confirms readable chest/back maps, image loading and scrolling on the actual device.
- [ ] Inventory, UI context, progress tracker and release evidence are updated.

## Review of the plan

Two shared base figures with aligned highlights retain the current dynamic behavior and avoid dozens of separately maintained target images. The main risk is highlight registration, so the pilot includes both neutral anatomy and working overlays. Correcting only crops or recoloring the existing polygons would not meet the requested visual change.
