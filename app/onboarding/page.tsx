import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { TrainingProfileForm } from "@/components/onboarding/training-profile-form";
import { requireUserId } from "@/lib/auth";
import { getTrainingProfile } from "@/lib/queries";

export default async function OnboardingPage() {
  await auth.protect();
  const userId = await requireUserId();
  if (await getTrainingProfile(userId)) redirect("/");
  return <div className="min-h-dvh bg-page">
    <header className="border-b border-line pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
        <span className="font-display text-xl font-bold">Gym AI</span>
        <UserButton appearance={{ elements: { userButtonTrigger: "min-h-11 min-w-11 justify-center" } }} />
      </div>
    </header>
    <main className="mx-auto w-full max-w-md space-y-5 px-4 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <h1 className="text-sm text-copy-secondary">Let’s tailor your training</h1>
      <TrainingProfileForm key={userId} initialProfile={null} mode="onboarding" />
    </main>
  </div>;
}
