export const TARGET_REPS = 12;
export const REPS_LIMITS = { min: 1, max: 100 };
export const WEIGHT_MIN_KG = 0.5;
export const STEP_LIMITS_KG = { min: 0.25, max: 50 };
export const SESSION_IDLE_MS = 3 * 60 * 60 * 1000;
export const RANKS = [
  { name: "Rookie", min: 0 },
  { name: "Iron", min: 10 },
  { name: "Bronze", min: 30 },
  { name: "Silver", min: 60 },
  { name: "Gold", min: 100 },
  { name: "Platinum", min: 150 },
  { name: "Diamond", min: 250 },
] as const;

export function rankFor(power: number): { name: string; min: number; nextMin: number | null } {
  let index = 0;
  while (index + 1 < RANKS.length && power >= RANKS[index + 1].min) index++;
  return { ...RANKS[index], nextMin: RANKS[index + 1]?.min ?? null };
}

export function heatLevel(setCount: number): 0 | 1 | 2 | 3 {
  if (setCount <= 0) return 0;
  if (setCount <= 3) return 1;
  if (setCount <= 8) return 2;
  return 3;
}

export function isSessionStale(lastActivityAt: Date, now: Date): boolean {
  return now.getTime() - lastActivityAt.getTime() > SESSION_IDLE_MS;
}

export function sessionEnd(lastActivityAt: Date, now: Date): Date {
  return isSessionStale(lastActivityAt, now) ? lastActivityAt : now;
}

export function sessionEndAt(endedAt: Date | null, lastActivityAt: Date, now: Date): Date {
  return endedAt ?? sessionEnd(lastActivityAt, now);
}

export function powerLevel(levels: number[]): number {
  return levels.reduce((total, level) => total + level - 1, 0);
}

export interface LevelState {
  level: number;
  weightKg: number;
  stepKg: number;
  startWeightKg: number;
  bestRepsAtLevel: number;
}

export function roundKg(kg: number): number {
  return Math.round((kg + Number.EPSILON) * 100) / 100;
}

export function formatKg(kg: number): string {
  return `${roundKg(kg)} kg`;
}

export function summarizeSets(sets: { weightKg: number; reps: number; leveledUp: boolean }[]) {
  return sets.reduce((totals, set) => ({
    setCount: totals.setCount + 1,
    volumeKg: roundKg(totals.volumeKg + set.weightKg * set.reps),
    levelUps: totals.levelUps + Number(set.leveledUp),
  }), { setCount: 0, volumeKg: 0, levelUps: 0 });
}

export function formatDuration(ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

export function formatVolume(kg: number): string {
  return kg < 1000 ? formatKg(kg) : `${(kg / 1000).toFixed(1)} t`;
}

export function calibrate(weightKg: number, stepKg: number): LevelState {
  const weight = roundKg(weightKg);
  return {
    level: 1,
    weightKg: weight,
    stepKg: roundKg(stepKg),
    startWeightKg: weight,
    bestRepsAtLevel: 0,
  };
}

export function adjust(state: LevelState, weightKg: number, stepKg: number): LevelState {
  const weight = roundKg(weightKg);
  return {
    ...state,
    weightKg: weight,
    stepKg: roundKg(stepKg),
    bestRepsAtLevel: weight === roundKg(state.weightKg) ? state.bestRepsAtLevel : 0,
  };
}

export function roundSeconds(compound: boolean): number {
  return compound ? 120 : 60;
}

export function applySet(state: LevelState, reps: number, maxWeightKg: number): { state: LevelState; leveledUp: boolean; limitReached: boolean } {
  const nextWeightKg = roundKg(state.weightKg + state.stepKg);
  const limitReached = reps >= TARGET_REPS && nextWeightKg > maxWeightKg;
  const leveledUp = reps >= TARGET_REPS && !limitReached;
  return {
    state: leveledUp
      ? {
          ...state,
          level: state.level + 1,
          weightKg: nextWeightKg,
          bestRepsAtLevel: 0,
        }
      : { ...state, bestRepsAtLevel: Math.max(state.bestRepsAtLevel, reps) },
    leveledUp,
    limitReached,
  };
}
