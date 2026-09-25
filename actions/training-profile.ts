"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { TrainingProfile } from "@/lib/training-profile";
import { trainingProfileSchema, trainingProfileSelect } from "@/lib/training-profile-schema";

export async function saveTrainingProfile(input: unknown): Promise<ActionResult<TrainingProfile>> {
  const userId = await requireUserId();
  const parsed = trainingProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check your training preferences and try again." };
  const row = await prisma.trainingProfile.upsert({
    where: { userId },
    create: { userId, ...parsed.data },
    update: parsed.data,
    select: trainingProfileSelect,
  });
  revalidatePath("/", "layout");
  return { ok: true, data: trainingProfileSchema.parse(row) };
}
