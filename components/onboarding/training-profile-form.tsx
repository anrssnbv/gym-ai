"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { saveTrainingProfile } from "@/actions/training-profile";
import { callAction } from "@/lib/action-result";
import { DURATIONS_MIN } from "@/lib/plan";
import {
  GOALS, GOAL_LABELS, EXPERIENCES, EXPERIENCE_LABELS, EQUIPMENT_CHOICES,
  EQUIPMENT_LABELS, type TrainingProfile,
} from "@/lib/training-profile";

const headings = ["What is your main goal?", "What is your gym experience?", "How often can you train?", "What equipment can you use?"];

export function TrainingProfileForm({ initialProfile, mode }: {
  initialProfile: TrainingProfile | null;
  mode: "onboarding" | "edit";
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<TrainingProfile["goal"] | "">(initialProfile?.goal ?? "");
  const [experience, setExperience] = useState<TrainingProfile["experience"] | "">(initialProfile?.experience ?? "");
  const [daysPerWeek, setDays] = useState(initialProfile?.daysPerWeek ?? 0);
  const [sessionMinutes, setMinutes] = useState<TrainingProfile["sessionMinutes"]>(initialProfile?.sessionMinutes ?? 60);
  const [equipment, setEquipment] = useState<TrainingProfile["equipment"]>(initialProfile?.equipment ?? [...EQUIPMENT_CHOICES]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const submitted = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const minutes = daysPerWeek * sessionMinutes;
  const weeklyTime = [Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)} ${minutes < 120 ? "hour" : "hours"}` : "", minutes % 60 ? `${minutes % 60} minutes` : ""].filter(Boolean).join(" ");
  const weeklySummary = daysPerWeek ? `${daysPerWeek} ${daysPerWeek === 1 ? "day" : "days"} × ${sessionMinutes} min = ${weeklyTime} per week` : "Choose your days to see your weekly time.";

  useEffect(() => { heading.current?.focus(); }, [step]);
  useEffect(() => {
    if (!error) return;
    if (error.field) form.current?.querySelector<HTMLInputElement>(`input[name="${error.field}"]`)?.focus();
    else errorRef.current?.focus();
  }, [error, step]);

  function goTo(next: number) {
    setError(null);
    setStep(next);
  }

  function validate(index: number) {
    if (index === 0 && !goal) return { field: "goal", message: "Choose your main goal." };
    if (index === 1 && !experience) return { field: "experience", message: "Choose your gym experience." };
    if (index === 2 && (!Number.isInteger(daysPerWeek) || daysPerWeek < 1 || daysPerWeek > 7)) return { field: "days", message: "Choose 1–7 days per week." };
    if (index === 2 && !DURATIONS_MIN.includes(sessionMinutes)) return { field: "duration", message: "Choose a session length." };
    if (index === 3 && equipment.length === 0) return { field: "equipment", message: "Choose at least one equipment type." };
    return null;
  }

  function choice(name: string, value: string | number, label: string, checked: boolean, onChange: () => void, checkbox = false) {
    return <label key={value} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm has-focus-visible:ring-2 has-focus-visible:ring-brand ${checked ? "border-brand bg-brand-dim" : "border-line bg-surface"}`}>
      <input type={checkbox ? "checkbox" : "radio"} name={name} value={value} checked={checked} onChange={() => { setError(null); onChange(); }} className="size-4 shrink-0 accent-brand" aria-invalid={error?.field === name || undefined} aria-describedby={error?.field === name ? "profile-error" : undefined} />
      <span>{label}</span>
    </label>;
  }

  return <form ref={form} className="space-y-5" noValidate onSubmit={async (event) => {
    event.preventDefault();
    if (submitted.current) return;
    if (step < 3) {
      const invalid = validate(step);
      if (invalid) setError(invalid);
      else goTo(step + 1);
      return;
    }
    for (let index = 0; index < 4; index++) {
      const invalid = validate(index);
      if (invalid) { setStep(index); setError(invalid); return; }
    }
    submitted.current = true;
    setSaving(true);
    setError(null);
    try {
      const result = await callAction(() => saveTrainingProfile({ goal, experience, daysPerWeek, sessionMinutes, equipment }));
      if (!result.ok) setError({ message: result.error });
      else { router.replace("/"); router.refresh(); }
    } finally {
      submitted.current = false;
      setSaving(false);
    }
  }}>
    <div className="space-y-2">
      <p className="text-sm text-copy-muted">Step {step + 1} of 4</p>
      <progress aria-label="Training preferences progress" max={4} value={step + 1} className="h-2 w-full overflow-hidden rounded-full accent-brand [&::-webkit-progress-bar]:bg-subtle [&::-webkit-progress-value]:bg-brand [&::-moz-progress-bar]:bg-brand" />
      <h2 ref={heading} tabIndex={-1} className="font-display text-2xl font-semibold outline-none">{headings[step]}</h2>
    </div>
    <fieldset disabled={saving} className="min-w-0 space-y-3 disabled:opacity-60">
      <legend className="sr-only">{headings[step]}</legend>
      {step === 0 && GOALS.map((value) => choice("goal", value, GOAL_LABELS[value], goal === value, () => setGoal(value)))}
      {step === 1 && EXPERIENCES.map((value) => choice("experience", value, EXPERIENCE_LABELS[value], experience === value, () => setExperience(value)))}
      {step === 2 && <>
        <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">Days per week</legend>
          <div className="grid grid-cols-4 gap-2">{[1, 2, 3, 4, 5, 6, 7].map((value) => choice("days", value, String(value), daysPerWeek === value, () => setDays(value)))}</div>
        </fieldset>
        <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">How long per visit?</legend>
          <div className="grid grid-cols-2 gap-2">{DURATIONS_MIN.map((value) => choice("duration", value, `${value} min`, sessionMinutes === value, () => setMinutes(value)))}</div>
        </fieldset>
        <p aria-live="polite" className="rounded-xl bg-brand-dim p-3 text-sm text-brand">{weeklySummary}</p>
        <p className="text-sm text-copy-secondary">You can change the time for each workout.</p>
      </>}
      {step === 3 && <>
        <p className="text-sm text-copy-secondary">Choose the equipment available at your gym. Machine and cable choices cover the catalog categories; individual stations can vary.</p>
        {EQUIPMENT_CHOICES.map((value) => choice("equipment", value, EQUIPMENT_LABELS[value], equipment.includes(value), () => setEquipment((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]), true))}
        <section aria-label="Review your preferences" className="rounded-2xl border border-line bg-surface p-3">
          <h3 className="font-display text-lg">Review your preferences</h3>
          {[
            ["Goal", goal ? GOAL_LABELS[goal] : "Choose a goal"],
            ["Experience", experience ? EXPERIENCE_LABELS[experience] : "Choose your experience"],
            ["Weekly schedule", weeklySummary],
            ["Equipment", EQUIPMENT_CHOICES.filter((value) => equipment.includes(value)).map((value) => EQUIPMENT_LABELS[value]).join(", ") || "Choose equipment"],
          ].map(([label, value], index) => <div key={label} className="flex items-start justify-between gap-2 border-b border-line py-2 last:border-0">
            <div className="min-w-0 text-sm"><p className="text-copy-muted">{label}</p><p>{value}</p></div>
            <Button type="button" variant="ghost" className="min-h-11 min-w-11 shrink-0" aria-label={`Edit ${label.toLowerCase()}`} onClick={() => { goTo(index); if (index === step) heading.current?.focus(); }}>Edit</Button>
          </div>)}
        </section>
        <p className="rounded-xl bg-ai-dim p-3 text-sm text-copy-secondary">Your training preferences and recent workout history are used to generate workouts with OpenAI. You can edit these preferences later.</p>
      </>}
    </fieldset>
    {error && <p id="profile-error" ref={errorRef} tabIndex={-1} role="alert" className="text-sm text-danger">{error.message}</p>}
    <div className="flex gap-3">
      {step > 0 && <Button type="button" variant="outline" disabled={saving} className="min-h-11 rounded-xl" onClick={() => goTo(step - 1)}>Back</Button>}
      <Button type="submit" disabled={saving} className="min-h-11 flex-1 rounded-xl">{saving ? "Saving…" : step < 3 ? "Continue" : mode === "edit" ? "Save changes" : "Save and continue"}</Button>
    </div>
    <p className="text-xs text-copy-muted">{mode === "edit" ? "Leaving or reloading before saving keeps your previous preferences." : "Your answers are saved on the last step. Reloading before saving restarts this survey."}</p>
  </form>;
}
