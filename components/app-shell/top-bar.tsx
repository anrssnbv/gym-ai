import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { SlidersHorizontal } from "lucide-react";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-page/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-md items-center justify-between px-4">
        <Link href="/" className="inline-flex min-h-11 items-center font-display text-xl font-bold text-copy">
          Gym AI
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/settings/training" aria-label="Training preferences" className="inline-flex size-11 items-center justify-center rounded-xl text-copy-secondary hover:bg-subtle focus-visible:outline-2 focus-visible:outline-brand">
            <SlidersHorizontal className="size-5" aria-hidden="true" />
          </Link>
          <UserButton appearance={{ elements: { userButtonTrigger: "min-h-11 min-w-11 justify-center" } }} />
        </div>
      </div>
    </header>
  );
}
