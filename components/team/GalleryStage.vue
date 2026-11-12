<script setup lang="ts">
import { canDragModel, dampProgress, isLeftButtonHeld } from "~/lib/team-motion";
import type { createTeamGallery } from "~/lib/team-gallery";
import type { SkinSource } from "~/lib/team-skin";

const props = defineProps<{
  skins: SkinSource[];
  names: string[];
  cinematic: boolean;
  active: number;
}>();
const emit = defineEmits<{ invalidate: []; prepared: [] }>();
const host = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const status = ref<"loading" | "ready" | "error">("loading");
const failed = ref<string[]>([]);
let gallery: Awaited<ReturnType<typeof createTeamGallery>> | undefined;
let resize: ResizeObserver | undefined;
let intersection: IntersectionObserver | undefined;
let motion: MediaQueryList | undefined;
let fine: MediaQueryList | undefined;
let visible = false;
let disposed = false;
let initializing = false;
let width = 1;
let height = 1;
let pointerX = 0;
let pointerY = 0;
let targetX = 0;
let targetY = 0;
let dragging = false;
let previousX = 0;
let releaseSession: (() => void) | undefined;
let latestProgress: number | null = null;

function invalidate() {
  emit("invalidate");
}

function updateCanvasLabel() {
  canvas.value?.setAttribute(
    "aria-label",
    `3D-галерея команды. ${props.names[props.active]}. Вращение: зажмите левую кнопку мыши или используйте стрелки влево и вправо.`,
  );
}

async function initialize() {
  if (initializing || disposed) return;
  initializing = true;
  try {
    const { acquireTeamGallery } = await import("~/lib/team-gallery-session");
    if (disposed || !host.value) return;
    const session = await acquireTeamGallery(props.skins, invalidate);
    if (disposed) {
      session.release();
      return;
    }
    gallery = session.gallery;
    releaseSession = session.release;
    canvas.value = session.canvas;
    canvas.value.tabIndex = 0;
    canvas.value.setAttribute("role", "img");
    updateCanvasLabel();
    canvas.value.addEventListener("webglcontextlost", contextLost);
    host.value.prepend(canvas.value);
    measure();
    await gallery.prepare();
    if (disposed) return;
    failed.value = props.names.filter((_, index) => !gallery?.loaded(index));
    // Draw the actual hash/native viewport while still hidden, then reveal atomically.
    renderFrame(latestProgress, props.active, 16);
    status.value = "ready";
    emit("prepared");
    invalidate();
  } catch (error) {
    console.warn("Team gallery initialization failed", error);
    if (!disposed) {
      status.value = "error";
      emit("prepared");
    }
  }
}

function measure() {
  if (!host.value) return;
  width = Math.max(1, host.value.clientWidth);
  height = Math.max(1, host.value.clientHeight);
  gallery?.resize(width, height, !props.cinematic);
  invalidate();
}

/** Rendering shares the sequence's demand-driven RAF; there is no viewer animation loop. */
function update(progress: number | null, active: number, elapsed: number) {
  latestProgress = progress;
  if (!visible || document.hidden || status.value !== "ready") return false;
  return renderFrame(progress, active, elapsed);
}

function renderFrame(progress: number | null, active: number, elapsed: number) {
  if (!gallery) return false;
  const interactive = props.cinematic && fine?.matches && !motion?.matches;
  if (!interactive) targetX = targetY = 0;
  pointerX = dampProgress(pointerX, targetX, elapsed, 520);
  pointerY = dampProgress(pointerY, targetY, elapsed, 520);
  const settling = Math.abs(pointerX - targetX) + Math.abs(pointerY - targetY) > 0.0005;
  if (!settling) {
    pointerX = targetX;
    pointerY = targetY;
  }
  gallery.begin();
  if (progress !== null) {
    gallery.render(progress, false, 0, 0, width, height, pointerX, pointerY);
  } else {
    const root = host.value?.getBoundingClientRect();
    if (!root) return false;
    const profiles =
      host.value?.parentElement?.querySelectorAll<HTMLElement>("[data-gallery-profile]");
    profiles?.forEach((profile, index) => {
      const rect = profile.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const compact = width < 720;
      // Native mobile sections are full-viewport compositions: let the scene reach the
      // section edges instead of leaving a flat band behind the member name.
      const viewHeight = rect.height;
      const viewTop = rect.top - root.top;
      gallery?.render(index, compact, 0, height - viewTop - viewHeight, width, viewHeight);
    });
  }
  if (canvas.value) {
    canvas.value.dataset.active = String(active);
    canvas.value.dataset.drawCalls = String(gallery.stats.calls);
    canvas.value.dataset.preparation = JSON.stringify(gallery.stats.timings);
  }
  return settling;
}
defineExpose({ update });

