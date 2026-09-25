import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ExerciseLevel } from "@/components/exercise/exercise-level";
import { MuscleMap, exerciseIntensity } from "@/components/muscle-map/muscle-map";
import { getExercise, getGroup, MUSCLE_HEADS } from "@/lib/catalog";
import { roundSeconds } from "@/lib/game";

export default async function ExercisePage({
  params,
}: {
  params: Promise<{ groupId: string; exerciseId: string }>;
}) {
  const { groupId, exerciseId } = await params;
  const group = getGroup(groupId);
  const exercise = getExercise(exerciseId);
  if (!group || !exercise || exercise.groupId !== groupId) notFound();

  return (
    <section>
      <Link
        href={`/exercises/${groupId}`}
        className="inline-flex h-11 items-center gap-1 text-sm text-copy-muted"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        {group.name}
      </Link>
      <h1 className="mt-2 font-display text-2xl text-copy">
        {exercise.name}
      </h1>
      <div className="mt-3 flex items-center gap-2">
        <Badge variant="secondary" className="capitalize">
          {exercise.equipment}
        </Badge>
        <span className="text-sm text-copy-muted">
          {exercise.compound ? "Compound" : "Isolation"} · {roundSeconds(exercise.compound) / 60} min rounds
        </span>
      </div>

      <MuscleMap intensity={exerciseIntensity(exercise)} className="mt-8" />

      <section className="mt-8">
        <h2 className="font-display text-xl text-copy">Targets</h2>
        <ul className="mt-3 space-y-3">
          {exercise.primary.map((head) => (
            <li key={head} className="rounded-2xl border border-line bg-surface p-4">
              <p className="text-sm text-copy">{MUSCLE_HEADS[head].name}</p>
              <p className="mt-1 text-sm text-copy-muted">
                {MUSCLE_HEADS[head].anatomy}
              </p>
            </li>
          ))}
        </ul>
        {exercise.secondary.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-copy-secondary">
              Also works
            </h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {exercise.secondary.map((head) => (
                <li
                  key={head}
                  className="rounded-full bg-subtle px-3 py-2 text-sm text-copy-muted"
                >
                  {MUSCLE_HEADS[head].name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
      <ExerciseLevel key={exercise.id} exercise={exercise} />
    </section>
  );
}
