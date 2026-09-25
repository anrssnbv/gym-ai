import { Dumbbell } from "lucide-react";

export default function ExercisesPage() {
  return (
    <section>
      <h1 className="font-display text-2xl text-copy">Exercises</h1>
      <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-3 text-center">
        <Dumbbell className="h-8 w-8 text-copy-muted" aria-hidden="true" />
        <p className="text-sm text-copy-muted">Muscle groups are coming next.</p>
      </div>
    </section>
  );
}
