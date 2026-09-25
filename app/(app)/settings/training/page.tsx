import Link from "next/link";
import { redirect } from "next/navigation";
import { TrainingProfileForm } from "@/components/onboarding/training-profile-form";
import { requireUserId } from "@/lib/auth";
import { getTrainingProfile } from "@/lib/queries";

export default async function TrainingSettingsPage() {
  const userId = await requireUserId();
  const profile = await getTrainingProfile(userId);
  if (!profile) redirect("/onboarding");
  return <div className="space-y-5">
    <Link href="/" className="inline-flex min-h-11 items-center text-sm text-copy-secondary underline underline-offset-4">Back to Home</Link>
    <h1 className="font-display text-2xl font-semibold">Training preferences</h1>
    <TrainingProfileForm key={userId} initialProfile={profile} mode="edit" />
  </div>;
}
