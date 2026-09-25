import { Flame } from "lucide-react";

export default function WorkoutPage() {
  return (
    <section>
      <h1 className="font-display text-2xl text-copy">Workout</h1>
      <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-3 text-center">
        <Flame className="h-8 w-8 text-copy-muted" aria-hidden="true" />
        <p className="text-sm text-copy-muted">No active workout.</p>
      </div>
    </section>
  );
}