function pointerMove(event: PointerEvent) {
  if (dragging && !isLeftButtonHeld(event.buttons)) dragging = false;
  if (dragging) {
    gallery?.rotate(props.active, (event.clientX - previousX) * 0.008);
    previousX = event.clientX;
    invalidate();
    return;
  }
  if (!props.cinematic || !fine?.matches || motion?.matches || !host.value) return;
  const rect = host.value.getBoundingClientRect();
  targetX = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
  targetY = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));
  invalidate();
}
function pointerDown(event: PointerEvent) {
  if (!canDragModel(event.pointerType, event.button)) return;
  dragging = true;
  previousX = event.clientX;
  canvas.value?.setPointerCapture(event.pointerId);
}
function release() {
  dragging = false;
}
function leave() {
  targetX = targetY = 0;
  invalidate();
}
function rotate(direction: number) {
  gallery?.rotate(props.active, (direction * Math.PI) / 2);
  invalidate();
}
function contextLost(event: Event) {
  event.preventDefault();
  status.value = "error";
}

watch(
  () => props.cinematic,
  () => nextTick(measure),
);
watch(
  () => props.active,
  () => {
    release();
    updateCanvasLabel();
  },
  { immediate: true },
);
onMounted(() => {
  motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  motion.addEventListener("change", invalidate);
  document.addEventListener("visibilitychange", invalidate);
  window.addEventListener("pointerup", release);
  resize = new ResizeObserver(measure);
  if (host.value) resize.observe(host.value);
  intersection = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    if (visible) void initialize();
    invalidate();
  });
  if (host.value) intersection.observe(host.value);
  void initialize();
});
onBeforeUnmount(() => {
  disposed = true;
  resize?.disconnect();
  intersection?.disconnect();
  motion?.removeEventListener("change", invalidate);
  document.removeEventListener("visibilitychange", invalidate);
  window.removeEventListener("pointerup", release);
  canvas.value?.removeEventListener("webglcontextlost", contextLost);
  releaseSession?.();
});
</script>

<template>
  <div
    ref="host"
    class="gallery-stage"
    :data-status="status"
    @pointerdown="pointerDown"
    @pointermove="pointerMove"
    @pointerup="release"
    @pointercancel="release"
    @lostpointercapture="release"
    @pointerleave="leave"
    @keydown.left.prevent="rotate(-1)"
    @keydown.right.prevent="rotate(1)"
  >
    <p v-if="status === 'error'" class="gallery-stage__status" role="status">
      3D недоступно. Профили и ссылки доступны ниже.
    </p>
    <p v-else-if="failed.length" class="gallery-stage__status" role="status">
      Не удалось загрузить скин: {{ failed.join(", ") }}
    </p>
  </div>
</template>

<style scoped>
.gallery-stage {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}
:deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: pan-y;
  pointer-events: auto;
  opacity: 0;
  /* The prepared page fades as one unit; never fade 3D over already visible names. */
  mask-image: linear-gradient(transparent, black 7%, black 93%, transparent);
}
.gallery-stage[data-status="ready"] :deep(canvas) {
  opacity: 1;
}
:deep(canvas:active) {
  cursor: grabbing;
}
:deep(canvas:focus-visible) {
  outline: 2px solid var(--color-text-2);
  outline-offset: -4px;
}
.gallery-stage__status {
  position: absolute;
  bottom: 8px;
  left: 24px;
  margin: 0;
  color: var(--color-text-2);
  font-size: 0.8rem;
}
</style>
