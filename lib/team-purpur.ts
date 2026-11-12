import {
  BoxGeometry,
  CanvasTexture,
  MeshStandardMaterial,
  NearestFilter,
  NearestMipmapLinearFilter,
  RepeatWrapping,
  SRGBColorSpace,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { loadImage } from "skinview-utils";
import { BLOCK_UNIT } from "./team-scale";

export const GALLERY_FLOOR = {
  foundation: { center: [0, -4.5, -3], size: [48, 6, 36] },
  surface: { center: [0, -1.5, -3], size: [42, 3, 30] },
} as const;

/** Preserve the original 16px pattern, alpha and luminance; remove hue only. */
export function graphitePixels(pixels: Uint8ClampedArray) {
  for (let i = 0; i < pixels.length; i += 4) {
    const gray = Math.round(
      pixels[i]! * 0.2126 + pixels[i + 1]! * 0.7152 + pixels[i + 2]! * 0.0722,
    );
    pixels[i] = pixels[i + 1] = pixels[i + 2] = gray;
  }
}

export function purpurBox(width: number, height: number, depth: number) {
  const geometry = new BoxGeometry(width, height, depth);
  const uv = geometry.getAttribute("uv");
  const faceSizes = [
    [depth, height],
    [depth, height],
    [width, depth],
    [width, depth],
    [width, height],
    [width, height],
  ];
  faceSizes.forEach(([w, h], face) => {
    for (let vertex = face * 4; vertex < face * 4 + 4; vertex++) {
      uv.setXY(vertex, (uv.getX(vertex) * w!) / BLOCK_UNIT, (uv.getY(vertex) * h!) / BLOCK_UNIT);
    }
  });
  // Two contiguous groups: four pillar sides, then the two authentic end-grain faces.
  const indices = geometry.getIndex();
  if (indices) {
    const order = [0, 1, 4, 5, 2, 3];
    geometry.setIndex(
      order.flatMap((face) => Array.from({ length: 6 }, (_, n) => indices.getX(face * 6 + n))),
    );
    geometry.clearGroups();
    geometry.addGroup(0, 24, 0);
    geometry.addGroup(24, 12, 1);
  }
  return geometry;
}

export function purpurSlab() {
  return purpurBox(6, 3, 6);
}

/** Vanilla stairs rise along +X. Lower-side UVs are the bottom half of purpur_block. */
export function purpurStairs() {
  const lower = new BoxGeometry(6, 3, 6);
  const upper = new BoxGeometry(3, 3, 6);
  const lowerUv = lower.getAttribute("uv");
  const upperUv = upper.getAttribute("uv");
  for (let vertex = 0; vertex < 24; vertex++) {
    const face = Math.floor(vertex / 4);
    if (face !== 2 && face !== 3) lowerUv.setY(vertex, lowerUv.getY(vertex) * 0.5);
    if (face === 2 || face === 3) upperUv.setX(vertex, 0.5 + upperUv.getX(vertex) * 0.5);
    else {
      upperUv.setY(vertex, 0.5 + upperUv.getY(vertex) * 0.5);
      if (face === 4 || face === 5)
        upperUv.setX(vertex, (face === 4 ? 0.5 : 0) + upperUv.getX(vertex) * 0.5);
    }
  }
  lower.translate(0, -1.5, 0);
  upper.translate(1.5, 1.5, 0);
  // Remove the upper element's internal bottom face.
  const upperIndex = upper.getIndex();
  if (upperIndex)
    upper.setIndex(
      Array.from({ length: upperIndex.count }, (_, n) => n)
        .filter((n) => n < 18 || n >= 24)
        .map((n) => upperIndex.getX(n)),
    );
  const stairs = mergeGeometries([lower, upper]);
  lower.dispose();
  upper.dispose();
  if (!stairs) throw new Error("Cannot build Purpur stairs");
  return stairs;
}

async function graphiteTexture(name: string) {
  const image = await loadImage(`/textures/purpur/${name}.png`);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 16;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, 16, 16);
  graphitePixels(pixels.data);
  ctx.putImageData(pixels, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestMipmapLinearFilter;
  texture.anisotropy = 2;
  return texture;
}

export async function loadPurpurMaterials() {
  // allSettled allows every allocated texture to be disposed even if one source fails.
  const results = await Promise.allSettled(
    ["purpur_block", "purpur_pillar", "purpur_pillar_top"].map(graphiteTexture),
  );
  const textures = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
  if (textures.length !== 3) {
    textures.forEach((texture) => texture.dispose());
    throw new Error("Minecraft Purpur textures unavailable");
  }
  const block = new MeshStandardMaterial({
    map: textures[0],
    color: 0x7d848a,
    roughness: 0.9,
    metalness: 0.02,
  });
  const cap = new MeshStandardMaterial({ map: textures[0], color: 0x7f868b, roughness: 0.88 });
  const shadow = new MeshStandardMaterial({ map: textures[0], color: 0x4e5559, roughness: 0.96 });
  const pillar = new MeshStandardMaterial({ map: textures[1], color: 0x81888d, roughness: 0.88 });
  const end = new MeshStandardMaterial({ map: textures[2], color: 0x878e93, roughness: 0.88 });
  return { block, cap, shadow, column: [pillar, end], textures };
}
