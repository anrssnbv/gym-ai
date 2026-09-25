"use client";

import { useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader,
  SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { DEFAULT_STEP_KG } from "@/lib/catalog";
import type { Exercise } from "@/lib/catalog";
import { formatKg, roundKg, STEP_LIMITS_KG, WEIGHT_MIN_KG } from "@/lib/game";
import type { LevelState } from "@/lib/game";

type WeightSheetProps = {
  exercise: Exercise;
  onSave: (weightKg: number, stepKg: number) => Promise<string | null>;
  children: ReactNode;
} & ({ mode: "calibrate"; state?: never } | { mode: "adjust"; state: LevelState });

export function WeightSheet(props: WeightSheetProps) {
  const { exercise, mode, onSave, children } = props;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitted = useRef(false);
  const id = useId();
  const weightRef = useRef<HTMLInputElement>(null);
  const existingWeight = mode === "adjust" ? props.state.weightKg : null;
  const weightUnit = exercise.equipment === "dumbbell" ? "per dumbbell"
    : exercise.equipment === "barbell" ? "including the bar"
    : exercise.id === "cable-crossover" ? "per stack, with both sides equal"
    : exercise.equipment === "cable" ? "as shown on the stack"
    : "shown on the stack, or total added plates";

  return (
    <Sheet open={open} onOpenChange={(next) => {
      if (submitted.current) return;
      setError(null);
      setOpen(next);
    }}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto max-h-dvh max-w-md gap-4 overflow-y-auto rounded-t-3xl bg-elevated p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          weightRef.current?.focus();
        }}
      >
        <SheetHeader className="gap-2 p-0 pr-12">
          <SheetTitle className="font-display text-xl">
            {mode === "calibrate" ? `Calibrate ${exercise.name}` : "Adjust weight"}
          </SheetTitle>
          <SheetDescription>
            {mode === "calibrate"
              ? "A weight you can lift for 12 clean reps. Hit 12 to increase by the step, up to this exercise’s limit."
              : "Changes the weight for this level. Your level stays the same."}
          </SheetDescription>
        </SheetHeader>
        <SheetClose asChild>
          <Button variant="ghost" size="icon" className="absolute top-2 right-2 size-11 rounded-xl" aria-label="Close">
            <X className="size-5" aria-hidden="true" />
          </Button>
        </SheetClose>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (submitted.current) return;
            const data = new FormData(event.currentTarget);
            const weight = Number(data.get("weight"));
            const step = Number(data.get("step"));
            if (roundKg(weight) > exercise.maxWeightKg && roundKg(weight) !== existingWeight) {
              setError(`Weight must be at most ${formatKg(exercise.maxWeightKg)} for this exercise.`);
              return;
            }
            submitted.current = true;
            setSaving(true);
            setError(null);
            try {
              const message = await onSave(weight, step);
              if (message) setError(message);
              else setOpen(false);
            } catch {
              setError("Couldn't reach the server. Try again.");
            } finally {
              submitted.current = false;
              setSaving(false);
            }
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`${id}-weight`}>
                {exercise.equipment === "dumbbell" ? "Weight per dumbbell" : "Weight"}
              </Label>
              <div className="relative">
                <Input ref={weightRef} id={`${id}-weight`} name="weight" type="number" inputMode="decimal" step="any" min={WEIGHT_MIN_KG} max={Math.max(exercise.maxWeightKg, existingWeight ?? 0)} aria-describedby={`${id}-limit`} required defaultValue={existingWeight ?? ""} className="h-11 rounded-xl pr-9 text-base md:text-base" />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-copy-muted" aria-hidden="true">kg</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${id}-step`}>Step per level</Label>
              <div className="relative">
                <Input id={`${id}-step`} name="step" type="number" inputMode="decimal" step="any" min={STEP_LIMITS_KG.min} max={STEP_LIMITS_KG.max} required defaultValue={mode === "adjust" ? props.state.stepKg : DEFAULT_STEP_KG[exercise.equipment]} className="h-11 rounded-xl pr-9 text-base md:text-base" />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-copy-muted" aria-hidden="true">kg</span>
              </div>
            </div>
          </div>
          <p id={`${id}-limit`} className="text-sm text-copy-muted">
            Exercise limit: {formatKg(exercise.maxWeightKg)} {weightUnit}.
            {existingWeight !== null && existingWeight > exercise.maxWeightKg && " Your existing weight is above this limit. You can keep it unchanged or choose a weight within the limit."}
          </p>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button disabled={saving} type="submit" className="h-11 w-full rounded-xl">
            {saving ? "Saving…" : mode === "calibrate" ? "Unlock level 1" : "Save"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
