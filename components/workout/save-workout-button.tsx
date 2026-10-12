"use client";

import { useRef, useState, useTransition } from "react";
import { saveWorkout } from "@/actions/workout";
import { Button } from "@/components/ui/button";
import { callAction } from "@/lib/action-result";

export function SaveWorkoutButton({ sessionId, initiallySaved }: { sessionId: string; initiallySaved: boolean }) {
  const [saved, setSaved] = useState(initiallySaved);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);
  return <div className="space-y-2">
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <Button className="h-12 w-full rounded-xl" disabled={saved || pending} onClick={() => {
      if (busy.current) return;
      busy.current = true;
      setError(null);
      startTransition(async () => {
        try {
          const result = await callAction(() => saveWorkout(sessionId));
          if (result.ok) setSaved(true);
          else setError(`${result.error} Retry saving.`);
        } finally { busy.current = false; }
      });
    }}>{saved ? "Saved" : pending ? "Saving…" : "Save workout"}</Button>
  </div>;
}
