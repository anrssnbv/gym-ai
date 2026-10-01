import { Badge } from "@/components/ui/badge";
import { ExerciseDemo } from "@/components/exercise/exercise-demo";
import { getExercise } from "@/lib/catalog";
import { formatKg } from "@/lib/game";
import { estimatePlanMinutes, FOCUS_LABELS, type WorkoutPlan } from "@/lib/plan";

export function PlanPreview({ plan, timeLimitMin, progress = {} }: { plan: WorkoutPlan; timeLimitMin: number; progress?: Record<string, { level: number; weightKg: number }> }) {
  const estimatedMinutes = estimatePlanMinutes(plan);
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-xl">{plan.title}</h3>
          <Badge>{FOCUS_LABELS[plan.focus]}</Badge>
        </div>
        <p className="text-sm text-copy-muted">{plan.summary}</p>
        <p className="text-sm tabular-nums text-copy-secondary">{plan.exercises.length} exercises · {plan.exercises.reduce((total, item) => total + item.sets, 0)} sets · about {estimatedMinutes} min</p>
        <p className="text-sm text-copy-muted">Includes working sets and rest. Warm-up is extra.</p>
        {estimatedMinutes < timeLimitMin && <p className="text-sm text-copy-muted">Shorter than your {timeLimitMin} min limit. The plan keeps the chosen exercise and set distribution without adding extra sets to fill time.</p>}
      </div>
      <ol className="list-decimal space-y-4 pl-6 marker:text-copy-muted">
        {plan.exercises.map((item) => {
          const exercise = getExercise(item.exerciseId);
          if (!exercise) return null;
          return (
            <li key={item.exerciseId} className="border-b border-line pb-4 pl-1 last:border-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="font-medium">{exercise.name}</span>
                <span className="text-sm tabular-nums text-copy-muted capitalize">{exercise.pattern} · {item.sets} × 12</span>
              </div>
              <p className="mt-1 text-sm tabular-nums text-copy-muted">
                {progress[item.exerciseId] ? `LV ${progress[item.exerciseId].level} · ${formatKg(progress[item.exerciseId].weightKg)}` : "New — you'll calibrate it"}
              </p>
              <p className="mt-1 text-sm text-copy-secondary">{item.note}</p>
              <ExerciseDemo exerciseId={exercise.id} />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
