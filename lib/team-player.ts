import { FrontSide, Mesh, MeshStandardMaterial } from "three";
import type { PlayerObject } from "skinview3d/libs/model.js";

/** A relaxed, non-intersecting pose; source texture pixels and alpha stay unchanged. */
export function applyGalleryPose(player: PlayerObject, index: number) {
  player.rotation.y = index === 1 ? -0.26 : 0.28;
  player.cape.visible = player.elytra.visible = player.ears.visible = false;
  const skin = player.skin;
  skin.leftArm.rotation.z = -0.065;
  skin.rightArm.rotation.z = 0.065;
  // The viewer's default arm/body front faces share Z, even after a Z-axis arm tilt.
  skin.leftArm.position.z = skin.rightArm.position.z = 0.125;
  // Separate the 4.5-unit trouser shells, not merely their narrower inner cubes.
  skin.leftLeg.position.x = 2.3;
  skin.rightLeg.position.x = -2.3;
  skin.head.rotation.y = index === 1 ? 0.12 : -0.08;
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
          material.side = FrontSide;
          material.transparent = outer;
          material.depthWrite = !outer;
          material.polygonOffset = false;
          // Minecraft's albedo needs bounded directional shading, not the stone's
          // HDR light/exposure response. Work in linear space before sRGB output.
          material.toneMapped = false;
          material.fog = false;
          material.onBeforeCompile = (shader) => {
            shader.fragmentShader = shader.fragmentShader.replace(
              "#include <opaque_fragment>",
              `outgoingLight = diffuseColor.rgb * (0.72 + 0.28 * max(dot(normal,
                normalize((viewMatrix * vec4(-24.0, 65.0, 36.0, 0.0)).xyz)), 0.0));
              #include <opaque_fragment>`,
            );
          };
          material.customProgramCacheKey = () => "gallery-skin-directional-v1";
          if (outer) material.alphaTest = 1 / 255;
        }
      });
    }
  }
}
