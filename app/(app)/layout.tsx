import { BottomNav } from "@/components/app-shell/bottom-nav";
import { TopBar } from "@/components/app-shell/top-bar";
import { auth } from "@clerk/nextjs/server";
import { requireUserId } from "@/lib/auth";
import { getActiveSession } from "@/lib/queries";
import { ActiveWorkoutBanner } from "@/components/workout/active-workout-banner";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await auth.protect();
  const userId = await requireUserId();
  const session = await getActiveSession(userId);
  return (
    <div className="min-h-dvh bg-page">
      <TopBar />
      <main className="mx-auto w-full max-w-md px-4 pt-6 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <ActiveWorkoutBanner session={session && {
          id: session.id,
          startedAt: session.startedAt.toISOString(),
          lastActivityAt: session.lastActivityAt.toISOString(),
          setCount: session.setCount,
        }} />
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
