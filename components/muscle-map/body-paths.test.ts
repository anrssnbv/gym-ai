import assert from "node:assert/strict";
import test from "node:test";
import { MUSCLE_GROUPS } from "../../lib/catalog.ts";
import { BODY_PATHS, HEAD_PATHS } from "./body-paths.ts";

test("every catalog head has nonempty regions in supported body views", () => {
  const heads = MUSCLE_GROUPS.flatMap((group) => group.heads);
  assert.deepEqual(Object.keys(HEAD_PATHS).sort(), [...heads].sort());
  for (const head of heads) {
    assert.ok(HEAD_PATHS[head].length > 0, head);
    for (const path of HEAD_PATHS[head]) {
      assert.ok(path.view === "front" || path.view === "back", head);
    }
  }
});

test("all polygons stay within the left half of the 200 by 440 figure", () => {
  const paths = [
    ...Object.values(HEAD_PATHS).flat().map((path) => path.d),
    ...BODY_PATHS.front,
    ...BODY_PATHS.back,
  ];
  assert.ok(BODY_PATHS.front.length > 0 && BODY_PATHS.back.length > 0);
  for (const d of paths) {
    assert.match(d, /^M \d+ \d+(?: L \d+ \d+){2,} Z$/);
    const coordinates = d.match(/\d+/g)!.map(Number);
    for (let i = 0; i < coordinates.length; i += 2) {
      assert.ok(coordinates[i] <= 100, `x outside left half: ${d}`);
      assert.ok(coordinates[i + 1] <= 440, `y outside viewBox: ${d}`);
    }
  }
});
