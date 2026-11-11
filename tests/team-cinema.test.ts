import assert from "node:assert/strict";
import { test } from "node:test";
import * as cinema from "../lib/team-cinema";

test("gallery timeline supplies three distinct settled camera compositions", () => {
  assert.equal(typeof cinema.galleryFrame, "function");
  const shots = [0, 1, 2].map((p) => cinema.galleryFrame(p, false));
  assert.notDeepEqual(shots[0]?.camera, shots[1]?.camera);
  assert.notDeepEqual(shots[1]?.camera, shots[2]?.camera);
  for (const [index, shot] of shots.entries()) {
    assert.equal(shot.members[index]?.reveal, 1);
    assert.equal(shot.members[index]?.links, 1);
    assert.equal(shot.members[index]?.light, 1);
  }
});

test("gallery camera traverses space continuously, with reading holds", () => {
  assert.deepEqual(cinema.galleryFrame(0, false).camera, cinema.galleryFrame(0.1, false).camera);
  for (let p = 0.001; p <= 2; p += 0.009) {
    const a = cinema.galleryFrame(p - 0.001, false);
    const b = cinema.galleryFrame(p, false);
    for (let i = 0; i < 3; i++) assert.ok(Math.abs(a.camera[i]! - b.camera[i]!) < 0.2);
    assert.ok(b.members.filter((member) => member.reveal > 0).length <= 1);
  }
});

test("timeline clamps input, retains physical models and delays contact reveal", () => {
  assert.deepEqual(cinema.galleryFrame(-5, false), cinema.galleryFrame(0, false));
  assert.deepEqual(cinema.galleryFrame(5, false), cinema.galleryFrame(2, false));
  const middle = cinema.galleryFrame(0.7, false);
  assert.equal(middle.members[1]?.links, 0);
  for (const member of middle.members) assert.ok(member.light >= 0 && member.light <= 1);
  assert.notDeepEqual(cinema.galleryFrame(0, true).camera, cinema.galleryFrame(0, false).camera);
});
