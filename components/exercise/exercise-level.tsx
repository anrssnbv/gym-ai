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
import type { Exercise } from "@/lib/catalog";
import { formatKg, roundSeconds, TARGET_REPS } from "@/lib/game";
import type { LevelState } from "@/lib/game";
import { calibrateExercise, adjustExercise, logSet } from "@/actions/exercise";
import { callAction } from "@/lib/action-result";

interface Round {
  setId: string;
  submittedReps: number | null;
  endsAt: number;
  number: number;
  state: LevelState;
  result: string | null;
}

export function ExerciseLevel({ exercise, state }: { exercise: Exercise; state: LevelState | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [roundsLogged, setRoundsLogged] = useState(0);
  const [reward, setReward] = useState<LevelState | null>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const closeReward = useCallback(() => {
    setReward(null);
    nextButton.current?.focus();
  }, []);
  const seconds = roundSeconds(exercise.compound);

  function startRound() {
    if (!state || pending) return;
    setError(null);
    setRound({ setId: crypto.randomUUID(), submittedReps: null, endsAt: Date.now() + seconds * 1000, number: roundsLogged + 1, state, result: null });
  }

  function saveWeight(weightKg: number, stepKg: number): Promise<string | null> {
    return new Promise((resolve) => {
      startTransition(async () => {
        const action = state ? adjustExercise : calibrateExercise;
        const result = await callAction(() => action({ exerciseId: exercise.id, weightKg, stepKg }));
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
        setRoundsLogged((count) => count + 1);
        const message = submittedReps === 11 ? "So close" : submittedReps >= 9 ? "Almost there" : "Keep going";
        setRound({ ...round, submittedReps, result: result.data.leveledUp ? "Level cleared!" : `${message} — ${submittedReps} / ${TARGET_REPS}` });
        if (result.data.leveledUp) setReward(result.data.state);
        resolve(null);
      });
    });
  }

  return (
    <section className="mt-8 space-y-5 rounded-2xl border border-line bg-surface p-5" aria-label="Exercise level">
      {state === null ? (
        <>
          <Lock className="size-8 text-copy-muted" aria-hidden="true" />
          <div className="space-y-2">
            <h2 className="font-display text-xl">Unlock this exercise</h2>
            <p className="text-sm text-copy-muted">Pick a weight you can lift for 12 clean reps.</p>
          </div>
          <WeightSheet mode="calibrate" exercise={exercise} onSave={saveWeight}>
            <Button disabled={pending} className="h-11 w-full rounded-xl">Calibrate</Button>
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
            <Progress value={state.bestRepsAtLevel / TARGET_REPS * 100} aria-label="Best at this level" aria-valuenow={state.bestRepsAtLevel} aria-valuemin={0} aria-valuemax={TARGET_REPS} aria-valuetext={`${state.bestRepsAtLevel} / ${TARGET_REPS}`} className="h-2" />
          </div>
          {state.weightKg !== state.startWeightKg && (
            <p className="text-sm text-copy-muted">
              Started at {formatKg(state.startWeightKg)} · {state.weightKg > state.startWeightKg ? "+" : ""}{Math.round((state.weightKg / state.startWeightKg - 1) * 100)}%
            </p>
          )}
          {round ? (
            <RoundTimer key={round.setId} endsAt={round.endsAt} seconds={seconds} roundNumber={round.number} result={round.result} onCancel={() => setRound(null)} onNext={startRound} nextButtonRef={nextButton} pending={pending}>
              <LogRepsSheet weightKg={round.state.weightKg} level={round.state.level} submittedReps={round.submittedReps} onSave={logReps} />
            </RoundTimer>
          ) : <div className="flex gap-3">
            <Button disabled={pending} onClick={startRound} className="h-11 flex-1 rounded-xl"><Play className="size-5" aria-hidden="true" />Start round</Button>
            <WeightSheet mode="adjust" exercise={exercise} state={state} onSave={saveWeight}>
              <Button disabled={pending} variant="outline" size="icon" className="size-11 rounded-xl" aria-label="Adjust weight"><SlidersHorizontal className="size-5" aria-hidden="true" /></Button>
            </WeightSheet>
          </div>}
        </>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {reward && <LevelUpOverlay level={reward.level} weightKg={reward.weightKg} onClose={closeReward} />}
    </section>
  );
}
