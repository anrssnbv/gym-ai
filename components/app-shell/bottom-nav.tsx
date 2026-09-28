"use client";

import { Dumbbell, Flame, House } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Home", href: "/", icon: House },
  { label: "Exercises", href: "/exercises", icon: Dumbbell },
  { label: "Workout", href: "/workout", icon: Flame },
] as const;

function NavLabel({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  return <span aria-live="polite">{pending ? `Opening ${label}…` : label}</span>;
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex h-16 w-full max-w-md">
        {tabs.map(({ label, href, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== "/" && pathname.startsWith(`${href}/`));

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-1 text-xs ${active ? "text-brand" : "text-copy-muted"}`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <NavLabel label={label} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
