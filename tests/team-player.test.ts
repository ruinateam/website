import assert from "node:assert/strict";
import { test } from "node:test";
import { FrontSide, Mesh, MeshStandardMaterial } from "three";
import { PlayerObject } from "skinview3d/libs/model.js";
import * as playerSetup from "../lib/team-player";
import { coplanarSurfaces } from "./helpers/coplanar-surfaces";

for (const model of ["default", "slim"] as const) {
  test(`${model} skin has no coplanar shoulder or leg surfaces in its gallery pose`, () => {
    assert.equal(typeof playerSetup.applyGalleryPose, "function");
    const player = new PlayerObject();
    player.skin.modelType = model;
    playerSetup.applyGalleryPose(player, 0);
    for (const part of [
      player.skin.head,
      player.skin.body,
      player.skin.leftArm,
      player.skin.rightArm,
      player.skin.leftLeg,
      player.skin.rightLeg,
    ]) {
      part.innerLayer.name = `${part.name}/base`;
      part.outerLayer.name = `${part.name}/overlay`;
    }
    assert.deepEqual(coplanarSurfaces(player.skin), []);
  });
}

test("outer skin layers keep transparency without writing unstable transparent depth", () => {
  const player = new PlayerObject();
  playerSetup.applyGalleryPose(player, 1);
  const outer = player.skin.head.outerLayer;
  assert.ok(outer instanceof Mesh && outer.material instanceof MeshStandardMaterial);
  assert.equal(outer.material.transparent, true);
  assert.equal(outer.material.depthWrite, false);
  assert.equal(outer.material.side, FrontSide);
  assert.equal(outer.receiveShadow, false);
  assert.ok(outer.material.alphaTest < 0.1, "preserve real translucent skin pixels");
});

test("skin color response bypasses architectural exposure and fog", () => {
  const player = new PlayerObject();
  playerSetup.applyGalleryPose(player, 0);
  const mesh = player.skin.head.innerLayer;
  assert.ok(mesh instanceof Mesh && mesh.material instanceof MeshStandardMaterial);
  assert.equal(mesh.material.toneMapped, false);
  assert.equal(mesh.material.fog, false);
});
