"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeSavedWorkout, startSavedWorkout } from "@/actions/workout";
import { Button } from "@/components/ui/button";
import { callAction } from "@/lib/action-result";

type SavedItem = { id: string; title: string; focus: string; exercises: number; sets: number; minutes: number; valid: boolean };

export function SavedWorkouts({ items }: { items: SavedItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<Record<string, string>>({});
  const request = useRef<{ id: string; requestId: string } | null>(null);
  const busy = useRef(false);

  function start(id: string) {
    if (busy.current) return;
    busy.current = true;
    if (request.current?.id !== id) request.current = { id, requestId: crypto.randomUUID() };
    setBusyId(id);
    setError((old) => ({ ...old, [id]: "" }));
    startTransition(async () => {
      try {
        const result = await callAction(() => startSavedWorkout({ savedWorkoutId: id, requestId: request.current!.requestId }));
        if (result.ok) {
          request.current = null;
          router.push("/workout");
          router.refresh();
        } else setError((old) => ({ ...old, [id]: result.error }));
      } finally { busy.current = false; setBusyId(null); }
    });
  }

  function remove(id: string) {
    if (busy.current || !window.confirm("Remove this saved workout?")) return;
    busy.current = true;
    setBusyId(id);
    setError((old) => ({ ...old, [id]: "" }));
    startTransition(async () => {
      try {
        const result = await callAction(() => removeSavedWorkout(id));
        if (result.ok) router.refresh();
        else setError((old) => ({ ...old, [id]: result.error }));
      } finally { busy.current = false; setBusyId(null); }
    });
  }

  return <section className="space-y-4" aria-labelledby="saved-workouts-heading">
    <h2 id="saved-workouts-heading" className="font-display text-xl">Saved workouts</h2>
    {items.length === 0 ? <p className="text-sm text-copy-muted">No saved workouts yet. Save a completed generated workout to repeat it here.</p> :
      <ul className="space-y-3">{items.map((item) => <li key={item.id} className="min-w-0 space-y-3 rounded-2xl border border-line bg-surface p-4">
        <h3 className="break-words font-semibold">{item.title}</h3>
        <p className="text-sm text-copy-secondary">{item.focus} · {item.exercises} exercises · {item.sets} sets · about {item.minutes} min</p>
        {!item.valid && <p className="text-sm text-danger">This saved plan is no longer valid.</p>}
        {error[item.id] && <p role="alert" className="text-sm text-danger">{error[item.id]}</p>}
        <div className="grid grid-cols-2 gap-2">
          <Button className="h-12 min-w-0 rounded-xl" disabled={!item.valid || pending} onClick={() => start(item.id)}>{busyId === item.id && pending ? "Starting…" : "Start again"}</Button>
          <Button variant="outline" className="h-12 min-w-0 rounded-xl" disabled={pending} onClick={() => remove(item.id)}>Remove</Button>
        </div>
      </li>)}</ul>}
  </section>;
}
