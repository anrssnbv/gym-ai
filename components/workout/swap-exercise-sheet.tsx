"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { swapPlannedExercise } from "@/actions/workout";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { callAction } from "@/lib/action-result";
import type { Exercise } from "@/lib/catalog";

export function SwapExerciseSheet({ sessionId, stepIndex, exercise, sets, alternatives, compact = false }: {
  sessionId: string;
  stepIndex: number;
  exercise: Exercise;
  sets: number;
  alternatives: Exercise[];
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const saving = useRef(false);
  const swapped = useRef(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const confirmRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => { if (open && selected) confirmRef.current?.focus(); }, [open, selected]);

  function confirm() {
    if (!selected || saving.current) return;
    saving.current = true;
    setError(null);
    startTransition(async () => {
      try {
        const result = await callAction(() => swapPlannedExercise({
          sessionId, stepIndex, expectedExerciseId: exercise.id, replacementId: selected.id,
        }));
        if (!result.ok) {
          setError(result.error);
          if (result.stale) router.refresh();
        } else {
          swapped.current = true;
          setOpen(false);
        }
      } finally {
        saving.current = false;
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={(next) => {
      if (saving.current) return;
      if (next) { setSelected(null); setError(null); }
      setOpen(next);
    }}>
      <SheetTrigger asChild>
        <Button variant="outline" className={compact ? "min-h-11 rounded-xl" : "min-h-11 w-full rounded-xl"}>Swap exercise</Button>
      </SheetTrigger>
      <SheetContent side="bottom" showCloseButton={false} className="mx-auto max-h-[90dvh] max-w-md gap-4 overflow-y-auto rounded-t-3xl bg-elevated p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        onOpenAutoFocus={(event) => { event.preventDefault(); titleRef.current?.focus(); }}
        onCloseAutoFocus={(event) => {
          if (!swapped.current) return;
          event.preventDefault();
          swapped.current = false;
          document.getElementById(`plan-step-${stepIndex}`)?.focus();
        }}>
        <SheetHeader className="gap-2 p-0 pr-12">
          <SheetTitle ref={titleRef} tabIndex={-1} className="font-display text-xl">Swap exercise</SheetTitle>
          <SheetDescription>Replace {exercise.name} · {sets} planned {sets === 1 ? "set" : "sets"}. Completed sets stay in your workout.</SheetDescription>
        </SheetHeader>
        <SheetClose asChild>
          <Button variant="ghost" size="icon" className="absolute top-2 right-2 size-11 rounded-xl" aria-label="Close"><X className="size-5" aria-hidden="true" /></Button>
        </SheetClose>
        {selected ? (
          <div className="space-y-4">
            <h3 ref={confirmRef} tabIndex={-1} className="font-display text-lg">Confirm replacement</h3>
            <p className="text-sm text-copy-secondary">Replace <strong className="text-copy">{exercise.name}</strong> with <strong className="text-copy">{selected.name}</strong>? The {sets} planned {sets === 1 ? "set stays" : "sets stay"} in this workout.</p>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <div className="space-y-2">
              <Button disabled={pending} onClick={confirm} className="min-h-11 w-full rounded-xl">{pending ? "Saving…" : error ? "Retry swap" : "Replace exercise"}</Button>
              <Button disabled={pending} variant="outline" onClick={() => { setSelected(null); setError(null); }} className="min-h-11 w-full rounded-xl">Back to alternatives</Button>
            </div>
          </div>
        ) : alternatives.length ? (
          <ul className="space-y-2" aria-label="Replacement exercises">
            {alternatives.map((option) => (
              <li key={option.id} className="rounded-xl border border-line p-3">
                <p className="font-medium break-words">{option.name}</p>
                <p className="mt-1 text-sm capitalize text-copy-muted">{option.equipment}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button variant="outline" className="min-h-11 rounded-xl" onClick={() => setSelected(option)}>Choose {option.name}</Button>
                  <Button asChild variant="link" className="h-auto min-h-11 w-full justify-start rounded-xl py-2 text-left whitespace-normal"><Link href={`/exercises/${option.groupId}/${option.id}`}>Movement guide for {option.name}</Link></Button>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-copy-secondary">No suitable replacement is available with your current equipment preferences.</p>}
      </SheetContent>
    </Sheet>
  );
}
