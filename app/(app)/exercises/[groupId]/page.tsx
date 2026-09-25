import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
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

  return (
    <section>
      <Link
        href="/exercises"
        className="inline-flex h-11 items-center gap-1 text-sm text-copy-muted"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Exercises
      </Link>
      <h1 className="mt-2 font-display text-2xl text-copy">{group.name}</h1>
      <div className="mt-6 flex flex-col gap-3">
        {getExercisesByGroup(group.id).map((exercise) => (
          <Link
            key={exercise.id}
            href={`/exercises/${groupId}/${exercise.id}`}
            className="rounded-2xl border border-line bg-surface p-4"
          >
            <h2 className="font-display text-lg text-copy">{exercise.name}</h2>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {exercise.equipment}
              </Badge>
              <span className="text-xs text-copy-muted">
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
          </Link>
        ))}
      </div>
    </section>
  );
}
