import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import { EXERCISES } from "./catalog.ts";
import { EXERCISE_DEMOS, exerciseDemoSrc } from "./exercise-demos.ts";

test("every catalog exercise has distinct reviewed portrait WebP artwork and instructions", async () => {
  const ids = EXERCISES.map(({ id }) => id).sort();
  const directory = path.join(process.cwd(), "public", "exercise-demos");
  const files = (await readdir(directory)).sort();
  assert.deepEqual(files, ids.map((id) => `${id}.webp`).sort());
  assert.deepEqual(Object.keys(EXERCISE_DEMOS).sort(), ids);

  const inventory = await readFile(path.join(process.cwd(), "context", "exercise-demo-artwork.md"), "utf8");
  const inventoryIds = [...inventory.matchAll(/^\| ([a-z]+(?:-[a-z]+)*) \|/gm)].map((match) => match[1]).sort();
  assert.deepEqual(inventoryIds, ids);

  const hashes = new Set<string>();
  for (const id of ids) {
    const bytes = await readFile(path.join(directory, `${id}.webp`));
    const image = await sharp(bytes).metadata();
    assert.equal(image.format, "webp", id);
    assert.equal(image.width, 960, id);
    assert.equal(image.height, 1200, id);
    assert.ok(bytes.length <= 160 * 1024, `${id}: ${bytes.length} bytes`);
    hashes.add(createHash("sha256").update(bytes).digest("hex"));
    const demo = EXERCISE_DEMOS[id];
    assert.ok(demo.alt && demo.secondPosition && demo.setup && demo.movement, id);
    assert.equal(exerciseDemoSrc(id), `/exercise-demos/${id}.webp`);
  }
  assert.equal(hashes.size, ids.length);
});
