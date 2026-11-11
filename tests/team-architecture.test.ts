import assert from "node:assert/strict";
import { test } from "node:test";
import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from "three";
import { createPurpurArchitecture } from "../lib/team-architecture";
import { coplanarSurfaces } from "./helpers/coplanar-surfaces";

test("the geometry audit detects rotated coplanar overlaps but allows edge-only joints", () => {
  const root = new Group();
  const geometry = new BoxGeometry(6, 6, 6);
  const material = new MeshBasicMaterial();
  const a = new Mesh(geometry, material);
  a.name = "a";
  const b = new Mesh(geometry, material);
  b.name = "b";
  b.position.x = 2;
  b.rotation.z = 0.2;
  root.add(a, b);
  assert.deepEqual(coplanarSurfaces(root), ["a ↔ b"]);
  b.rotation.z = 0;
  b.position.x = 6;
  assert.deepEqual(coplanarSurfaces(root), []);
  geometry.dispose();
  material.dispose();
});

test("all three production rooms have no overlapping coplanar architecture surfaces", () => {
  const material = new MeshBasicMaterial();
  const architecture = createPurpurArchitecture({
    block: material,
    cap: material,
    shadow: material,
    column: [material, material],
  });
  const collisions = coplanarSurfaces(architecture.root);
  architecture.geometries.forEach((geometry) => geometry.dispose());
  material.dispose();
  assert.deepEqual(collisions, []);
});
