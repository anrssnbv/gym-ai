"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { requireUserId } from "@/lib/auth";
import { sessionEnd } from "@/lib/game";
import { findOpenSession } from "@/lib/queries";
import { serializableTransaction } from "@/lib/transactions";

export async function finishWorkout(): Promise<ActionResult<{ sessionId: string | null }>> {
  const userId = await requireUserId();
  const result = await serializableTransaction<{ sessionId: string | null }>(async (tx) => {
    const now = new Date();
    const session = await findOpenSession(tx, userId, now);
    if (!session) return { ok: true, data: { sessionId: null } };
    await tx.workoutSession.update({
      where: { id: session.id, userId },
      data: { endedAt: sessionEnd(session.lastActivityAt, now) },
    });
    return { ok: true, data: { sessionId: session.id } };
  });
  if (result.ok && result.data.sessionId) revalidatePath("/", "layout");
  return result;
}
