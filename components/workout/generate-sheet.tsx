"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PlanPreview } from "@/components/workout/plan-preview";
import { DURATIONS_MIN, FOCUS_CHOICES, FOCUS_HINTS, FOCUS_LABELS, type FocusChoice, type WorkoutPlan } from "@/lib/plan";

const SAMPLE_PLAN: WorkoutPlan = {
  focus: "pull",
  title: "Pull day",
  summary: "Sample plan — the AI coach arrives in the next update.",
  exercises: [
    { exerciseId: "lat-pulldown", sets: 3, note: "Pull your elbows down with a controlled return." },
    { exerciseId: "seated-cable-row", sets: 3, note: "Keep your torso steady as you row." },
    { exerciseId: "reverse-pec-deck", sets: 3, note: "Lead with your elbows and keep the movement smooth." },
    { exerciseId: "straight-arm-pulldown", sets: 2, note: "Keep a soft bend in your elbows." },
    { exerciseId: "barbell-curl", sets: 3, note: "Keep your upper arms still." },
    { exerciseId: "hammer-curl", sets: 2, note: "Use a neutral grip and lower with control." },
  ],
};

const toggleClass = "h-11 min-w-0 rounded-xl border-line px-2 data-[state=on]:border-ai/50 data-[state=on]:bg-ai-dim data-[state=on]:text-ai";

export function GenerateSheet({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [durationMin, setDurationMin] = useState<(typeof DURATIONS_MIN)[number]>(60);
  const [focus, setFocus] = useState<FocusChoice>("auto");
  const [preview, setPreview] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const inputsRef = useRef<HTMLFormElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    if (preview) previewRef.current?.focus();
    else inputsRef.current?.querySelector<HTMLButtonElement>('[data-state="on"]')?.focus();
  }, [open, preview]);

  return (
    <Sheet open={open} onOpenChange={(next) => { setOpen(next); if (!next) setPreview(false); }}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" showCloseButton={false} className="mx-auto max-h-[90dvh] max-w-md gap-5 overflow-y-auto rounded-t-3xl bg-elevated p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SheetHeader className="shrink-0 gap-2 p-0 pr-12">
          <SheetTitle className="flex items-center gap-2 font-display text-xl">
            <Sparkles className="size-5 text-ai" aria-hidden="true" />Generate workout
          </SheetTitle>
          <SheetDescription>Choose your time and training focus.</SheetDescription>
        </SheetHeader>
        <SheetClose asChild>
          <Button variant="ghost" size="icon" className="absolute top-2 right-2 size-11 rounded-xl" aria-label="Close">
            <X className="size-5" aria-hidden="true" />
          </Button>
        </SheetClose>
        {preview ? (
          <div ref={previewRef} tabIndex={-1} className="space-y-5 outline-none">
            <PlanPreview plan={SAMPLE_PLAN} />
            <div className="space-y-2">
              <Button disabled className="h-11 w-full rounded-xl bg-ai text-on-brand">Start workout</Button>
              <Button variant="outline" onClick={() => setPreview(false)} className="h-11 w-full rounded-xl">Change inputs</Button>
            </div>
          </div>
        ) : (
          <form ref={inputsRef} className="space-y-5" onSubmit={(event) => { event.preventDefault(); setPreview(true); }}>
            <div className="space-y-2">
              <h3 id={`${id}-duration`} className="text-sm font-medium">Duration</h3>
              <ToggleGroup type="single" variant="outline" value={String(durationMin)} aria-labelledby={`${id}-duration`} className="grid w-full grid-cols-4 gap-2" onValueChange={(value) => {
                const next = DURATIONS_MIN.find((duration) => String(duration) === value);
                if (next !== undefined) setDurationMin(next);
              }}>
                {DURATIONS_MIN.map((duration) => <ToggleGroupItem key={duration} value={String(duration)} className={toggleClass}>{duration} min</ToggleGroupItem>)}
              </ToggleGroup>
            </div>
            <div className="space-y-2">
              <h3 id={`${id}-focus`} className="text-sm font-medium">Focus</h3>
              <ToggleGroup type="single" variant="outline" value={focus} aria-labelledby={`${id}-focus`} aria-describedby={`${id}-hint`} className="grid w-full grid-cols-2 gap-2" onValueChange={(value) => {
                const next = FOCUS_CHOICES.find((choice) => choice === value);
                if (next !== undefined) setFocus(next);
              }}>
                {FOCUS_CHOICES.map((choice) => <ToggleGroupItem key={choice} value={choice} className={toggleClass}>{FOCUS_LABELS[choice]}</ToggleGroupItem>)}
              </ToggleGroup>
              <p id={`${id}-hint`} aria-live="polite" className="min-h-10 text-sm text-copy-muted">{FOCUS_HINTS[focus]}</p>
            </div>
            <Button type="submit" className="h-11 w-full rounded-xl bg-ai text-on-brand hover:bg-ai/90">
              <Sparkles className="size-5" aria-hidden="true" />Generate
            </Button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
