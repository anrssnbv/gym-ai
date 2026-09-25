import { Prisma } from "@/lib/generated/prisma/client";
import type { ActionResult } from "@/lib/action-result";
import { prisma } from "@/lib/prisma";

function isWriteConflict(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return true;
  // Prisma 7's pg adapter can expose commit-time conflicts before Prisma wraps them.
  if (!(error instanceof Error) || error.name !== "DriverAdapterError") return false;
  const cause = error.cause;
  return typeof cause === "object" && cause !== null
    && "kind" in cause && cause.kind === "TransactionWriteConflict"
    && "originalCode" in cause && (cause.originalCode === "40001" || cause.originalCode === "40P01");
}

export async function serializableTransaction<T>(
  run: (tx: Prisma.TransactionClient) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await prisma.$transaction(run, { isolationLevel: "Serializable" });
    } catch (error) {
      if (!isWriteConflict(error)) throw error;
      if (attempt === 3) return { ok: false, error: "Your workout changed on another screen. Try again." };
    }
  }
}
