# Spec 19 verification

2026-09-29. The user approved chest/back/shoulder pilots at card, thumbnail and full-map sizes before remaining regions were traced.

## Implementation

- Two original neutral anatomical base assets, 960 × 1920 and approximately 51 KiB each; all 27 catalog heads registered with bilateral contour paths.
- Same shared server-compatible component and props. Catalog assignments, activity thresholds, saved data and movement illustrations are unchanged.
- Consistent chest/back framing, 120 px group artwork and 80 × 104 px exercise thumbnails. Primary-side shoulder thumbnails improve readability; group/full maps retain both views where required.
- SVG image filters and luminance masks preserve shading and suppress detached highlights on failure. Unique IDs prevent collisions among repeated maps.

## Verification and fixes

- 50 unit tests pass, including exact catalog coverage, bilateral contour bounds, unique regions and both asset size/dimension checks. TypeScript, lint and production build pass. Lint retains one existing warning in an ignored browser helper.
- Authenticated Playwright checked all 50 exercise rows across all ten groups: expected accessible muscle names and intensity values, visible highlights and no horizontal overflow.
- Full maps checked: Bench Press, Incline Dumbbell Press, Hammer Curl, Overhead Cable Extension, Leg Extension, Seated Calf Raise and Face Pull. All expected primary/secondary heads appear in the two views.
- A disposable account first showed zero activity with no highlight paths. Fourteen scoped fixture sets then produced exactly mid chest = low (1 set), lats = medium (4), and rectus femoris = high (9), including the correct accessible counts.
- Checked 360 × 640, 390 × 844, 1280 px and actual 200% text. The exercise-row overflow found at 200% was fixed with bounded thumbnail dimensions and wrapping text columns.
- The independent review caught clipped upper traps. Upper-body crops were expanded and Dumbbell Shrug rechecked. Explicit crop clips keep filtered artwork inside its intended frame.
- Blocked anatomy requests leave a neutral blank image area and readable target text. Keyboard navigation still opens the exercise group; visible focus remains. The initial broken SVG image placeholder was eliminated by using `feImage`.
- The menu requests only `/muscle-maps/front.webp` and `/muscle-maps/back.webp`, once each, with no category prefetch. Seven closed movement guides fetched zero movement images; opening Face Pull fetched only its existing asset.

## Release

Pending. Hosted baseline for the disposable account: Exercises/Workout/Home 1458/1419/1406 ms, then 906/935/911 ms warm. Compare after deployment under the same browser/connection; this is a small observed sample, not a phone performance guarantee.

## Remaining limitation

Physical iPhone readability, loading and scrolling require the user's device. Browser viewport testing does not close that acceptance item.
