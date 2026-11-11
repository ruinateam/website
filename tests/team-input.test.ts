import assert from "node:assert/strict";
import { test } from "node:test";
import * as motion from "../lib/team-motion";

const gesture = (): motion.WheelGesture => ({ distance: 0, lastAt: 0, stepped: false });

test("one wheel notch advances exactly one member", () => {
  const first = motion.wheelMember(0, 100, 3, gesture(), 1000);
  assert.equal(first.member, 1);
  assert.equal(motion.wheelMember(1, 100, 3, first.gesture, 1100).member, 1);
  assert.equal(motion.wheelMember(1, 100, 3, first.gesture, 1600).member, 2);
});

test("small trackpad deltas accumulate into a single step per gesture", () => {
  let state = gesture();
  let member = 0;
  const members: number[] = [];
  for (let index = 0; index < 5; index++) {
    const result = motion.wheelMember(member, 5, 3, state, 1000 + index * 20);
    state = result.gesture;
    member = result.member;
    members.push(member);
  }
  assert.deepEqual(members, [0, 0, 0, 0, 1]);
  assert.equal(motion.wheelMember(1, 5, 3, state, 1080).member, 1);
});

test("a single gesture cannot skip participants even with a large delta", () => {
  const first = motion.wheelMember(0, 2000, 3, gesture(), 1000);
  assert.equal(first.member, 1);
  assert.equal(motion.wheelMember(1, 2000, 3, first.gesture, 1050).member, 1);
});

test("wheel stepping reverses direction and clamps both ends", () => {
  const forward = motion.wheelMember(1, 120, 3, gesture(), 1000);
  assert.equal(forward.member, 2);
  assert.equal(motion.wheelMember(2, -120, 3, forward.gesture, 1600).member, 1);
  assert.equal(motion.wheelMember(2, 120, 3, gesture(), 1000).member, 2);
  assert.equal(motion.wheelMember(0, -120, 3, gesture(), 1000).member, 0);
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
