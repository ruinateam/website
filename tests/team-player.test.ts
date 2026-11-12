import assert from "node:assert/strict";
import { test } from "node:test";
import { Box3, DoubleSide, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { PlayerObject } from "skinview3d/libs/model.js";
import { PLAYER_POSITIONS } from "../lib/team-cinema";
import * as playerSetup from "../lib/team-player";
import { BLOCK_UNIT, PLAYER_SCALE } from "../lib/team-scale";
import { coplanarSurfaces } from "./helpers/coplanar-surfaces";

function visibleBounds(player: PlayerObject) {
  player.updateWorldMatrix(true, true);
  const bounds = new Box3();
  player.traverseVisible((object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry.computeBoundingBox();
    bounds.union(object.geometry.boundingBox!.clone().applyMatrix4(object.matrixWorld));
  });
  return bounds;
}

test("the gallery player stands two Purpur blocks tall", () => {
  const player = new PlayerObject();
  player.scale.setScalar(PLAYER_SCALE);
  const bounds = visibleBounds(player);
  const height = bounds.max.y - bounds.min.y;
  // The outer skin layer adds one half-pixel of silhouette beyond the 2-block body.
  assert.ok(Math.abs(height - 2 * BLOCK_UNIT) < 0.5, `player height is ${height}`);
});

test("player positions keep both feet on each room's floor", () => {
  PLAYER_POSITIONS.forEach((position, index) => {
    const player = new PlayerObject();
    player.scale.setScalar(PLAYER_SCALE);
    player.position.set(...position);
    const bounds = visibleBounds(player);
    const floor = index === 2 ? 3 : 0;
    assert.ok(
      Math.abs(bounds.min.y - floor) < 0.2,
      `member ${index} feet at ${bounds.min.y}, floor ${floor}`,
    );
  });
});

for (const model of ["default", "slim"] as const) {
  test(`${model} atlas bounds follow each face after model inference without altering UVs`, () => {
    const player = new PlayerObject();
    playerSetup.applyGalleryPose(player, 0);
    player.skin.modelType = model;
    const arm = player.skin.leftArm.innerLayer;
    assert.ok(arm instanceof Mesh);
    const original = Array.from(arm.geometry.getAttribute("uv").array);
    playerSetup.boundSkinAtlasUVs(player);
    assert.deepEqual(Array.from(arm.geometry.getAttribute("uv").array), original);
    player.skin.traverse((mesh) => {
      if (!(mesh instanceof Mesh)) return;
      const uv = mesh.geometry.getAttribute("uv");
      const bounds = mesh.geometry.getAttribute("skinUvBounds");
      assert.equal(bounds.count, uv.count);
      for (let face = 0; face < uv.count; face += 4) {
        const us = [0, 1, 2, 3].map((i) => uv.getX(face + i));
        const vs = [0, 1, 2, 3].map((i) => uv.getY(face + i));
        const expected = [Math.min(...us), Math.min(...vs), Math.max(...us), Math.max(...vs)];
        for (let vertex = face; vertex < face + 4; vertex++) {
          assert.deepEqual(
            [bounds.getX(vertex), bounds.getY(vertex), bounds.getZ(vertex), bounds.getW(vertex)],
            expected,
          );
        }
      }
    });
  });

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

test("relaxed arms tilt away from the torso instead of into the shirt", () => {
  for (let index = 0; index < 3; index++) {
    const player = new PlayerObject();
    playerSetup.applyGalleryPose(player, index);
    player.rotation.y = 0;
    player.updateWorldMatrix(true, true);
    for (const [arm, direction] of [
      [player.skin.leftArm, 1],
      [player.skin.rightArm, -1],
    ] as const) {
      const shoulder = arm.localToWorld(new Vector3());
      const wrist = arm.localToWorld(new Vector3(0, -10, 0));
      assert.ok((wrist.x - shoulder.x) * direction > 0.5, `member ${index} arm points inward`);
    }
  }
});

test("trouser shells meet at the centre line without a visible gap", () => {
  const player = new PlayerObject();
  playerSetup.applyGalleryPose(player, 0);
  player.rotation.y = 0;
  player.updateWorldMatrix(true, true);
  const right = new Box3().setFromObject(player.skin.rightLeg.innerLayer);
  const left = new Box3().setFromObject(player.skin.leftLeg.innerLayer);
  const gap = left.min.x - right.max.x;
  assert.ok(Math.abs(gap) < 0.01, `trouser shells should meet, gap is ${gap}`);
});

test("outer skin layers keep transparency without writing unstable transparent depth", () => {
  const player = new PlayerObject();
  playerSetup.applyGalleryPose(player, 1);
  const outer = player.skin.head.outerLayer;
  assert.ok(outer instanceof Mesh && outer.material instanceof MeshStandardMaterial);
  assert.equal(outer.material.transparent, true);
  assert.equal(outer.material.depthWrite, false);
  assert.equal(outer.material.side, DoubleSide, "cutout overlays need visible reverse faces");
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
