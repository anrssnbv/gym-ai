import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { LocalTime } from "@/components/local-time";
import { MuscleMap } from "@/components/muscle-map/muscle-map";
import { Progress } from "@/components/ui/progress";
import { requireUserId } from "@/lib/auth";
import { EXERCISES, MUSCLE_GROUPS, MUSCLE_HEADS } from "@/lib/catalog";
import type { MuscleHeadId } from "@/lib/catalog";
import { formatDuration, formatVolume, heatLevel, rankFor } from "@/lib/game";
import { getDashboard } from "@/lib/queries";

export default async function HomePage() {
  const dashboard = await getDashboard(await requireUserId());
  const rank = rankFor(dashboard.power);
  const intensity: Partial<Record<MuscleHeadId, 1 | 2 | 3>> = {};
  const activity: string[] = [];

  for (const head of MUSCLE_GROUPS.flatMap((group) => group.heads)) {
    const count = dashboard.heat[head] ?? 0;
    const level = heatLevel(count);
    if (level !== 0) {
      intensity[head] = level;
      activity.push(`${MUSCLE_HEADS[head].name.toLowerCase()}, ${count} ${count === 1 ? "set" : "sets"}`);
    }
  }

  const stats = [
    { label: "Workouts", value: dashboard.workouts.total, detail: `${dashboard.workouts.last7Days} in the last 7 days` },
    { label: "Time trained", value: formatDuration(dashboard.timeTrainedMs) },
    { label: "Volume", value: formatVolume(dashboard.volumeKg) },
    { label: "Unlocked", value: `${dashboard.unlocked} / ${EXERCISES.length}`, detail: "exercises" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-copy">Home</h1>
      <section aria-labelledby="power-heading" className="rounded-2xl border border-line bg-surface p-5">
        <h2 id="power-heading" className="text-sm text-copy-muted">Power level</h2>
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <p className="font-display text-4xl text-level tabular-nums">{dashboard.power}</p>
          <p className="font-display text-lg text-copy">{rank.name}</p>
        </div>
        {rank.nextMin === null ? (
          <p className="mt-4 text-sm text-level">Max rank</p>
        ) : (
          <div className="mt-4 space-y-2">
            <Progress value={((dashboard.power - rank.min) / (rank.nextMin - rank.min)) * 100} aria-label="Power level" aria-valuemin={rank.min} aria-valuemax={rank.nextMin} aria-valuenow={dashboard.power} aria-valuetext={`${dashboard.power} / ${rank.nextMin}`} className="h-2 [&_[data-slot=progress-indicator]]:bg-level" />
            <p className="text-right text-xs text-copy-muted tabular-nums">{dashboard.power} / {rank.nextMin}</p>
          </div>
        )}
      </section>

      <dl className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-0 rounded-2xl border border-line bg-surface p-4">
            <dt className="text-sm text-copy-muted">{stat.label}</dt>
            <dd className="mt-2 break-words font-display text-xl text-copy tabular-nums">{stat.value}</dd>
            {stat.detail && <dd className="mt-1 text-xs text-copy-muted">{stat.detail}</dd>}
          </div>
        ))}
      </dl>

      <section aria-labelledby="muscles-heading" className="rounded-2xl border border-line bg-surface p-4">
        <h2 id="muscles-heading" className="font-display text-lg text-copy">Muscles — last 7 days</h2>
        <MuscleMap intensity={intensity} view="both" ariaLabel={activity.length ? `Muscles trained in the last 7 days: ${activity.join("; ")}.` : "No muscles trained in the last 7 days."} className="mx-auto mt-4 max-w-72" />
        {activity.length === 0 && <p className="mt-3 text-center text-sm text-copy-muted">Log a set to light up your muscles.</p>}
      </section>

      <section aria-labelledby="recent-heading" className="space-y-3">
        <h2 id="recent-heading" className="font-display text-lg text-copy">Recent workouts</h2>
        {dashboard.recent.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-5 text-center">
            <p className="text-sm text-copy-muted">No workouts yet.</p>
            <Link href="/exercises" className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-brand underline-offset-4 hover:underline">Explore exercises</Link>
          </div>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {dashboard.recent.map((workout) => (
              <li key={workout.id}>
                <Link href={`/workout/${workout.id}`} className="flex min-h-11 items-center gap-3 p-4 hover:bg-elevated focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-copy"><LocalTime date={workout.startedAt.toISOString()} options={{ month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }} /></p>
                    <p className="mt-1 text-xs text-copy-muted">{formatDuration(workout.endedAt.getTime() - workout.startedAt.getTime())} · {workout.setCount} sets</p>
                  </div>
                  {workout.levelUps > 0 && <span className="shrink-0 text-xs font-semibold text-level">LV ↑ {workout.levelUps}</span>}
                  <ChevronRight className="size-4 shrink-0 text-copy-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
