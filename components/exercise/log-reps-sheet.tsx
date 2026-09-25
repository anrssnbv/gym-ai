"use client";

import { useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { formatKg, REPS_LIMITS } from "@/lib/game";

interface LogRepsSheetProps {
  weightKg: number;
  level: number;
  onSave: (reps: number) => void;
}

export function LogRepsSheet({ weightKg, level, onSave }: LogRepsSheetProps) {
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const submitted = useRef(false);
  const id = useId();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button className="h-11 flex-1 rounded-xl">Log reps</Button></SheetTrigger>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto max-h-dvh max-w-md overflow-y-auto rounded-t-3xl bg-elevated p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        onOpenAutoFocus={(event) => { event.preventDefault(); input.current?.focus(); }}
      >
        <SheetHeader className="gap-2 p-0 pr-12">
          <SheetTitle className="font-display text-xl">How many reps?</SheetTitle>
          <SheetDescription>{formatKg(weightKg)} · LV {level}</SheetDescription>
        </SheetHeader>
        <SheetClose asChild>
          <Button variant="ghost" size="icon" className="absolute top-2 right-2 size-11 rounded-xl" aria-label="Close"><X className="size-5" aria-hidden="true" /></Button>
        </SheetClose>
        <form className="space-y-4" onSubmit={(event) => {
          event.preventDefault();
          if (submitted.current) return;
          submitted.current = true;
          onSave(Number(new FormData(event.currentTarget).get("reps")));
          setOpen(false);
        }}>
          <Label htmlFor={id} className="sr-only">Reps</Label>
          <Input ref={input} id={id} name="reps" type="number" inputMode="numeric" step="1" min={REPS_LIMITS.min} max={REPS_LIMITS.max} required className="h-16 rounded-xl text-center font-mono text-3xl tabular-nums md:text-3xl" />
          <Button type="submit" className="h-11 w-full rounded-xl">Save</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
