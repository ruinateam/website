import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import * as purpur from "../lib/team-purpur";

test("Purpur recoloring preserves luminance detail and alpha without a purple tint", () => {
  assert.equal(typeof purpur.graphitePixels, "function");
  const pixels = new Uint8ClampedArray([185, 139, 185, 255, 126, 98, 126, 173]);
  purpur.graphitePixels(pixels);
  assert.equal(pixels[0], pixels[1]);
  assert.equal(pixels[1], pixels[2]);
  assert.equal(pixels[4], pixels[5]);
  assert.ok(pixels[0]! > pixels[4]!);
  assert.equal(pixels[3], 255);
  assert.equal(pixels[7], 173);
});

test("column UVs repeat at the same texel density instead of stretching", () => {
  const geometry = purpur.purpurBox(6, 36, 6);
  const uv = geometry.getAttribute("uv");
  assert.equal(uv.getY(0), 6);
  assert.equal(uv.getX(1), 1);
  assert.equal(geometry.groups.length, 2);
  geometry.dispose();
});

test("slabs keep a half-block silhouette and a cropped side texture", () => {
  const geometry = purpur.purpurSlab();
  geometry.computeBoundingBox();
  assert.equal(geometry.boundingBox?.max.y, 1.5);
  assert.equal(geometry.boundingBox?.min.y, -1.5);
  assert.equal(geometry.getAttribute("uv").getY(0), 0.5);
  geometry.dispose();
});

test("stairs use Minecraft's two-level geometry, not a scaled solid box", () => {
  const geometry = purpur.purpurStairs();
  geometry.computeBoundingBox();
  assert.equal(geometry.boundingBox?.max.y, 3);
  assert.equal(geometry.boundingBox?.min.y, -3);
  const positions = geometry.getAttribute("position");
  assert.ok(Array.from({ length: positions.count }, (_, i) => positions.getY(i)).includes(0));
  assert.ok(positions.count > 24);
  geometry.dispose();
});

test("all three checked-in Minecraft source textures are 16px PNGs", () => {
  for (const name of ["purpur_block", "purpur_pillar", "purpur_pillar_top"]) {
    const png = readFileSync(new URL(`../public/textures/purpur/${name}.png`, import.meta.url));
    assert.equal(png.readUInt32BE(16), 16);
    assert.equal(png.readUInt32BE(20), 16);
  }
});

test("overlapping floor layers never share a visible top plane", () => {
  const { foundation, surface } = purpur.GALLERY_FLOOR;
  const foundationTop = foundation.center[1] + foundation.size[1] / 2;
  const surfaceTop = surface.center[1] + surface.size[1] / 2;
  assert.equal(surfaceTop, 0, "the character's ground stays fixed");
  assert.ok(foundationTop < surfaceTop - 0.1, "coplanar slabs flicker when the camera moves");
});
