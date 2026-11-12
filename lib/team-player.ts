import {
  BufferAttribute,
  DoubleSide,
  FrontSide,
  Mesh,
  MeshStandardMaterial,
  ShaderChunk,
} from "three";
import type { PlayerObject } from "skinview3d/libs/model.js";

/** Bound each cuboid face's atlas sampling without moving or rescaling its UVs. */
export function boundSkinAtlasUVs(player: PlayerObject) {
  player.skin.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const uv = object.geometry.getAttribute("uv");
    const bounds = new Float32Array(uv.count * 4);
    for (let face = 0; face < uv.count; face += 4) {
      let minU = Infinity;
      let minV = Infinity;
      let maxU = -Infinity;
      let maxV = -Infinity;
      for (let vertex = face; vertex < face + 4; vertex++) {
        minU = Math.min(minU, uv.getX(vertex));
        minV = Math.min(minV, uv.getY(vertex));
        maxU = Math.max(maxU, uv.getX(vertex));
        maxV = Math.max(maxV, uv.getY(vertex));
      }
      for (let vertex = face; vertex < face + 4; vertex++) {
        bounds.set([minU, minV, maxU, maxV], vertex * 4);
      }
    }
    object.geometry.setAttribute("skinUvBounds", new BufferAttribute(bounds, 4));
  });
}

/** A relaxed, non-intersecting pose; source texture pixels and alpha stay unchanged. */
export function applyGalleryPose(player: PlayerObject, index: number) {
  player.rotation.y = index === 1 ? -0.26 : 0.28;
  player.cape.visible = player.elytra.visible = player.ears.visible = false;
  const skin = player.skin;
  skin.leftArm.rotation.z = 0.065;
  skin.rightArm.rotation.z = -0.065;
  // The viewer's default arm/body front faces share Z, even after a Z-axis arm tilt.
  skin.leftArm.position.z = skin.rightArm.position.z = 0.125;
  // Base legs meet at the centre line; overlays retain a tiny depth separation.
  skin.leftLeg.position.x = 2;
  skin.rightLeg.position.x = -2;
  skin.leftLeg.outerLayer.scale.setScalar(0.998);
  skin.body.outerLayer.scale.x = 0.998;
  skin.head.rotation.y = index === 1 ? 0.12 : -0.08;
  boundSkinAtlasUVs(player);
  const parts = [skin.head, skin.body, skin.leftArm, skin.rightArm, skin.leftLeg, skin.rightLeg];
  for (const part of parts) {
    for (const [layer, outer] of [
      [part.innerLayer, false],
      [part.outerLayer, true],
    ] as const) {
      layer.traverse((mesh) => {
        if (!(mesh instanceof Mesh)) return;
        mesh.castShadow = true;
        mesh.receiveShadow = false;
        mesh.renderOrder = outer ? 1 : 0;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) {
          if (!(material instanceof MeshStandardMaterial)) continue;
          // Cutout hair/clothing exposes reverse faces; culling them leaves thin
          // background slits at the edges of the outer shell.
          material.side = outer ? DoubleSide : FrontSide;
          material.transparent = outer;
          material.depthWrite = !outer;
          material.polygonOffset = false;
          // Minecraft's albedo needs bounded directional shading, not the stone's
          // HDR light/exposure response. Work in linear space before sRGB output.
          material.toneMapped = false;
          material.fog = false;
          material.onBeforeCompile = (shader) => {
            // MSAA edge samples can extrapolate UVs into the neighbouring skin face.
            // Clamp sampling, not the UV layout: preserve the original pixel sizes.
            shader.vertexShader = shader.vertexShader
              .replace(
                "#include <common>",
                "#include <common>\nattribute vec4 skinUvBounds;\nvarying vec4 vSkinUvBounds;",
              )
              .replace(
                "#include <uv_vertex>",
                "#include <uv_vertex>\nvSkinUvBounds = skinUvBounds;",
              );
            shader.fragmentShader = shader.fragmentShader
              .replace("#include <common>", "#include <common>\nvarying vec4 vSkinUvBounds;")
              .replace(
                "#include <map_fragment>",
                ShaderChunk.map_fragment.replace(
                  "vMapUv",
                  "clamp(vMapUv, vSkinUvBounds.xy + vec2(0.00001), vSkinUvBounds.zw - vec2(0.00001))",
                ),
              );
            shader.fragmentShader = shader.fragmentShader.replace(
              "#include <opaque_fragment>",
              `outgoingLight = diffuseColor.rgb * (0.66 + 0.34 * max(dot(normal,
                normalize((viewMatrix * vec4(-24.0, 65.0, 36.0, 0.0)).xyz)), 0.0));
              #include <opaque_fragment>`,
            );
          };
          material.customProgramCacheKey = () => "gallery-skin-atlas-bounds-v3";
          if (outer) material.alphaTest = 1 / 255;
        }
      });
    }
  }
}
