import { Check, ChevronRight, Flame, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ElapsedTime, LocalTime } from "@/components/local-time";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FinishWorkoutButton } from "@/components/workout/finish-workout-button";
import { SessionSets } from "@/components/workout/session-sets";
import { GenerateSheet } from "@/components/workout/generate-sheet";
import { SwapExerciseSheet } from "@/components/workout/swap-exercise-sheet";
import { requireUserId } from "@/lib/auth";
import { formatVolume, summarizeSets } from "@/lib/game";
import { getActiveSession, getProgressMap, getSessionDetail, getTrainingProfile } from "@/lib/queries";
import { getExercise } from "@/lib/catalog";
import { Progress } from "@/components/ui/progress";
import { workoutProgress } from "@/lib/workout-progress";
import { FOCUS_LABELS, replacementExercises } from "@/lib/plan";

export default async function WorkoutPage() {
  const userId = await requireUserId();
  const active = await getActiveSession(userId);
  const [session, profile] = active
    ? await Promise.all([getSessionDetail(userId, active.id), getTrainingProfile(userId)])
    : [null, null] as const;

  if (session) {
    const totals = summarizeSets(session.sets);
    const plan = session.plan;
    const planned = plan ? workoutProgress(plan.exercises, session.sets) : null;
    const steps = planned?.steps.map((step, stepIndex) => ({ ...step, stepIndex, exercise: getExercise(step.exerciseId)! }));
    const next = steps?.find((step) => step.done < step.sets);
    const totalsLine = <p className="text-sm text-copy-secondary">{totals.setCount} sets · {formatVolume(totals.volumeKg)} · {totals.levelUps} levels cleared</p>;
    return (
      <section className="space-y-6">
        <header className="space-y-2">
          <h1 className="font-display text-[28px] text-copy">{plan?.title ?? "Workout"}</h1>
          {plan && <><Badge>{FOCUS_LABELS[plan.focus]}</Badge><p className="text-sm text-copy-muted">{plan.summary}</p></>}
          <p className="flex flex-wrap gap-x-3 text-sm text-copy-muted">
            <span>Started <LocalTime date={session.startedAt.toISOString()} options={{ hour: "numeric", minute: "2-digit" }} /></span>
            <ElapsedTime since={session.startedAt.toISOString()} />
          </p>
          {!plan && totalsLine}
        </header>
        {plan && steps && planned ? (
          <>
            <section aria-label="Planned set progress" className="space-y-3">
              <p className="text-xl font-semibold tabular-nums">{planned.completed} / {planned.total} <span className="text-base font-normal text-copy-secondary">sets completed</span></p>
              <Progress value={planned.total ? planned.completed / planned.total * 100 : 0} aria-label="Planned sets completed" aria-valuemin={0} aria-valuemax={planned.total} aria-valuenow={planned.completed} aria-valuetext={`${planned.completed} of ${planned.total} sets completed`} />
            </section>
            {next ? (
              <section aria-labelledby="next-exercise-heading" className="space-y-4 rounded-2xl border border-brand/50 bg-surface p-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-copy-muted">Next exercise</p>
                  <h2 id="next-exercise-heading" className="text-xl font-semibold">{next.exercise.name}</h2>
                  <p className="text-sm text-copy-secondary tabular-nums">{next.done} / {next.sets} sets completed</p>
                  <p className="text-sm text-copy-muted">{next.note}</p>
                </div>
                <Button asChild className="h-12 w-full rounded-xl">
                  <Link id={`plan-step-${next.stepIndex}`} href={`/exercises/${next.exercise.groupId}/${next.exerciseId}`} aria-current="step">{next.done ? "Continue exercise" : "Start exercise"}<ChevronRight className="size-5" aria-hidden="true" /></Link>
                </Button>
                {next.done === 0 && <SwapExerciseSheet sessionId={session.id} stepIndex={next.stepIndex} exercise={next.exercise} sets={next.sets} alternatives={replacementExercises(plan, next.stepIndex, profile?.equipment ?? [])} />}
              </section>
            ) : <p className="flex items-center gap-2 text-brand"><Check className="size-5" aria-hidden="true" />All planned sets completed</p>}
            {steps.some((step) => step.exerciseId !== next?.exerciseId) && (
              <section className="space-y-3" aria-labelledby="plan-heading">
                <h2 id="plan-heading" className="text-xl font-semibold">Your exercises</h2>
                <ol className="divide-y divide-line rounded-2xl border border-line bg-surface" aria-label="Workout plan">
                  {steps.filter((step) => step.exerciseId !== next?.exerciseId).map((step) => (
                    <li key={step.stepIndex}>
                      <Link id={`plan-step-${step.stepIndex}`} href={`/exercises/${step.exercise.groupId}/${step.exerciseId}`} className="flex min-h-11 items-center gap-3 p-4 hover:bg-elevated focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{step.exercise.name}</p>
                          <p className="mt-1 text-sm tabular-nums text-copy-muted">{step.done} / {step.sets} sets completed{step.done >= step.sets && " · Done"}</p>
                        </div>
                        {step.done >= step.sets ? <Check className="size-5 shrink-0 text-brand" aria-hidden="true" /> : <ChevronRight className="size-5 shrink-0 text-copy-muted" aria-hidden="true" />}
                      </Link>
                      {step.done === 0 && <div className="px-4 pb-4"><SwapExerciseSheet sessionId={session.id} stepIndex={step.stepIndex} exercise={step.exercise} sets={step.sets} alternatives={replacementExercises(plan, step.stepIndex, profile?.equipment ?? [])} compact /></div>}
                    </li>
                  ))}
                </ol>
              </section>
            )}
            {planned.extras.length > 0 && <section className="space-y-3"><h2 className="font-display text-xl">Additional sets</h2><SessionSets sets={planned.extras} /></section>}
            {totalsLine}
          </>
        ) : <SessionSets sets={session.sets} />}
        <FinishWorkoutButton secondary={!!next} />
      </section>
    );
  }

  const [progress, emptyProfile] = await Promise.all([getProgressMap(userId), getTrainingProfile(userId)]);
  if (!emptyProfile) redirect("/onboarding");
  return (
    <section>
      <h1 className="font-display text-[28px] text-copy">Workout</h1>
      <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-3 text-center">
        <Flame className="h-8 w-8 text-copy-muted" aria-hidden="true" />
        <p className="text-sm text-copy-muted">No active workout.</p>
        <GenerateSheet progress={progress} hasActiveWorkout={false} defaultDurationMin={emptyProfile.sessionMinutes}>
          <Button className="h-12 w-full rounded-xl">
            <Sparkles className="size-5" aria-hidden="true" />Generate workout
          </Button>
        </GenerateSheet>
        <Button asChild variant="outline" className="h-12 rounded-xl">
          <Link href="/exercises">Browse exercises</Link>
        </Button>
      </div>
    </section>
  );
}
