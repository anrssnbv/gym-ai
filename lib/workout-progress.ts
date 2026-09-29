export function workoutProgress<E extends { exerciseId: string; sets: number }, T extends { exerciseId: string }>(
  exercises: E[],
  savedSets: T[],
) {
  const remaining = new Map(exercises.map((exercise) => [exercise.exerciseId, exercise.sets]));
  const extras = savedSets.filter((set) => {
    const count = remaining.get(set.exerciseId) ?? 0;
    if (count === 0) return true;
    remaining.set(set.exerciseId, count - 1);
    return false;
  });
  const steps = exercises.map((exercise) => ({
    ...exercise,
    done: exercise.sets - remaining.get(exercise.exerciseId)!,
  }));
  return {
    steps,
    completed: steps.reduce((total, step) => total + step.done, 0),
    total: steps.reduce((total, step) => total + step.sets, 0),
    extras,
  };
}
