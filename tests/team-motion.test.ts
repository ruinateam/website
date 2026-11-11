import assert from "node:assert/strict";
import { test } from "node:test";
import { canDragModel, dampProgress, isLeftButtonHeld } from "../lib/team-motion";

test("only the left mouse button starts rotating a model", () => {
  assert.equal(canDragModel("mouse", 0), true);
  assert.equal(canDragModel("mouse", 1), false);
  assert.equal(canDragModel("mouse", 2), false);
  assert.equal(canDragModel("touch", 0), false);
  assert.equal(canDragModel("pen", 0), false);
});

test("dragging stops when left is released even if right remains held", () => {
  assert.equal(isLeftButtonHeld(1), true);
  assert.equal(isLeftButtonHeld(3), true);
  assert.equal(isLeftButtonHeld(2), false);
  assert.equal(isLeftButtonHeld(0), false);
});

test("scroll smoothing approaches its target without overshooting", () => {
  const progress = dampProgress(0, 1, 16, 520);
  assert.ok(progress > 0 && progress < 1);
  assert.equal(dampProgress(1, 1, 16, 520), 1);
  assert.ok(dampProgress(1, 0, 16, 520) > 0);
});

test("scroll smoothing has the same pace at different frame rates", () => {
  const twoFrames = dampProgress(dampProgress(0, 1, 16, 520), 1, 16, 520);
  assert.ok(Math.abs(twoFrames - dampProgress(0, 1, 32, 520)) < 0.00001);
});
