import assert from "node:assert/strict";
import { test } from "node:test";
import { FogExp2, Mesh, Scene, SpotLight } from "three";
import { PlayerObject } from "skinview3d/libs/model.js";
import * as warmup from "../lib/team-warmup";

test("shader warmup excludes skinview material-only groups and preserves shader variants", () => {
  assert.equal(typeof warmup.galleryCompileScene, "function");
  const scene = new Scene();
  scene.fog = new FogExp2(0x11161a, 0.012);
  scene.add(new PlayerObject(), new SpotLight());
  const compiled = warmup.galleryCompileScene(scene);
  assert.equal(compiled.fog, scene.fog);
  let meshes = 0;
  compiled.traverse((object) => {
    if ("material" in object) {
      assert.ok(
        object instanceof Mesh && object.geometry,
        "Three r156 requires geometry for every compiled material",
      );
      meshes++;
    }
  });
  assert.ok(meshes >= 12, "base and overlay skin variants are warmed");
  assert.equal(compiled.children.filter((child) => child instanceof SpotLight).length, 1);
});
