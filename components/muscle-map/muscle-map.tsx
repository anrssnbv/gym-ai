import { useId } from "react";
import { MUSCLE_GROUPS, MUSCLE_HEADS } from "@/lib/catalog";
import type { Exercise, MuscleGroupId, MuscleHeadId } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { HEAD_PATHS, BODY_WIDTH, BODY_HEIGHT } from "./body-paths";
import type { BodyView } from "./body-paths";

interface MuscleMapProps {
  intensity: Partial<Record<MuscleHeadId, 1 | 2 | 3>>;
  view?: BodyView | "both";
  focusGroup?: MuscleGroupId;
  className?: string;
  ariaLabel?: string;
}

const GROUP_FOCUS: Record<MuscleGroupId, { view: BodyView | "both"; viewBox: string }> = {
  chest: { view: "front", viewBox: "190 190 580 650" },
  back: { view: "back", viewBox: "190 190 580 650" },
  shoulders: { view: "both", viewBox: "190 190 580 650" },
  biceps: { view: "front", viewBox: "140 320 680 520" },
  triceps: { view: "back", viewBox: "140 320 680 520" },
  quads: { view: "front", viewBox: "235 735 490 590" },
  hamstrings: { view: "back", viewBox: "235 735 490 590" },
  glutes: { view: "back", viewBox: "235 620 490 590" },
  calves: { view: "back", viewBox: "235 1190 490 590" },
  abs: { view: "front", viewBox: "190 370 580 590" },
};
const HEAD_IDS = MUSCLE_GROUPS.flatMap((group) => group.heads);
const FILLS = { 1: "fill-muscle-1", 2: "fill-muscle-2", 3: "fill-muscle-3" } as const;

export function exerciseIntensity(exercise: Exercise): Partial<Record<MuscleHeadId, 1 | 2 | 3>> {
  const intensity: Partial<Record<MuscleHeadId, 1 | 2 | 3>> = {};
  for (const head of exercise.secondary) intensity[head] = 1;
  for (const head of exercise.primary) intensity[head] = 3;
  return intensity;
}

export function MuscleMap({ intensity, view = "both", focusGroup, className, ariaLabel }: MuscleMapProps) {
  const instance = useId();
  const focus = focusGroup ? GROUP_FOCUS[focusGroup] : undefined;
  // Small shoulder thumbnails show the primary side; the group card retains both.
  const shoulderView = intensity["delts-rear"] === 3
    ? intensity["delts-front"] === 3 || intensity["delts-side"] === 3 ? "both" : "back"
    : "front";
  const selectedView = focusGroup === "shoulders" ? shoulderView : focus?.view ?? view;
  const views: BodyView[] = selectedView === "both" ? ["front", "back"] : [selectedView];
  const viewBox = focus?.viewBox ?? `0 0 ${BODY_WIDTH} ${BODY_HEIGHT}`;
  const [cropX, cropY, cropWidth, cropHeight] = viewBox.split(" ").map(Number);
  const targets = HEAD_IDS.filter((id) => intensity[id] === 3);
  const secondary = HEAD_IDS.filter((id) => intensity[id] === 1 || intensity[id] === 2);
  const names = (ids: MuscleHeadId[]) => ids.map((id) => MUSCLE_HEADS[id].name.toLowerCase()).join(", ");
  const label = [targets.length ? `Targets ${names(targets)}.` : "", secondary.length ? `Also works ${names(secondary)}.` : ""].filter(Boolean).join(" ") || "Muscle map.";

  return (
    <div role="img" aria-label={ariaLabel ?? label} className={cn("flex w-full min-w-0 items-center justify-center gap-2", className)}>
      {views.map((bodyView) => {
        const id = `${instance}-${bodyView}`;
        const base = <rect width={BODY_WIDTH} height={BODY_HEIGHT} filter={`url(#${id}-base)`} />;
        return (
          <svg key={bodyView} aria-hidden="true" viewBox={viewBox} preserveAspectRatio="xMidYMid meet"
            className={cn("min-w-0 flex-1 isolate", focus ? "h-full" : "h-auto")}
            style={{ width: `${100 / views.length}%` }}>
            <defs>
              <clipPath id={`${id}-crop`}><rect x={cropX} y={cropY} width={cropWidth} height={cropHeight} /></clipPath>
              {/* feImage becomes transparent on failure; no broken-image icon or orphan highlights. */}
              <filter id={`${id}-base`} x="0" y="0" width={BODY_WIDTH} height={BODY_HEIGHT} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                <feImage href={`/muscle-maps/${bodyView}.webp`} x="0" y="0" width={BODY_WIDTH} height={BODY_HEIGHT} preserveAspectRatio="xMidYMid meet" />
              </filter>
              <mask id={`${id}-muscles`} x="0" y="0" width={BODY_WIDTH} height={BODY_HEIGHT} maskUnits="userSpaceOnUse" style={{ maskType: "luminance" }}>{base}</mask>
            </defs>
            <g clipPath={`url(#${id}-crop)`}>
              <rect width={BODY_WIDTH} height={BODY_HEIGHT} className="fill-page" />
              {base}
              <g mask={`url(#${id}-muscles)`} style={{ mixBlendMode: "multiply" }}>
              {HEAD_IDS.flatMap((head) => {
                const level = intensity[head];
                return level ? HEAD_PATHS[head].filter((path) => path.view === bodyView).map((path, index) => (
                  <path key={`${head}-${index}`} data-muscle={head} data-intensity={level} d={path.d} className={FILLS[level]} />
                )) : [];
              })}
              </g>
            </g>
          </svg>
        );
      })}
    </div>
  );
}
