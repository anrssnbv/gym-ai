"use client";

import { useEffect, useState, type ReactNode, type Ref } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface RoundTimerProps {
  endsAt: number;
  seconds: number;
  roundNumber: number;
  result: string | null;
  onCancel: () => void;
  onNext: () => void;
  nextButtonRef: Ref<HTMLButtonElement>;
  children: ReactNode;
  pending?: boolean;
}

export function RoundTimer({ endsAt, seconds, roundNumber, result, onCancel, onNext, nextButtonRef, children, pending = false }: RoundTimerProps) {
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));

  useEffect(() => {
    let vibrated = false;
    function update() {
      const next = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemaining(next);
      if (next === 0 && !vibrated) {
        vibrated = true;
        navigator.vibrate?.(200);
      }
    }
    const interval = window.setInterval(update, 250);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", update);
    };
  }, [endsAt]);

  useEffect(() => {
    let disposed = false;
    let pending = false;
    let lock: WakeLockSentinel | undefined;

    async function acquire() {
      if (disposed || pending || document.visibilityState !== "visible" || (lock && !lock.released)) return;
      pending = true;
      try {
        const acquired = await navigator.wakeLock?.request("screen");
        if (disposed || document.visibilityState !== "visible") {
          await acquired?.release();
        } else {
          lock = acquired;
        }
      } catch {
        // Wake lock can be unavailable or denied by the browser.
      } finally {
        pending = false;
      }
    }

    void acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", acquire);
      void lock?.release().catch(() => {});
    };
  }, [endsAt]);

  const time = `${Math.floor(remaining / 60).toString().padStart(2, "0")}:${(remaining % 60).toString().padStart(2, "0")}`;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-copy-muted">Round {roundNumber}</p>
        <p className="font-mono text-5xl tabular-nums" role="timer" aria-label="Round time remaining">{time}</p>
        <Progress value={remaining / seconds * 100} aria-label="Round time remaining" aria-valuenow={remaining} aria-valuemin={0} aria-valuemax={seconds} aria-valuetext={`${remaining} seconds remaining`} className="h-2" />
      </div>
      <div aria-live="polite" className="space-y-2 text-sm">
        {result !== null && <p>{result}</p>}
        {remaining === 0 && <p className="text-copy-muted">{result === null ? "Time's up — log your reps" : "Next round ready"}</p>}
      </div>
      {result === null ? (
        <div className="flex gap-3">
          {children}
          <Button disabled={pending} variant="secondary" className="h-11 rounded-xl" onClick={onCancel}>Cancel</Button>
        </div>
      ) : (
        <Button disabled={pending} ref={nextButtonRef} autoFocus className="h-11 w-full rounded-xl" onClick={onNext}>Next round</Button>
      )}
    </div>
  );
}
