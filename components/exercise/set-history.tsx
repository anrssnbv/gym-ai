"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { undoLastSet } from "@/actions/exercise";
import { LocalTime } from "@/components/local-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { callAction } from "@/lib/action-result";
import { formatKg } from "@/lib/game";

export interface HistorySet {
  id: string;
  createdAt: string;
  weightKg: number;
  reps: number;
  leveledUp: boolean;
}

export function SetHistory({ exerciseId, sets, disabled, onUndo, onPendingChange }: {
  exerciseId: string;
  sets: HistorySet[];
  disabled: boolean;
  onUndo: (setId: string) => void;
  onPendingChange: (pending: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);
  const [retryTarget, setRetryTarget] = useState<string | null>(null);

  function undo(setId: string) {
    if (saving.current || disabled) return;
    if (!retryTarget && !window.confirm("Undo this set? If it leveled you up, the level goes back too.")) return;
    const target = retryTarget ?? setId;
    saving.current = true;
    setRetryTarget(target);
    onPendingChange(true);
    setError(null);
    startTransition(async () => {
      try {
        const result = await callAction(() => undoLastSet({ exerciseId, setId: target }));
        if (result.ok) {
          setRetryTarget(null);
          onUndo(result.data.setId);
        } else {
          setError(result.error);
          if (result.stale) {
            setRetryTarget(null);
            router.refresh();
          }
        }
      } finally {
        saving.current = false;
        onPendingChange(false);
      }
    });
  }

  if (sets.length === 0 && !retryTarget && !error) return null;

  return (
    <section className="mt-8" aria-label="Set history">
      <h2 className="font-display text-xl text-copy">History</h2>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      {retryTarget && error && (
        <Button variant="outline" className="mt-3 h-11" disabled={pending || disabled} onClick={() => undo(retryTarget)}>Retry Undo</Button>
      )}
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
                <Button variant="outline" className="h-11" disabled={pending || disabled || retryTarget !== null} onClick={() => undo(set.id)}>Undo</Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
