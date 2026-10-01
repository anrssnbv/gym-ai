import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LocalTime } from "@/components/local-time";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SessionSets } from "@/components/workout/session-sets";
import { requireUserId } from "@/lib/auth";
import { formatDuration, formatVolume, sessionEndAt, summarizeSets } from "@/lib/game";
import { getActiveSession, getSessionDetail } from "@/lib/queries";
import { workoutProgress } from "@/lib/workout-progress";
import { FOCUS_LABELS } from "@/lib/plan";

export default async function WorkoutSummaryPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const userId = await requireUserId();
  const { sessionId } = await params;
  const now = new Date();
  const [session, active] = await Promise.all([
    getSessionDetail(userId, sessionId),
    getActiveSession(userId, now),
  ]);
  if (!session) notFound();
  if (active?.id === session.id) redirect("/workout");

  const lastActivityAt = session.sets.at(-1)?.createdAt ?? session.startedAt;
  const endedAt = sessionEndAt(session.endedAt, lastActivityAt, now);
  const totals = summarizeSets(session.sets);
  const planned = session.plan ? workoutProgress(session.plan.exercises, session.sets) : null;
  const stats = [
    { label: "Duration", value: formatDuration(endedAt.getTime() - session.startedAt.getTime()) },
    { label: "Sets", value: totals.setCount },
    { label: "Volume", value: formatVolume(totals.volumeKg) },
    { label: "Levels cleared", value: totals.levelUps },
  ];

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-[28px] text-copy">Workout complete</h1>
        {session.plan && (
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl">{session.plan.title}</h2>
            <Badge>{FOCUS_LABELS[session.plan.focus]}</Badge>
          </div>
        )}
        <p className="text-sm text-copy-muted">
          <LocalTime date={session.startedAt.toISOString()} options={{ year: "numeric", month: "short", day: "numeric" }} />
        </p>
      </header>
      <dl className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value }) => (
          <div key={label} className="min-w-0 rounded-2xl border border-line bg-surface p-4">
            <dt className="text-sm text-copy-muted">{label}</dt>
            <dd className="mt-2 break-words font-display text-2xl text-copy tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {planned && <p className="text-base tabular-nums text-copy-secondary">{planned.completed} / {planned.total} planned sets completed{planned.extras.length > 0 && ` · ${planned.extras.length} additional sets`}</p>}
      <section className="space-y-3" aria-labelledby="saved-sets-heading">
        <h2 id="saved-sets-heading" className="text-xl font-semibold">Saved sets</h2>
        <SessionSets sets={session.sets} />
      </section>
      <Button asChild variant="outline" className="h-11 w-full rounded-xl">
        <Link href="/">Back to Home</Link>
      </Button>
    </section>
  );
}
