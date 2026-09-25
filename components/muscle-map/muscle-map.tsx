import { MUSCLE_GROUPS, MUSCLE_HEADS } from "@/lib/catalog";
import type { Exercise, MuscleGroupId, MuscleHeadId } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { BODY_PATHS, HEAD_PATHS } from "./body-paths";
import type { BodyView } from "./body-paths";

interface MuscleMapProps {
  intensity: Partial<Record<MuscleHeadId, 1 | 2 | 3>>;
  view?: BodyView | "both";
  focusGroup?: MuscleGroupId;
  className?: string;
  ariaLabel?: string;
}

const GROUP_FOCUS: Record<
  MuscleGroupId,
  { view: BodyView | "both"; viewBox: string }
> = {
  chest: { view: "front", viewBox: "51 72 98 80" },
  back: { view: "back", viewBox: "55 61 90 165" },
  shoulders: { view: "both", viewBox: "29 69 50 65" },
  biceps: { view: "front", viewBox: "23 107 39 83" },
  triceps: { view: "back", viewBox: "23 107 39 83" },
  quads: { view: "front", viewBox: "54 217 47 111" },
  hamstrings: { view: "back", viewBox: "52 246 49 82" },
  glutes: { view: "back", viewBox: "53 188 94 81" },
  calves: { view: "back", viewBox: "49 329 49 84" },
  abs: { view: "front", viewBox: "64 134 72 96" },
};

const HEAD_IDS = MUSCLE_GROUPS.flatMap((group) => group.heads);
const FILLS = {
  0: "fill-muscle-idle",
  1: "fill-muscle-1",
  2: "fill-muscle-2",
  3: "fill-muscle-3",
} as const;

export function exerciseIntensity(
  exercise: Exercise,
): Partial<Record<MuscleHeadId, 1 | 2 | 3>> {
  const intensity: Partial<Record<MuscleHeadId, 1 | 2 | 3>> = {};
  for (const head of exercise.secondary) intensity[head] = 1;
  for (const head of exercise.primary) intensity[head] = 3;
  return intensity;
}

export function MuscleMap({
  intensity,
  view = "both",
  focusGroup,
  className,
  ariaLabel,
}: MuscleMapProps) {
  const focus = focusGroup ? GROUP_FOCUS[focusGroup] : undefined;
  const selectedView = focus?.view ?? view;
  const views: BodyView[] =
    selectedView === "both" ? ["front", "back"] : [selectedView];
  const viewBox = focus?.viewBox ?? "0 0 200 440";
  const [, , width, height] = viewBox.split(" ").map(Number);
  const targets = HEAD_IDS.filter((id) => intensity[id] === 3);
  const secondary = HEAD_IDS.filter(
    (id) => intensity[id] === 1 || intensity[id] === 2,
  );
  const names = (ids: MuscleHeadId[]) =>
    ids.map((id) => MUSCLE_HEADS[id].name.toLowerCase()).join(", ");
  const label = [
    targets.length ? `Targets ${names(targets)}.` : "",
    secondary.length ? `Also works ${names(secondary)}.` : "",
  ].filter(Boolean).join(" ") || "Muscle map.";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${views.length * width + (views.length - 1) * 20} ${height}`}
      role="img"
      aria-label={ariaLabel ?? label}
      className={cn("block w-full", className)}
    >
      {views.map((bodyView, index) => (
        <svg
          key={bodyView}
          x={index * (width + 20)}
          width={width}
          height={height}
          viewBox={viewBox}
        >
          {[false, true].map((mirrored) => (
            <g
              key={String(mirrored)}
              transform={mirrored ? "translate(200 0) scale(-1 1)" : undefined}
            >
              {BODY_PATHS[bodyView].map((d, pathIndex) => (
                <path
                  key={pathIndex}
                  d={d}
                  className="fill-body stroke-page"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {HEAD_IDS.flatMap((id) =>
                HEAD_PATHS[id]
                  .filter((path) => path.view === bodyView)
                  .map((path, pathIndex) => (
                    <path
                      key={`${id}-${pathIndex}`}
                      d={path.d}
                      className={cn(
                        FILLS[intensity[id] ?? 0],
                        "stroke-page",
                      )}
                      strokeWidth={1}
                      vectorEffect="non-scaling-stroke"
                    />
                  )),
              )}
            </g>
          ))}
        </svg>
      ))}
    </svg>
  );
}
