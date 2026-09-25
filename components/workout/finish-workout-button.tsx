"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { finishWorkout } from "@/actions/workout";
import { Button } from "@/components/ui/button";
import { callAction } from "@/lib/action-result";

export function FinishWorkoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);

  function finish() {
    if (saving.current) return;
    saving.current = true;
    setError(null);
    startTransition(async () => {
      try {
        const result = await callAction(() => finishWorkout());
        if (!result.ok) setError(result.error);
        else if (result.data.sessionId) router.push(`/workout/${result.data.sessionId}`);
        else router.refresh();
      } finally {
        saving.current = false;
      }
    });
  }

  return (
    <div className="space-y-3">
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Button className="h-12 w-full rounded-xl" disabled={pending} onClick={finish}>
        {pending ? "Finishing…" : "Finish workout"}
      </Button>
    </div>
  );
}
