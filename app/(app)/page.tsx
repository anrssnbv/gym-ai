import { House } from "lucide-react";

export default function HomePage() {
  return (
    <section>
      <h1 className="font-display text-2xl text-copy">Home</h1>
      <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-3 text-center">
        <House className="h-8 w-8 text-copy-muted" aria-hidden="true" />
        <p className="text-sm text-copy-muted">Your progress will show up here.</p>
      </div>
    </section>
  );
}
