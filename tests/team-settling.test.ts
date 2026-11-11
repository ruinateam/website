import assert from "node:assert/strict";
import { test } from "node:test";
import * as motion from "../lib/team-motion";

test("a stopped handoff always resolves to the nearest complete participant shot", () => {
  assert.equal(typeof motion.settledMember, "function");
  for (const [progress, expected] of [
    [0.2, 0],
    [0.48, 0],
    [0.5, 1],
    [0.73, 1],
    [1.45, 1],
    [1.52, 2],
    [1.9, 2],
  ]) {
    assert.equal(motion.settledMember(progress!, 3), expected);
  }
});

test("settling clamps bounds and never returns an invalid member", () => {
  assert.equal(motion.settledMember(-20, 3), 0);
  assert.equal(motion.settledMember(20, 3), 2);
  assert.equal(motion.settledMember(Number.NaN, 3), 0);
  assert.equal(motion.settledMember(1, 0), 0);
});
