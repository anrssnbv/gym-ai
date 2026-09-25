"use client";

import { useEffect } from "react";
import { ChevronsUp } from "lucide-react";
import { formatKg } from "@/lib/game";

interface LevelUpOverlayProps {
  level: number;
  weightKg: number;
  onClose: () => void;
}

export function LevelUpOverlay({ level, weightKg, onClose }: LevelUpOverlayProps) {
  useEffect(() => {
    navigator.vibrate?.([80, 40, 120]);
    const timeout = window.setTimeout(onClose, 1500);
    return () => window.clearTimeout(timeout);
  }, [onClose]);

  return (
    <div role="status" aria-live="polite" className="fixed inset-0 z-[60] bg-page/90">
      <button type="button" autoFocus onClick={onClose} onKeyDown={(event) => { if (event.key === "Tab") event.preventDefault(); }} aria-label={`Level ${level} cleared. New weight: ${formatKg(weightKg)}. Dismiss`} className="flex size-full flex-col items-center justify-center gap-4 p-6 text-center focus-visible:outline-2 focus-visible:outline-brand">
        <div className="flex flex-col items-center gap-4 motion-safe:animate-[level-up-scale_350ms_ease-out,level-up-glow_1500ms_ease-out]">
          <ChevronsUp className="size-16 text-level" aria-hidden="true" />
          <p className="font-display text-5xl text-level">LEVEL {level}</p>
          <p className="text-xl">New weight: {formatKg(weightKg)}</p>
        </div>
      </button>
    </div>
  );
}
