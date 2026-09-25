import { Badge } from "@/components/ui/badge";
import { getExercise } from "@/lib/catalog";
import { formatKg } from "@/lib/game";
import { FOCUS_LABELS, type WorkoutPlan } from "@/lib/plan";

export function PlanPreview({ plan, progress = {} }: { plan: WorkoutPlan; progress?: Record<string, { level: number; weightKg: number }> }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-xl">{plan.title}</h3>
          <Badge className="bg-ai-dim text-ai">{FOCUS_LABELS[plan.focus]}</Badge>
        </div>
        <p className="text-sm text-copy-muted">{plan.summary}</p>
      </div>
      <ol className="list-decimal space-y-3 pl-6 marker:font-display marker:text-copy-muted">
        {plan.exercises.map((item) => {
          const exercise = getExercise(item.exerciseId);
          if (!exercise) return null;
          return (
            <li key={item.exerciseId} className="pl-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="font-medium">{exercise.name}</span>
                <span className="text-sm tabular-nums text-copy-muted">{item.sets} × 12</span>
              </div>
              <p className="mt-1 text-sm tabular-nums text-copy-muted">
                {progress[item.exerciseId] ? `LV ${progress[item.exerciseId].level} · ${formatKg(progress[item.exerciseId].weightKg)}` : "New — you'll calibrate it"}
              </p>
              <p className="mt-1 text-sm text-ai">{item.note}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
