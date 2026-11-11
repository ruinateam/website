import assert from "node:assert/strict";
import { test } from "node:test";
import * as motion from "../lib/team-motion";

test("wheel progress clamps both ends without accumulating overscroll debt", () => {
  assert.equal(typeof motion.wheelProgress, "function");
  assert.equal(motion.wheelProgress(0, -5000, 0, 720, 3), 0);
  assert.equal(motion.wheelProgress(2, 5000, 0, 720, 3), 2);
  assert.equal(motion.wheelProgress(2, -180, 0, 720, 3), 1.75);
  assert.equal(motion.wheelProgress(0, 180, 0, 720, 3), 0.25);
});

test("line and page wheel modes preserve usable trackpad and wheel steps", () => {
  assert.equal(motion.wheelProgress(0, 3, 1, 720, 3), 48 / 720);
  assert.equal(motion.wheelProgress(0, 1, 2, 720, 3), 1);
});

test("keyboard member navigation clamps movement and handles both endpoints", () => {
  assert.equal(typeof motion.keyboardMember, "function");
  for (const [key, current, expected] of [
    ["ArrowDown", 0, 1],
    ["PageDown", 2, 2],
    ["ArrowUp", 0, 0],
    ["PageUp", 2, 1],
    ["Home", 2, 0],
    ["End", 0, 2],
    [" ", 1, 2],
  ] as const)
    assert.equal(motion.keyboardMember({ key, progress: current, count: 3 }), expected);
  assert.equal(motion.keyboardMember({ key: " ", progress: 1, count: 3, shiftKey: true }), 0);
});

test("unrelated keys are not consumed by member navigation", () => {
  for (const key of ["ArrowLeft", "ArrowRight", "Tab", "Enter", "Escape"])
    assert.equal(motion.keyboardMember({ key, progress: 1, count: 3 }), null);
});
