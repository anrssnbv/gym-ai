import { Dumbbell, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function Home() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-md space-y-6 px-4 py-8">
      <header className="space-y-2">
        <p className="flex items-center gap-2 text-sm font-medium text-brand">
          <Dumbbell className="h-4 w-4" />
          GYM AI
        </p>
        <h1 className="font-display text-3xl font-bold text-copy">Design system</h1>
        <p className="text-sm text-copy-secondary">
          Dark arcade gym theme preview
        </p>
      </header>

      <section aria-label="Surfaces" className="space-y-3">
        <h2 className="font-display text-xl text-copy">Surfaces</h2>
        <div className="rounded-2xl border border-line bg-page p-3 text-sm text-copy-secondary">
          Page
          <div className="mt-2 rounded-2xl border border-line bg-surface p-3">
            Surface
            <div className="mt-2 rounded-xl border border-line bg-elevated p-3">
              Elevated
              <div className="mt-2 rounded-xl bg-subtle p-3">Subtle</div>
            </div>
          </div>
        </div>
      </section>

      <Card className="rounded-2xl border-line">
        <CardHeader>
          <CardTitle className="flex items-center justify-between font-display">
            <span>Progress</span>
            <Trophy className="h-5 w-5 text-level" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="font-display text-4xl font-bold tabular-nums text-level">
              LV 7
            </span>
            <Badge>Level preview</Badge>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-copy-secondary">
              <span>Next level</span>
              <span className="font-mono tabular-nums">9 / 12</span>
            </div>
            <Progress value={75} aria-label="Level progress: 75 percent" />
          </div>
        </CardContent>
      </Card>

      <section aria-label="Text colors" className="space-y-2 text-sm">
        <p className="text-copy">Primary text</p>
        <p className="text-copy-secondary">Secondary text</p>
        <p className="text-copy-muted">Muted text</p>
      </section>

      <section aria-label="Actions" className="flex gap-3">
        <Button className="h-11 flex-1 rounded-xl">Primary</Button>
        <Button variant="secondary" className="h-11 flex-1 rounded-xl">
          Secondary
        </Button>
      </section>

      <section aria-label="Input preview" className="space-y-2">
        <Label htmlFor="weight">Working weight</Label>
        <Input
          id="weight"
          type="number"
          inputMode="decimal"
          placeholder="Weight in kg"
          className="h-11 rounded-xl bg-subtle text-base dark:bg-subtle"
        />
      </section>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="secondary" className="h-11 w-full rounded-xl">
            Open bottom sheet
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Bottom sheet</SheetTitle>
            <SheetDescription>
              This surface uses the elevated dark theme.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-2 px-4 pb-6">
            <Label htmlFor="sheet-weight">Working weight</Label>
            <Input
              id="sheet-weight"
              type="number"
              inputMode="decimal"
              placeholder="Weight in kg"
              className="h-11 rounded-xl bg-subtle text-base dark:bg-subtle"
            />
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}
