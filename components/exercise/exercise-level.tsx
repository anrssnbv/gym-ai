"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Play, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { WeightSheet } from "@/components/exercise/weight-sheet";
import { RoundTimer } from "@/components/exercise/round-timer";
import { LogRepsSheet } from "@/components/exercise/log-reps-sheet";
import { LevelUpOverlay } from "@/components/exercise/level-up-overlay";
import { SetHistory, type HistorySet } from "@/components/exercise/set-history";
import type { Exercise } from "@/lib/catalog";
import { formatKg, roundSeconds, TARGET_REPS } from "@/lib/game";
import type { LevelState } from "@/lib/game";
import { calibrateExercise, adjustExercise, logSet } from "@/actions/exercise";
import { callAction } from "@/lib/action-result";

interface Round {
  setId: string;
  submittedReps: number | null;
  endsAt: number;
  state: LevelState;
  result: string | null;
  limitReached: boolean;
}

export function ExerciseLevel({ exercise, state, sets }: { exercise: Exercise; state: LevelState | null; sets: HistorySet[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [loggedIds, setLoggedIds] = useState<string[]>([]);
  const [undoPending, setUndoPending] = useState(false);
  const busy = pending || undoPending;
  const [reward, setReward] = useState<LevelState | null>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const closeReward = useCallback(() => {
    setReward(null);
    nextButton.current?.focus();
  }, []);
  const seconds = roundSeconds(exercise.compound);

  function startRound() {
    if (!state || busy) return;
    setError(null);
    setRound({ setId: crypto.randomUUID(), submittedReps: null, endsAt: Date.now() + seconds * 1000, state, result: null, limitReached: false });
  }

  function saveWeight(weightKg: number, stepKg: number): Promise<string | null> {
    return new Promise((resolve) => {
      startTransition(async () => {
        const action = state ? adjustExercise : calibrateExercise;
        const result = await callAction(() => action({ exerciseId: exercise.id, weightKg, stepKg }));
        if (result.ok && round?.result !== null) setRound(null);
        resolve(result.ok ? null : result.error);
      });
    });
  }

  function logReps(reps: number): Promise<string | null> {
    if (!round || round.result !== null) return Promise.resolve(null);
    const submittedReps = round.submittedReps ?? reps;
    setRound({ ...round, submittedReps });
    return new Promise((resolve) => {
      startTransition(async () => {
        const result = await callAction(() => logSet({
          setId: round.setId, exerciseId: exercise.id, reps: submittedReps, expectedLevel: round.state.level,
          expectedWeightKg: round.state.weightKg, expectedStepKg: round.state.stepKg,
        }));
        if (!result.ok) {
          if (result.stale) {
            setRound(null);
            setError(result.error);
            router.refresh();
            resolve(null);
          } else resolve(result.error);
          return;
        }
        setLoggedIds((ids) => ids.includes(round.setId) ? ids : [...ids, round.setId]);
        const message = submittedReps === 11 ? "So close" : submittedReps >= 9 ? "Almost there" : "Keep going";
        const limitMessage = round.state.weightKg >= exercise.maxWeightKg
          ? `Exercise limit reached (${formatKg(exercise.maxWeightKg)}). Set saved — you can keep logging at this weight.`
          : `Set saved. The next step exceeds ${formatKg(exercise.maxWeightKg)}. Choose a smaller step to continue leveling up.`;
        setRound({ ...round, submittedReps, limitReached: result.data.limitReached, result: result.data.limitReached ? limitMessage : result.data.leveledUp ? "Level cleared!" : `${message} — ${submittedReps} / ${TARGET_REPS}` });
        if (result.data.leveledUp) setReward(result.data.state);
        resolve(null);
      });
    });
  }

  function reconcileUndo(setId: string) {
    setLoggedIds((ids) => ids.filter((id) => id !== setId));
    if (round?.setId === setId) {
      setRound(null);
      setReward(null);
    }
  }

  return (
    <>
    <section className="mt-8 space-y-5 rounded-2xl border border-line bg-surface p-5" aria-label="Exercise level">
      {state === null ? (
        <>
          <Lock className="size-8 text-copy-muted" aria-hidden="true" />
          <div className="space-y-2">
            <h2 className="font-display text-xl">Unlock this exercise</h2>
            <p className="text-sm text-copy-muted">Pick a weight you can lift for 12 clean reps.</p>
          </div>
          <WeightSheet mode="calibrate" exercise={exercise} onSave={saveWeight}>
            <Button disabled={busy} className="h-11 w-full rounded-xl">Calibrate</Button>
          </WeightSheet>
        </>
      ) : (
        <>
          <h2 className="font-display text-2xl text-level">LV {state.level}</h2>
          <div className="space-y-1">
            <p className="font-display text-4xl tabular-nums">{formatKg(state.weightKg)}</p>
            {exercise.equipment === "dumbbell" && <p className="text-sm text-copy-muted">per dumbbell</p>}
            <p className="text-sm text-copy-muted">+{formatKg(state.stepKg)} per level</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span>Best at this level</span>
              <span className="tabular-nums text-copy-muted">{state.bestRepsAtLevel} / {TARGET_REPS}</span>
            </div>
            <Progress value={Math.min(state.bestRepsAtLevel, TARGET_REPS) / TARGET_REPS * 100} aria-label="Best at this level" aria-valuenow={Math.min(state.bestRepsAtLevel, TARGET_REPS)} aria-valuemin={0} aria-valuemax={TARGET_REPS} aria-valuetext={`${state.bestRepsAtLevel} / ${TARGET_REPS}`} className="h-2" />
          </div>
          {state.weightKg !== state.startWeightKg && (
            <p className="text-sm text-copy-muted">
              Started at {formatKg(state.startWeightKg)} · {state.weightKg > state.startWeightKg ? "+" : ""}{Math.round((state.weightKg / state.startWeightKg - 1) * 100)}%
            </p>
          )}
          {round ? (
            <RoundTimer key={round.setId} endsAt={round.endsAt} seconds={seconds} roundNumber={loggedIds.length + (round.result === null ? 1 : 0)} result={round.result} onCancel={() => setRound(null)} onNext={startRound} nextButtonRef={nextButton} pending={busy}>
              <LogRepsSheet disabled={busy} weightKg={round.state.weightKg} level={round.state.level} submittedReps={round.submittedReps} onSave={logReps} />
            </RoundTimer>
          ) : <div className="flex gap-3">
            <Button disabled={busy} onClick={startRound} className="h-11 flex-1 rounded-xl"><Play className="size-5" aria-hidden="true" />Start round</Button>
            <WeightSheet mode="adjust" exercise={exercise} state={state} onSave={saveWeight}>
              <Button disabled={busy} variant="outline" size="icon" className="size-11 rounded-xl" aria-label="Adjust weight"><SlidersHorizontal className="size-5" aria-hidden="true" /></Button>
            </WeightSheet>
          </div>}
          {round?.limitReached && (
            <WeightSheet mode="adjust" exercise={exercise} state={state} onSave={saveWeight}>
              <Button disabled={busy} variant="outline" className="h-11 w-full rounded-xl">Adjust weight or step</Button>
            </WeightSheet>
          )}
        </>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {reward && <LevelUpOverlay level={reward.level} weightKg={reward.weightKg} onClose={closeReward} />}
    </section>
    <SetHistory exerciseId={exercise.id} sets={sets} disabled={pending} onUndo={reconcileUndo} onPendingChange={setUndoPending} />
    </>
  );
}
