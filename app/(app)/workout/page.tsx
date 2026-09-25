import { Flame } from "lucide-react";
import Link from "next/link";
import { ElapsedTime, LocalTime } from "@/components/local-time";
import { Button } from "@/components/ui/button";
import { FinishWorkoutButton } from "@/components/workout/finish-workout-button";
import { SessionSets } from "@/components/workout/session-sets";
import { requireUserId } from "@/lib/auth";
import { formatVolume, summarizeSets } from "@/lib/game";
import { getActiveSession, getSessionDetail } from "@/lib/queries";

export default async function WorkoutPage() {
  const userId = await requireUserId();
  const active = await getActiveSession(userId);
  const session = active ? await getSessionDetail(userId, active.id) : null;

  if (session) {
    const totals = summarizeSets(session.sets);
    return (
      <section className="space-y-6">
        <header className="space-y-2">
          <h1 className="font-display text-2xl text-copy">Workout</h1>
          <p className="flex flex-wrap gap-x-3 text-sm text-copy-muted">
            <span>Started <LocalTime date={session.startedAt.toISOString()} options={{ hour: "numeric", minute: "2-digit" }} /></span>
            <ElapsedTime since={session.startedAt.toISOString()} />
          </p>
          <p className="text-sm text-copy-secondary">
            {totals.setCount} sets · {formatVolume(totals.volumeKg)} · {totals.levelUps} levels cleared
          </p>
        </header>
        <SessionSets sets={session.sets} />
        <FinishWorkoutButton />
      </section>
    );
  }

  return (
    <section>
      <h1 className="font-display text-2xl text-copy">Workout</h1>
      <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-3 text-center">
        <Flame className="h-8 w-8 text-copy-muted" aria-hidden="true" />
        <p className="text-sm text-copy-muted">No active workout.</p>
        <Button asChild className="h-11 rounded-xl">
          <Link href="/exercises">Browse exercises</Link>
        </Button>
      </div>
    </section>
  );
}
