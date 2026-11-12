import {
  ACESFilmicToneMapping,
  AmbientLight,
  CanvasTexture,
  DirectionalLight,
  FogExp2,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SpotLight,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three";
import type { BufferGeometry, Material, Texture } from "three";
import { PlayerObject } from "skinview3d/libs/model.js";
import { inferModelType, loadSkinToCanvas } from "skinview-utils";
import { loadSkinImage, type SkinSource } from "./team-skin";
import { galleryFrame, GALLERY_CENTERS, PLAYER_POSITIONS } from "./team-cinema";
import { PLAYER_SCALE } from "./team-scale";
import { loadPurpurMaterials } from "./team-purpur";
import { createPurpurArchitecture } from "./team-architecture";
import { applyGalleryPose, boundSkinAtlasUVs } from "./team-player";
import { galleryCompileScene } from "./team-warmup";

export async function createTeamGallery(
  canvas: HTMLCanvasElement,
  skins: SkinSource[],
  invalidate: () => void,
) {
  const started = performance.now();
  const timings: Record<string, number> = {};
  // Start independent downloads together, before synchronous WebGL work.
  const images = Promise.allSettled(skins.map(loadSkinImage));
  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  timings.webgl = performance.now() - started;
  const materialRequest = loadPurpurMaterials();
  let surfaces: Awaited<ReturnType<typeof loadPurpurMaterials>>;
  try {
    surfaces = await materialRequest;
  } catch (error) {
    renderer.dispose();
    renderer.forceContextLoss();
    throw error;
  }
  timings.resources = performance.now() - started;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  // Camera/light intensity changes do not change this static world's occluders.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  const scene = new Scene();
  scene.fog = new FogExp2(0x0b0f11, 0.017);
  const camera = new PerspectiveCamera(38, 1, 2, 240);
  const architecture = createPurpurArchitecture(surfaces);
  scene.add(architecture.root);
  const plane = new PlaneGeometry(1, 1);
  const textures: Texture[] = [...surfaces.textures];
  let disposed = false;
  const players: PlayerObject[] = [];
  const userTurns = [0, 0, 0];
  const loaded = [false, false, false];
  const shadowBaked = [false, false, false];
  const lamps: SpotLight[] = [];

  const ambient = new AmbientLight(0xc8d5df, 1);
  const sun = new DirectionalLight(0xf0f1ed, 2.5);
  sun.position.set(-24, 65, 36);
  scene.add(ambient, sun);
  const fill = new DirectionalLight(0x8babbf, 1.5);
  fill.position.set(18, 25, -35);
  scene.add(fill);

  GALLERY_CENTERS.forEach((center, index) => {
    const player = new PlayerObject();
    const position = PLAYER_POSITIONS[index]!;
    player.position.set(...position);
    player.scale.setScalar(PLAYER_SCALE);
    applyGalleryPose(player, index);
    player.visible = false;
    players.push(player);
    scene.add(player);

    const lamp = new SpotLight(index === 1 ? 0xc6dce2 : 0xe2e6d7, 4, 110, Math.PI / 5, 0.75, 0);
    lamp.position.set(center - 14, 30, 18);
    lamp.target.position.set(position[0], position[1], position[2]);
    lamp.castShadow = true;
    lamp.shadow.autoUpdate = false;
    lamp.shadow.needsUpdate = true;
    lamp.shadow.mapSize.set(1024, 1024);
    lamp.shadow.camera.near = 8;
    lamp.shadow.camera.far = 110;
    lamp.shadow.bias = -0.0002;
    lamp.shadow.normalBias = 0.03;
    scene.add(lamp, lamp.target);
    lamps.push(lamp);

    // Soft, static atmospheric aperture behind the stone, no bloom/blur pass.
    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = glowCanvas.height = 64;
    const ctx = glowCanvas.getContext("2d");
    if (ctx) {
      const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      glow.addColorStop(0, "rgba(136,177,181,0.18)");
      glow.addColorStop(1, "rgba(136,177,181,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 64, 64);
      const texture = new CanvasTexture(glowCanvas);
      textures.push(texture);
      const haze = new Mesh(
        plane,
        new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
      );
      haze.position.set(center + 3, 18, -20);
      haze.scale.set(56, 44, 1);
      scene.add(haze);
    }
  });

  // Each URL is loaded once. Late completion cannot resurrect disposed GPU resources.
  const ready = images.then((results) =>
    Promise.allSettled(
      results.map(async (result, index) => {
        if (result.status === "rejected") return;
        const image = result.value;
        if (disposed) return;
        const normalized = document.createElement("canvas");
        loadSkinToCanvas(normalized, image);
        const texture = new CanvasTexture(normalized);
        texture.magFilter = texture.minFilter = NearestFilter;
        texture.colorSpace = SRGBColorSpace;
        textures.push(texture);
        const player = players[index];
        if (!player) return;
        player.skin.map = texture;
        player.skin.modelType = inferModelType(normalized);
        // Model inference rewrites arm UVs (classic/slim), so refresh their face bounds.
        boundSkinAtlasUVs(player);
        loaded[index] = true;
        player.visible = true;
        renderer.shadowMap.needsUpdate = true;
        lamps.forEach((lamp) => {
          lamp.shadow.needsUpdate = true;
        });
        invalidate();
      }),
    ),
  );

  const look = new Vector3();
  let prepared = false;
  let sizeKey = "";
  function setFrame(
    progress: number,
    compact: boolean,
    pointerX = 0,
    pointerY = 0,
    compactHeight = 0,
  ) {
    const shot = galleryFrame(progress, compact, compactHeight);
    camera.position.set(...shot.camera);
    camera.position.x += pointerX * 0.7;
    camera.position.y += pointerY * 0.35;
    look.set(...shot.target);
    camera.lookAt(look);
    players.forEach((player, index) => {
      const member = shot.members[index]!;
      player.visible = Boolean(loaded[index]) && Math.abs(progress - index) < 0.95;
      player.rotation.y = (index === 1 ? -0.26 : 0.28) + member.turn + userTurns[index]!;
      const lamp = lamps[index]!;
      if (player.visible && !shadowBaked[index]) {
        lamp.shadow.needsUpdate = true;
        renderer.shadowMap.needsUpdate = true;
        shadowBaked[index] = true;
      }
      lamp.intensity = (0.4 + member.light * 4) * (1 + pointerX * 0.04);
    });
  }

  return {
    ready,
    async prepare() {
      if (prepared) return;
      await ready;
      if (disposed) return;
      const start = performance.now();
      // Compile every character/material variant and upload textures before reveal.
      players.forEach((player, index) => {
        player.visible = loaded[index] ?? false;
      });
      textures.forEach((texture) => renderer.initTexture(texture));
      renderer.compile(galleryCompileScene(scene), camera);
      timings.compileAndUpload = performance.now() - start;
      // Bake all three static shadow maps with every loaded caster present.
      const shadowStart = performance.now();
      renderer.setViewport(0, 0, 1, 1);
      renderer.setScissorTest(false);
      setFrame(0, false);
      players.forEach((player, index) => {
        player.visible = loaded[index] ?? false;
      });
      renderer.render(scene, camera);
      shadowBaked.fill(true);
      timings.firstRenderAndShadows = performance.now() - shadowStart;
      timings.total = performance.now() - started;
      prepared = true;
    },
    resize(width: number, height: number, compact: boolean) {
      const ratio = Math.min(window.devicePixelRatio || 1, compact ? 1.25 : 1.5);
      const key = `${width}:${height}:${ratio}:${compact}`;
      if (key === sizeKey) return;
      sizeKey = key;
      renderer.setPixelRatio(ratio);
      renderer.setSize(Math.max(1, width), Math.max(1, height), false);
      const resolution = compact ? 512 : 1024;
      lamps.forEach((lamp, index) => {
        if (lamp.shadow.mapSize.x === resolution) return;
        lamp.shadow.map?.dispose();
        lamp.shadow.map = null;
        lamp.shadow.mapSize.set(resolution, resolution);
        shadowBaked[index] = false;
        lamp.shadow.needsUpdate = true;
        renderer.shadowMap.needsUpdate = true;
      });
    },
    begin() {
      renderer.setScissorTest(false);
      renderer.clear();
    },
    render(
      progress: number,
      compact: boolean,
      x: number,
      y: number,
      width: number,
      height: number,
      pointerX = 0,
      pointerY = 0,
    ) {
      setFrame(progress, compact, pointerX, pointerY, height);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      renderer.setViewport(x, y, width, height);
      renderer.setScissor(x, y, width, height);
      renderer.setScissorTest(true);
      renderer.render(scene, camera);
    },
    rotate(index: number, delta: number) {
      userTurns[index] = ((userTurns[index] ?? 0) + delta) % (Math.PI * 2);
      const lamp = lamps[index];
      if (lamp) lamp.shadow.needsUpdate = true;
      renderer.shadowMap.needsUpdate = true;
    },
    loaded(index: number) {
      return loaded[index] ?? false;
    },
    get stats() {
      return {
        calls: renderer.info.render.calls,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        timings,
      };
    },
    dispose() {
      disposed = true;
      const materials = new Set<Material>();
      const usedGeometry = new Set<BufferGeometry>(architecture.geometries);
      scene.traverse((object) => {
        if (object instanceof Mesh) {
          usedGeometry.add(object.geometry);
          for (const surface of Array.isArray(object.material)
            ? object.material
            : [object.material])
            materials.add(surface);
        }
      });
      materials.forEach((surface) => surface.dispose());
      usedGeometry.forEach((geometry) => geometry.dispose());
      textures.forEach((texture) => texture.dispose());
      lamps.forEach((lamp) => lamp.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
