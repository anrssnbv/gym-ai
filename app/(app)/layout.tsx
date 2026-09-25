import { BottomNav } from "@/components/app-shell/bottom-nav";
import { TopBar } from "@/components/app-shell/top-bar";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh bg-page">
      <TopBar />
      <main className="mx-auto w-full max-w-md px-4 pt-6 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
