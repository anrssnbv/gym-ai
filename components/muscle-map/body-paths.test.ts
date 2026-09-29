import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import sharp from "sharp";
import { MUSCLE_GROUPS } from "../../lib/catalog.ts";
import { BODY_WIDTH, BODY_HEIGHT, HEAD_PATHS } from "./body-paths.ts";

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

test("registered contours cover both sides and fit the delivered anatomy canvas", () => {
  const unique = new Set<string>();
  for (const [head, paths] of Object.entries(HEAD_PATHS)) {
    const xs: number[] = [];
    for (const { view, d } of paths) {
      assert.match(d, /^M (?:[MLCZ\d ]+) Z$/);
      const coordinates = d.match(/\d+/g)!.map(Number);
      assert.equal(coordinates.length % 2, 0, head);
      for (let i = 0; i < coordinates.length; i += 2) {
        xs.push(coordinates[i]);
        assert.ok(coordinates[i] <= BODY_WIDTH, `${head}: x outside canvas`);
        assert.ok(coordinates[i + 1] <= BODY_HEIGHT, `${head}: y outside canvas`);
      }
      assert.ok(!unique.has(`${view}:${d}`), `${head}: reused contour`);
      unique.add(`${view}:${d}`);
    }
    assert.ok(xs.some(x => x < BODY_WIDTH / 2) && xs.some(x => x > BODY_WIDTH / 2), `${head}: bilateral coverage`);
  }
});

test("two shared neutral anatomy assets match the canvas and size budget", async () => {
  const directory = new URL("../../public/muscle-maps/", import.meta.url);
  assert.deepEqual((await readdir(directory)).sort(), ["back.webp", "front.webp"]);
  const contents: Buffer[] = [];
  for (const view of ["front", "back"]) {
    const bytes = await readFile(new URL(`${view}.webp`, directory));
    const { width, height, format } = await sharp(bytes).metadata();
    assert.deepEqual([width, height, format], [BODY_WIDTH, BODY_HEIGHT, "webp"]);
    assert.ok(bytes.length <= 160 * 1024);
    contents.push(bytes);
  }
  assert.ok(!contents[0].equals(contents[1]));
});
