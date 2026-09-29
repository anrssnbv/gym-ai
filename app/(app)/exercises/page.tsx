import Link from "next/link";
import { MuscleMap } from "@/components/muscle-map/muscle-map";
import { requireUserId } from "@/lib/auth";
import { powerLevel } from "@/lib/game";
import { getProgressMap } from "@/lib/queries";
import {
  getExercisesByGroup,
  MUSCLE_GROUPS,
  MUSCLE_HEADS,
} from "@/lib/catalog";

export default async function ExercisesPage() {
  const userId = await requireUserId();
  const progress = await getProgressMap(userId);
  return (
    <section>
      <h1 className="font-display text-[1.75rem] text-copy">Exercises</h1>
      <p className="mt-2 text-copy-muted">Choose a muscle group to explore and train.</p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        {MUSCLE_GROUPS.map((group) => {
          const exercises = getExercisesByGroup(group.id);
          const power = powerLevel(exercises.flatMap((exercise) => progress[exercise.id] ? [progress[exercise.id].level] : []));
          return (
          <Link
            key={group.id}
            href={`/exercises/${group.id}`}
            prefetch={false}
            className="min-w-0 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-brand"
          >
            <MuscleMap intensity={Object.fromEntries(group.heads.map((id) => [id, 3 as const]))} focusGroup={group.id} className="mb-4 h-20 w-full" />
            <h2 className="font-display text-xl text-copy">{group.name}</h2>
            <p className="mt-1 text-sm text-copy-secondary">
              {exercises.length} exercises
            </p>
            {power > 0 && <p className="mt-1 text-sm text-copy-secondary">Power {power}</p>}
            <p className="mt-3 text-sm leading-5 text-copy-muted">
              {group.heads.map((id) => MUSCLE_HEADS[id].name).join(" · ")}
            </p>
          </Link>
          );
        })}
      </div>
    </section>
  );
}
