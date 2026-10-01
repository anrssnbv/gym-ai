import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { MuscleMap, exerciseIntensity } from "@/components/muscle-map/muscle-map";
import { requireUserId } from "@/lib/auth";
import { formatKg } from "@/lib/game";
import { getProgressMap } from "@/lib/queries";
import {
  getExercisesByGroup,
  getGroup,
  MUSCLE_HEADS,
} from "@/lib/catalog";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const group = getGroup(groupId);
  if (!group) notFound();
  const userId = await requireUserId();
  const progress = await getProgressMap(userId);

  return (
    <section>
      <Link
        href="/exercises"
        className="inline-flex h-11 items-center gap-1 text-sm text-copy-muted"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Exercises
      </Link>
      <h1 className="mt-2 font-display text-[1.75rem] text-copy">{group.name}</h1>
      <p className="mt-2 text-copy-muted">Choose an exercise to see your weight and start a set.</p>
      <div className="mt-6 flex flex-col gap-3">
        {getExercisesByGroup(group.id).map((exercise) => (
          <Link
            key={exercise.id}
            href={`/exercises/${groupId}/${exercise.id}`}
            className="flex flex-wrap items-start gap-4 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-brand"
          >
            <MuscleMap
              intensity={exerciseIntensity(exercise)}
              focusGroup={group.id}
              className="h-[104px] w-[80px] shrink-0"
            />
            <div className="min-w-0 flex-[1_1_10rem]">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="font-display text-lg text-copy">{exercise.name}</h2>
                {progress[exercise.id] && (
                  <>
                    <span className="text-sm text-copy-muted">Level {progress[exercise.id].level}</span>
                    <span className="text-sm text-copy-secondary">{formatKg(progress[exercise.id].weightKg)}</span>
                  </>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge className="capitalize">
                  {exercise.equipment}
                </Badge>
                <span className="text-sm text-copy-muted">
                  {exercise.compound ? "Compound" : "Isolation"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {exercise.primary.map((head) => (
                  <span
                    key={head}
                    className="rounded-full bg-brand-dim px-2 py-1 text-xs text-brand"
                  >
                    {MUSCLE_HEADS[head].name}
                  </span>
                ))}
                {exercise.secondary.map((head) => (
                  <span
                    key={head}
                    className="rounded-full bg-subtle px-2 py-1 text-xs text-copy-muted"
                  >
                    {MUSCLE_HEADS[head].name}
                  </span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
