import Image from "next/image";
import type { ReactNode } from "react";

export function AuthScreen({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 py-8">
        <header className="space-y-3 text-center">
          <Image src="/icon.svg" alt="Gym AI icon" width={64} height={64} className="mx-auto rounded-2xl" />
          <h1 className="font-display text-3xl">Gym AI</h1>
          <p className="text-copy-secondary">Level up every lift.</p>
          <div className="space-y-1 text-sm text-copy-muted">
            <p>Calibrate once.</p>
            <p>Hit 12 reps.</p>
            <p>Level up.</p>
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
