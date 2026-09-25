import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getExercise } from "@/lib/catalog";
import { formatKg } from "@/lib/game";

interface SessionSet {
  id: string;
  exerciseId: string;
  weightKg: number;
  reps: number;
  leveledUp: boolean;
}

export function SessionSets({ sets }: { sets: SessionSet[] }) {
  const groups = new Map<string, SessionSet[]>();
  for (const set of sets) {
    const group = groups.get(set.exerciseId);
    if (group) group.push(set);
    else groups.set(set.exerciseId, [set]);
  }

  return (
    <div className="space-y-3">
      {Array.from(groups, ([exerciseId, exerciseSets]) => {
        const exercise = getExercise(exerciseId);
        return (
          <section key={exerciseId} className="rounded-2xl border border-line bg-surface p-4">
            <h2 className="font-display text-lg text-copy">
              {exercise ? (
                <Link className="flex min-h-11 items-center hover:text-brand" href={`/exercises/${exercise.groupId}/${exercise.id}`}>
                  {exercise.name}
                </Link>
              ) : exerciseId}
            </h2>
            <ul className="divide-y divide-line">
              {exerciseSets.map((set) => (
                <li key={set.id} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="text-sm tabular-nums">{formatKg(set.weightKg)} × {set.reps}</span>
                  {set.leveledUp && <Badge variant="secondary" className="text-level">LV ↑</Badge>}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
