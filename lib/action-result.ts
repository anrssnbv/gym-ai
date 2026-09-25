export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; stale?: boolean };

export async function callAction<T>(run: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await run();
  } catch {
    return { ok: false, error: "Couldn't reach the server. Try again." };
  }
}
