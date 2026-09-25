import Link from "next/link";
import {
  getExercisesByGroup,
  MUSCLE_GROUPS,
  MUSCLE_HEADS,
} from "@/lib/catalog";

export default function ExercisesPage() {
  return (
    <section>
      <h1 className="font-display text-2xl text-copy">Exercises</h1>
      <div className="mt-6 grid grid-cols-2 gap-3">
        {MUSCLE_GROUPS.map((group) => (
          <Link
            key={group.id}
            href={`/exercises/${group.id}`}
            className="min-w-0 rounded-2xl border border-line bg-surface p-4"
          >
            <h2 className="font-display text-lg text-copy">{group.name}</h2>
            <p className="mt-1 text-sm text-copy-secondary">
              {getExercisesByGroup(group.id).length} exercises
            </p>
            <p className="mt-3 text-xs leading-5 text-copy-muted">
              {group.heads.map((id) => MUSCLE_HEADS[id].name).join(" · ")}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
