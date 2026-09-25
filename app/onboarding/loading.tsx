export default function OnboardingLoading() {
  return <main className="mx-auto w-full max-w-md px-4 pt-[calc(2rem+env(safe-area-inset-top))]" aria-busy="true">
    <p role="status" className="text-copy-secondary">Loading training preferences…</p>
  </main>;
}
