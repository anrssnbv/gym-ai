"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { getExercise, type ExerciseId } from "@/lib/catalog";
import { EXERCISE_DEMOS, exerciseDemoSrc } from "@/lib/exercise-demos";

export function ExerciseDemo({ exerciseId }: { exerciseId: ExerciseId }) {
  const [open, setOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const id = useId();
  const exercise = getExercise(exerciseId)!;
  const demo = EXERCISE_DEMOS[exerciseId];

  return (
    <div className="mt-4 min-w-0">
      <button
        type="button"
        className="inline-flex min-h-11 items-center rounded-xl border border-line bg-surface px-4 text-sm font-medium text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? `Hide how to do ${exercise.name}` : `Show how to do ${exercise.name}`}
      </button>
      <div id={id} hidden={!open} className="mt-3 min-w-0 rounded-2xl border border-line bg-surface p-3">
        {open && (imageFailed ? (
          <p role="status" className="text-sm text-copy-muted">Illustration unavailable</p>
        ) : (
          <Image
            src={exerciseDemoSrc(exerciseId)}
            width={960}
            height={1200}
            unoptimized
            alt={demo.alt}
            className="h-auto w-full rounded-xl"
            onError={() => setImageFailed(true)}
          />
        ))}
        <div className="mt-3 flex justify-between text-xs font-medium uppercase tracking-wide text-copy-secondary">
          <span>Start</span><span>{demo.secondPosition}</span>
        </div>
        <p className="mt-3 text-sm text-copy">{demo.setup}</p>
        <p className="mt-2 text-sm text-copy-secondary">{demo.movement}</p>
      </div>
    </div>
  );
}
