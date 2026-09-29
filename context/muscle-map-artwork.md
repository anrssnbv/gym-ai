# Muscle-map artwork inventory

Spec 19, 2026-09-29. **Pilots approved; integrated and verified locally.** The user approved the chest/back/shoulder pilots: “Use these pilots and continue.” Both assets are now used by the shared `MuscleMap` component.

Both figures are original images created with the built-in OpenAI image generator. No external artwork or licenses were used. The approved Spec 18 Cable Curl image supplied the style reference. Source PNGs remain in the local Codex generated-images archive; delivered WebPs are stored in `public/muscle-maps/`.

| Asset | Source PNG | Dimensions | Size | Review |
| --- | --- | --- | --- | --- |
| front.webp | `exec-838809a5-c372-4b67-bdda-e102d916e80e.png` | 960 × 1920 | 52,066 bytes | Neutral front pose; proportionate torso/chest; detailed gray muscles; no baked highlights or text. |
| back.webp | `exec-4a8e3feb-69a5-42c7-94af-71c9ad25ee03.png` | 960 × 1920 | 52,738 bytes | Matching rear pose, scale and framing; full back length; no baked highlights or text. |

## Prompt set

Front: one full-body orthographic front-view anatomical base in the approved detailed gray style; natural athletic proportions; arms slightly away from torso; relaxed hands and hip-width stance; faceless head; modest neutral pelvic covering; clearly delineated muscles and restrained dimensional shading; uniform charcoal `#101414`; portrait 1:2; complete head/feet and margins; no equipment, colored regions, text, labels or arrows.

Rear: use the generated front figure as the reference and create its matching rear view, preserving proportions, pose, framing and scale; expose the illustrative rear muscle regions with neutral gray shading; same background and all exclusions.

Encoding uses the existing Sharp dependency: contain within 960 × 1920, charcoal background, WebP quality 85. Originals retained.

## Registered pilot regions and review

`feature-specs/19-pilots/regions.mjs` traces the chest's three catalog regions, four back regions, and three deltoid regions against the new figures. It is partial pilot geometry, not the complete replacement for `HEAD_PATHS`.

The reproducible [preview](feature-specs/19-pilots/preview.html) presents 120 px group artwork, 80 × 104 px exercise thumbnails, full-body maps and the unchanged movement-guide reference. [Before](feature-specs/19-pilots/before.png) records existing geometry/crops. [Desktop](feature-specs/19-pilots/desktop.png) and [phone viewport](feature-specs/19-pilots/mobile.png) show the pilots.

Manual Playwright checks: no horizontal overflow at 360, 390 or 1280 px; actual 200% text (32 px body text) fits. Both base images are fetched once despite repeated views. SVG filter image sources and luminance masks preserve shading and suppress highlights when an asset fails. Blocked-image testing caught broken SVG image placeholders in the first implementation; using `feImage` fixed this, leaving blank neutral image space and readable card text. This remains a static pilot, not a completed app or physical-iPhone test.

Rebuild: `node context/feature-specs/19-pilots/build-preview.mjs`.
Audit: `node context/feature-specs/19-pilots/check-pilots.mjs`.

## Completed registration and integration

`components/muscle-map/body-paths.ts` contains all 27 catalog heads as full bilateral contours on the 960 × 1920 canvas. Arm, abdominal and lower-body regions were traced against the same assets, with full-size overlay review. Deeper heads use explanatory surface regions. The pilot geometry remains frozen with its approval preview; production geometry is maintained in `body-paths.ts`.

The shared renderer preserves catalog labels, primary/secondary intensity and Home activity thresholds. Each instance uses unique React IDs for SVG filters, masks and crop clips. Small shoulder thumbnails show the primary side; group cards retain both views. Chest/back/shoulder framing extends upward to include the complete trapezius region. Exercise rows wrap at enlarged text sizes.

App checks passed for all 50 exercise rows, seven representative full maps, zero/low/medium/high activity, image failure, keyboard focus, 360/390/1280 px layouts and 200% text. The exercise menu requests only the two shared anatomy assets, once each. Closed movement guides remain unloaded. See [verification](spec19-muscle-map-review.md). Physical iPhone review and release verification remain.
