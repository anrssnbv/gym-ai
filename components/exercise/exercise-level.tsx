"use client";

import { useCallback, useRef, useState } from "react";
import { Lock, Play, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { WeightSheet } from "@/components/exercise/weight-sheet";
import { RoundTimer } from "@/components/exercise/round-timer";
import { LogRepsSheet } from "@/components/exercise/log-reps-sheet";
import { LevelUpOverlay } from "@/components/exercise/level-up-overlay";
import type { Exercise } from "@/lib/catalog";
import { applySet, formatKg, roundSeconds, TARGET_REPS } from "@/lib/game";
import type { LevelState } from "@/lib/game";

interface Round {
  endsAt: number;
  number: number;
  state: LevelState;
  result: string | null;
}

export function ExerciseLevel({ exercise }: { exercise: Exercise }) {
  const [state, setState] = useState<LevelState | null>(null);
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
    if (!state) return;
    setRound({ endsAt: Date.now() + seconds * 1000, number: roundsLogged + 1, state, result: null });
  }

  function logReps(reps: number) {
    if (!round || round.result !== null) return;
    const outcome = applySet(round.state, reps);
    setState(outcome.state);
    setRoundsLogged((count) => count + 1);
    const message = reps === 11 ? "So close" : reps >= 9 ? "Almost there" : "Keep going";
    setRound({ ...round, result: outcome.leveledUp ? "Level cleared!" : `${message} — ${reps} / ${TARGET_REPS}` });
    if (outcome.leveledUp) setReward(outcome.state);
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
          <WeightSheet mode="calibrate" exercise={exercise} onSave={setState}>
            <Button className="h-11 w-full rounded-xl">Calibrate</Button>
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
            <RoundTimer key={round.endsAt} endsAt={round.endsAt} seconds={seconds} roundNumber={round.number} result={round.result} onCancel={() => setRound(null)} onNext={startRound} nextButtonRef={nextButton}>
              <LogRepsSheet weightKg={round.state.weightKg} level={round.state.level} onSave={logReps} />
            </RoundTimer>
          ) : <div className="flex gap-3">
            <Button onClick={startRound} className="h-11 flex-1 rounded-xl"><Play className="size-5" aria-hidden="true" />Start round</Button>
            <WeightSheet mode="adjust" exercise={exercise} state={state} onSave={setState}>
              <Button variant="outline" size="icon" className="size-11 rounded-xl" aria-label="Adjust weight"><SlidersHorizontal className="size-5" aria-hidden="true" /></Button>
            </WeightSheet>
          </div>}
        </>
      )}
      {reward && <LevelUpOverlay level={reward.level} weightKg={reward.weightKg} onClose={closeReward} />}
    </section>
  );
}
