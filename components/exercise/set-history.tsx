"use client";

import { useRef, useState, useTransition } from "react";
import { undoLastSet } from "@/actions/exercise";
import { LocalTime } from "@/components/local-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { callAction } from "@/lib/action-result";
import { formatKg } from "@/lib/game";

interface HistorySet {
  id: string;
  createdAt: string;
  weightKg: number;
  reps: number;
  leveledUp: boolean;
}

export function SetHistory({ exerciseId, sets }: { exerciseId: string; sets: HistorySet[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);

  function undo() {
    if (saving.current || !window.confirm("Undo this set? If it leveled you up, the level goes back too.")) return;
    saving.current = true;
    setError(null);
    startTransition(async () => {
      try {
        const result = await callAction(() => undoLastSet({ exerciseId }));
        if (!result.ok) setError(result.error);
      } finally {
        saving.current = false;
      }
    });
  }

  if (sets.length === 0) return null;

  return (
    <section className="mt-8" aria-label="Set history">
      <h2 className="font-display text-xl text-copy">History</h2>
      <ul className="mt-3 divide-y divide-line">
        {sets.map((set, index) => (
          <li key={set.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="space-y-1">
              <p className="text-xs text-copy-muted">
                <LocalTime date={set.createdAt} options={{ month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }} />
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm tabular-nums">{formatKg(set.weightKg)} × {set.reps}</span>
                {set.leveledUp && <Badge variant="secondary" className="text-level">LV ↑</Badge>}
              </div>
            </div>
            {index === 0 && (
              <div className="flex items-center gap-2">
                {error && <p role="alert" className="text-sm text-danger">{error}</p>}
                <Button variant="outline" className="h-11" disabled={pending} onClick={undo}>Undo</Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
