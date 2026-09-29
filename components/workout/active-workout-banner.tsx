"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ElapsedTime } from "@/components/local-time";
import { isSessionStale } from "@/lib/game";

interface ActiveSession {
  id: string;
  startedAt: string;
  lastActivityAt: string;
  setCount: number;
}

function subscribeActivity(onChange: () => void) {
  const interval = window.setInterval(onChange, 30_000);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.clearInterval(interval);
    document.removeEventListener("visibilitychange", onChange);
  };
}

export function ActiveWorkoutBanner({ session }: { session: ActiveSession | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const refreshedActivity = useRef<string | null>(null);
  const lastActivityAt = session?.lastActivityAt;
  const stale = useSyncExternalStore(
    subscribeActivity,
    () => !!lastActivityAt && isSessionStale(new Date(lastActivityAt), new Date()),
    () => false,
  );

  useEffect(() => {
    if (stale && lastActivityAt && refreshedActivity.current !== lastActivityAt) {
      refreshedActivity.current = lastActivityAt;
      router.refresh();
    }
  }, [stale, lastActivityAt, router]);

  if (!session || stale || pathname === "/" || pathname === "/workout" || pathname.startsWith("/workout/") || /^\/exercises\/[^/]+\/[^/]+$/.test(pathname)) return null;

  return (
    <Link href="/workout" className="mb-6 flex min-h-11 w-full items-center gap-3 rounded-2xl border border-line bg-surface p-3 focus-visible:outline-2 focus-visible:outline-brand">
      <span className="size-2 shrink-0 rounded-full bg-brand motion-safe:animate-pulse" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Workout in progress</p>
        <p className="text-sm text-copy-muted">
          <ElapsedTime since={session.startedAt} /> · {session.setCount} sets
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-brand" aria-hidden="true" />
    </Link>
  );
}
