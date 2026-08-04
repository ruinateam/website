<template>
  <div ref="viewport" class="skin-viewer">
    <canvas
      ref="canvas"
      class="skin-viewer__canvas"
      role="img"
      :aria-label="`3D-модель Minecraft-профиля: ${name}`"
    ></canvas>
    <div v-if="status !== 'ready'" class="skin-viewer__status" aria-live="polite">
      {{ status === "error" ? "Не удалось загрузить профиль" : "Загружаем профиль" }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import type { SkinViewer as SkinViewerInstance } from "skinview3d";
import type { AnimationFileType, SkinViewBlockbench } from "skinview3d-blockbench";

const PROFILE_ANIMATION_URL = "/animations/profiles.animation.json";
const PROFILE_ACTIONS = ["wave", "stretch", "crouch", "inspect"];

const props = withDefaults(
  defineProps<{
    name: string;
    skin: string;
    animation?: "idle" | "intro";
  }>(),
  { animation: "idle" },
);

const viewport = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const status = ref<"loading" | "ready" | "error">("loading");
let viewer: SkinViewerInstance | null = null;
let resizeObserver: ResizeObserver | null = null;
let disposed = false;

const resizeViewer = () => {
  if (!viewer || !viewport.value) return;
  const { width, height } = viewport.value.getBoundingClientRect();
  viewer.setSize(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
};

const loadProfileAnimation = async () => {
  const response = await fetch(PROFILE_ANIMATION_URL);
  if (!response.ok) throw new Error("Failed to load profile animation");

  const { SkinViewBlockbench } = await import("skinview3d-blockbench");
  const animationData = (await response.json()) as AnimationFileType;
  let loopsUntilAction = 2 + Math.floor(Math.random() * 3);
  let animation: SkinViewBlockbench;

  const scheduleAction = () => {
    loopsUntilAction = 2 + Math.floor(Math.random() * 3);
  };

  animation = new SkinViewBlockbench({
    animation: animationData,
    animationName: props.animation === "intro" ? "intro" : "idle",
    connectCape: true,
    onLoopEnd: () => {
      if (animation.animationName !== "idle" || --loopsUntilAction > 0) return;
      animation.setAnimation(PROFILE_ACTIONS[Math.floor(Math.random() * PROFILE_ACTIONS.length)]!);
    },
    onFinish: () => {
      if (animation.animationName === "idle") return;
      animation.setAnimation("idle");
      scheduleAction();
    },
  });

  return animation;
};

onMounted(async () => {
  try {
    const skinview3d = await import("skinview3d");
    if (disposed || !canvas.value) return;

    viewer = new skinview3d.SkinViewer({
      canvas: canvas.value,
      width: 320,
      height: 400,
      background: 0x08080a,
      enableControls: true,
      pixelRatio: "match-device",
      zoom: 0.72,
    });
    viewer.controls.enablePan = false;
    viewer.controls.enableZoom = false;
    viewer.globalLight.intensity = 1.5;
    viewer.cameraLight.intensity = 0.8;

    resizeViewer();
    resizeObserver = new ResizeObserver(resizeViewer);
    if (viewport.value) resizeObserver.observe(viewport.value);

    await viewer.loadSkin(props.skin, { model: "auto-detect" });
    if (!disposed) status.value = "ready";

    try {
      const animation = await loadProfileAnimation();
      if (!disposed) viewer.animation = animation;
    } catch {
      if (disposed) return;
      const animation = new skinview3d.IdleAnimation();
      animation.speed = 0.8;
      viewer.animation = animation;
    }
  } catch {
    if (!disposed) status.value = "error";
  }
});

onBeforeUnmount(() => {
  disposed = true;
  resizeObserver?.disconnect();
  viewer?.dispose();
  viewer = null;
});
</script>

<style scoped>
.skin-viewer {
  position: relative;
  width: 100%;
  height: 100%;
}

.skin-viewer__canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: grab;
  touch-action: none;
}

.skin-viewer__canvas:active {
  cursor: grabbing;
}

.skin-viewer__status {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  color: rgba(255, 255, 255, 0.64);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-align: center;
  text-transform: uppercase;
}
</style>
