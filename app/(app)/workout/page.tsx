import { Check, Flame, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ElapsedTime, LocalTime } from "@/components/local-time";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FinishWorkoutButton } from "@/components/workout/finish-workout-button";
import { SessionSets } from "@/components/workout/session-sets";
import { GenerateSheet } from "@/components/workout/generate-sheet";
import { requireUserId } from "@/lib/auth";
import { formatVolume, summarizeSets } from "@/lib/game";
import { getActiveSession, getProgressMap, getSessionDetail, getTrainingProfile } from "@/lib/queries";
import { getExercise } from "@/lib/catalog";
import { FOCUS_LABELS } from "@/lib/plan";

export default async function WorkoutPage() {
  const userId = await requireUserId();
  const active = await getActiveSession(userId);
  const session = active ? await getSessionDetail(userId, active.id) : null;

  if (session) {
    const totals = summarizeSets(session.sets);
    const plan = session.plan;
    const steps = plan?.exercises.map((step) => ({
      ...step,
      exercise: getExercise(step.exerciseId)!,
      done: session.sets.filter((set) => set.exerciseId === step.exerciseId).length,
    }));
    const nextIndex = steps?.findIndex((step) => step.done < step.sets);
    const extras = session.sets.filter((set) => !plan?.exercises.some((step) => step.exerciseId === set.exerciseId));
    const totalsLine = <p className="text-sm text-copy-secondary">{totals.setCount} sets · {formatVolume(totals.volumeKg)} · {totals.levelUps} levels cleared</p>;
    return (
      <section className="space-y-6">
        <header className="space-y-2">
          <h1 className="font-display text-2xl text-copy">{plan?.title ?? "Workout"}</h1>
          {plan && <><Badge className="bg-ai-dim text-ai">{FOCUS_LABELS[plan.focus]}</Badge><p className="text-sm text-copy-muted">{plan.summary}</p></>}
          <p className="flex flex-wrap gap-x-3 text-sm text-copy-muted">
            <span>Started <LocalTime date={session.startedAt.toISOString()} options={{ hour: "numeric", minute: "2-digit" }} /></span>
            <ElapsedTime since={session.startedAt.toISOString()} />
          </p>
          {!plan && totalsLine}
        </header>
        {steps ? (
          <>
            <ol className="space-y-3" aria-label="Workout plan">
              {steps.map((step, index) => (
                <li key={step.exerciseId}>
                  <Link href={`/exercises/${step.exercise.groupId}/${step.exerciseId}`} aria-current={index === nextIndex ? "step" : undefined} className={`flex min-h-11 items-start gap-3 rounded-2xl border bg-surface p-4 focus-visible:outline-2 focus-visible:outline-brand ${index === nextIndex ? "border-brand" : "border-line"}`}>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg">{step.exercise.name}</p>
                      <p className="mt-1 text-sm tabular-nums text-copy-muted">{step.done} / {step.sets} sets{step.done >= step.sets && <span className="sr-only"> · done</span>}</p>
                      <p className="mt-2 text-sm text-ai">{step.note}</p>
                    </div>
                    {step.done >= step.sets && <Check className="mt-1 size-5 shrink-0 text-brand" aria-hidden="true" />}
                  </Link>
                </li>
              ))}
            </ol>
            {extras.length > 0 && <section className="space-y-3"><h2 className="font-display text-xl">Extra</h2><SessionSets sets={extras} /></section>}
            {totalsLine}
          </>
        ) : <SessionSets sets={session.sets} />}
        <FinishWorkoutButton />
      </section>
    );
  }

  const [progress, profile] = await Promise.all([getProgressMap(userId), getTrainingProfile(userId)]);
  if (!profile) redirect("/onboarding");
  return (
    <section>
      <h1 className="font-display text-2xl text-copy">Workout</h1>
      <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-3 text-center">
        <Flame className="h-8 w-8 text-copy-muted" aria-hidden="true" />
        <p className="text-sm text-copy-muted">No active workout.</p>
        <GenerateSheet progress={progress} hasActiveWorkout={false} defaultDurationMin={profile.sessionMinutes}>
          <Button className="h-11 w-full rounded-xl bg-ai text-on-brand hover:bg-ai/90">
            <Sparkles className="size-5" aria-hidden="true" />Generate workout
          </Button>
        </GenerateSheet>
        <Button asChild className="h-11 rounded-xl">
          <Link href="/exercises">Browse exercises</Link>
        </Button>
      </div>
    </section>
  );
}
