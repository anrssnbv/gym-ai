import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-page/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-md items-center justify-between px-4">
        <Link href="/" className="font-display text-xl font-bold text-copy">
          Gym AI
        </Link>
        <UserButton appearance={{ elements: { userButtonTrigger: "min-h-11 min-w-11 justify-center" } }} />
      </div>
    </header>
  );
}
