"use client";

import { useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, X } from "lucide-react";
import { generateWorkout, startWorkout } from "@/actions/workout";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PlanPreview } from "@/components/workout/plan-preview";
import { callAction } from "@/lib/action-result";
import { DURATIONS_MIN, FOCUS_CHOICES, FOCUS_HINTS, FOCUS_LABELS, type FocusChoice, type WorkoutPlan } from "@/lib/plan";
import type { TrainingProfile } from "@/lib/training-profile";

const toggleClass = "h-11 min-w-0 rounded-xl border-line px-2 data-[state=on]:border-ai/50 data-[state=on]:bg-ai-dim data-[state=on]:text-ai";

export function GenerateSheet({ children, progress, hasActiveWorkout, defaultDurationMin }: {
  children: ReactNode;
  progress: Record<string, { level: number; weightKg: number }>;
  hasActiveWorkout: boolean;
  defaultDurationMin: TrainingProfile["sessionMinutes"];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [durationMin, setDurationMin] = useState<(typeof DURATIONS_MIN)[number]>(defaultDurationMin);
  const [focus, setFocus] = useState<FocusChoice>("auto");
  const [preview, setPreview] = useState(false);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [pending, startTransition] = useTransition();
  const [request, setRequest] = useState<"generate" | "start" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const inputsRef = useRef<HTMLFormElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    if (preview) previewRef.current?.focus();
    else inputsRef.current?.querySelector<HTMLButtonElement>('[data-state="on"]')?.focus();
  }, [open, preview]);

  function generate() {
    if (saving.current) return;
    saving.current = true;
    setRequest("generate");
    setError(null);
    startTransition(async () => {
      try {
        const result = await callAction(() => generateWorkout({ durationMin, focus }));
        if (!result.ok) setError(result.error);
        else {
          setPlan(result.data);
          setPreview(true);
        }
      } finally {
        saving.current = false;
        setRequest(null);
      }
    });
  }

  function start() {
    if (!plan || saving.current) return;
    saving.current = true;
    setRequest("start");
    setError(null);
    startTransition(async () => {
      try {
        const result = await callAction(() => startWorkout({ plan }));
        if (!result.ok) setError(result.error);
        else {
          setOpen(false);
          router.push("/workout");
        }
      } finally {
        saving.current = false;
        setRequest(null);
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" showCloseButton={false} className="mx-auto max-h-[90dvh] max-w-md gap-5 overflow-y-auto rounded-t-3xl bg-elevated p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SheetHeader className="shrink-0 gap-2 p-0 pr-12">
          <SheetTitle className="flex items-center gap-2 font-display text-xl">
            <Sparkles className="size-5 text-ai" aria-hidden="true" />Generate workout
          </SheetTitle>
          <SheetDescription>Choose your time and training focus.</SheetDescription>
          <Link href="/settings/training" className="inline-flex min-h-11 items-center text-sm text-ai underline underline-offset-4">Training preferences</Link>
        </SheetHeader>
        <SheetClose asChild>
          <Button variant="ghost" size="icon" className="absolute top-2 right-2 size-11 rounded-xl" aria-label="Close">
            <X className="size-5" aria-hidden="true" />
          </Button>
        </SheetClose>
        {preview && plan ? (
          <div ref={previewRef} tabIndex={-1} className="space-y-5 outline-none">
            <PlanPreview plan={plan} progress={progress} />
            <div className="space-y-2">
              {error && <p role="alert" className="text-sm text-danger">{error}</p>}
              <Button disabled={pending} onClick={start} className="h-11 w-full rounded-xl bg-ai text-on-brand hover:bg-ai/90">
                {request === "start" ? "Starting…" : hasActiveWorkout ? "Add to current workout" : "Start workout"}
              </Button>
              <Button disabled={pending} variant="outline" onClick={generate} className="h-11 w-full rounded-xl">
                <Sparkles className={`size-5 text-ai ${request === "generate" ? "motion-safe:animate-pulse" : ""}`} aria-hidden="true" />
                {request === "generate" ? "Planning…" : "Regenerate"}
              </Button>
              <Button disabled={pending} variant="link" onClick={() => { setPreview(false); setError(null); }} className="h-11 w-full rounded-xl">Change inputs</Button>
            </div>
          </div>
        ) : (
          <form ref={inputsRef} className="space-y-5" onSubmit={(event) => { event.preventDefault(); generate(); }}>
            <div className="space-y-2">
              <h3 id={`${id}-duration`} className="text-sm font-medium">Duration</h3>
              <ToggleGroup disabled={pending} type="single" variant="outline" value={String(durationMin)} aria-labelledby={`${id}-duration`} className="grid w-full grid-cols-4 gap-2" onValueChange={(value) => {
                const next = DURATIONS_MIN.find((duration) => String(duration) === value);
                if (next !== undefined) setDurationMin(next);
              }}>
                {DURATIONS_MIN.map((duration) => <ToggleGroupItem key={duration} value={String(duration)} className={toggleClass}>{duration} min</ToggleGroupItem>)}
              </ToggleGroup>
            </div>
            <div className="space-y-2">
              <h3 id={`${id}-focus`} className="text-sm font-medium">Focus</h3>
              <ToggleGroup disabled={pending} type="single" variant="outline" value={focus} aria-labelledby={`${id}-focus`} aria-describedby={`${id}-hint`} className="grid w-full grid-cols-2 gap-2" onValueChange={(value) => {
                const next = FOCUS_CHOICES.find((choice) => choice === value);
                if (next !== undefined) setFocus(next);
              }}>
                {FOCUS_CHOICES.map((choice) => <ToggleGroupItem key={choice} value={choice} className={toggleClass}>{FOCUS_LABELS[choice]}</ToggleGroupItem>)}
              </ToggleGroup>
              <p id={`${id}-hint`} aria-live="polite" className="min-h-10 text-sm text-copy-muted">{FOCUS_HINTS[focus]}</p>
            </div>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <Button disabled={pending} type="submit" className="h-11 w-full rounded-xl bg-ai text-on-brand hover:bg-ai/90">
              <Sparkles className={`size-5 ${request === "generate" ? "motion-safe:animate-pulse" : ""}`} aria-hidden="true" />
              {request === "generate" ? "Planning…" : "Generate"}
            </Button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
