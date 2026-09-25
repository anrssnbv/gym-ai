"use client";

import { SignOutButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function AppError({ retry }: { retry: () => void }) {
  return <main className="mx-auto w-full max-w-md space-y-4 px-4 pt-[calc(2rem+env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
    <h1 className="font-display text-2xl">Couldn’t load this page</h1>
    <p role="alert" className="text-sm text-copy-secondary">Check your connection and try again.</p>
    <div className="flex gap-3">
      <Button className="min-h-11 rounded-xl" onClick={retry}>Retry</Button>
      <SignOutButton><Button variant="outline" className="min-h-11 rounded-xl">Sign out</Button></SignOutButton>
    </div>
  </main>;
}
