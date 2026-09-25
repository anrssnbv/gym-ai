export const TARGET_REPS = 12;
export const WEIGHT_LIMITS_KG = { min: 0.5, max: 1000 };
export const STEP_LIMITS_KG = { min: 0.25, max: 50 };

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
