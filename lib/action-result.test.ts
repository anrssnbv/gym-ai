import assert from "node:assert/strict";
import test from "node:test";
import { callAction, type ActionResult } from "./action-result.ts";

test("callAction preserves success and expected error results", async () => {
  const success: ActionResult<number> = { ok: true, data: 3 };
  const error: ActionResult<number> = { ok: false, error: "Level changed", stale: true };
  assert.equal(await callAction(async () => success), success);
  assert.equal(await callAction<number>(async () => error), error);
});

test("callAction turns a rejected request into a retryable result", async () => {
  const expected = { ok: false, error: "Couldn't reach the server. Try again." };
  assert.deepEqual(await callAction(() => Promise.reject(new Error("Offline"))), expected);
  assert.deepEqual(await callAction(() => { throw new Error("Request failed"); }), expected);
});
