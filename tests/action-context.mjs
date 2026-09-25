import { AsyncLocalStorage } from "node:async_hooks";

export const actionContext = new AsyncLocalStorage();

export async function requireUserId() {
  const context = actionContext.getStore();
  if (!context) throw new Error("Integration action needs a test user");
  return context.userId;
}

export function revalidatePath(path, type) {
  actionContext.getStore().invalidations.push([path, type]);
}
