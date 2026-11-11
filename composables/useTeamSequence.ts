import {
  dampProgress,
  keyboardMember,
  settledMember,
  wheelMember,
  type WheelGesture,
} from "~/lib/team-motion";

export interface TeamSceneHandle {
  setCinematicProgress: (progress: number | null, active: boolean) => void;
  updateNativeScene: () => boolean;
}

/** One demand-driven RAF; desktop input changes progress, never document scroll. */
export function useTeamSequence(memberIds: readonly string[]) {
  const count = memberIds.length;
  const hashes = memberIds.map((id) => `#${id}`);
  const router = useRouter();
  const route = useRoute();
  const track = ref<HTMLElement | null>(null);
  const stage = ref<HTMLElement | null>(null);
  const scenes = ref<TeamSceneHandle[]>([]);
  const gallery = ref<{
    update: (progress: number | null, active: number, elapsed: number) => boolean;
  } | null>(null);
  const cinematic = ref(false);
  const activeMember = ref(0);
  let scrollStep = 720;
  let stickyTop = 96;
  let frame = 0;
  let motionQuery: MediaQueryList | undefined;
  let navObserver: ResizeObserver | undefined;
  let disposed = false;
  let configured = false;
  let displayedProgress: number | null = null;
  let lastFrameTime = 0;
  let settleDuration = 520;
  let targetProgress = 0;
  let wheelGesture: WheelGesture = { distance: 0, lastAt: 0, stepped: false };

  function onScroll() {
    if (cinematic.value) return;
    scheduleUpdate();
  }

  function onWheel(event: WheelEvent) {
    if (!cinematic.value || event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY))
      return;
    event.preventDefault();
    const pixels =
      event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? scrollStep : 1);
    const base = settledMember(displayedProgress ?? targetProgress, count);
    const result = wheelMember(base, pixels, count, wheelGesture, performance.now());
    wheelGesture = result.gesture;
    if (result.member === base) return;
    targetProgress = result.member;
    scheduleUpdate();
  }

  function onKey(event: KeyboardEvent) {
    if (!cinematic.value || event.altKey || event.ctrlKey || event.metaKey) return;
    if (
      event.target instanceof Element &&
      event.target.closest("input, textarea, select, button, [contenteditable=true]")
    )
      return;
    const index = keyboardMember({
      key: event.key,
      shiftKey: event.shiftKey,
      progress: targetProgress,
      count,
    });
    if (index === null) return;
    event.preventDefault();
    scrollToMember(index);
  }

  function update(timestamp: number) {
    frame = 0;
    if (disposed || !track.value) return;
    if (cinematic.value) {
      const target = targetProgress;
      const elapsed = lastFrameTime ? Math.min(64, timestamp - lastFrameTime) : 16;
      lastFrameTime = timestamp;
      displayedProgress = dampProgress(
        displayedProgress ?? target,
        target,
        elapsed,
        settleDuration,
      );
      const settled = Math.abs(displayedProgress - target) < 0.0001;
      if (settled) displayedProgress = target;
      const progress = displayedProgress;
      const active = Math.min(count - 1, Math.floor(progress + 0.4));
      activeMember.value = active;
      scenes.value.forEach((scene, index) =>
        scene.setCinematicProgress(progress, index === active),
      );
      const moving = gallery.value?.update(progress, active, elapsed);
      if (!settled || moving) scheduleUpdate();
      else lastFrameTime = 0;
    } else {
      displayedProgress = null;
      lastFrameTime = 0;
      scenes.value.forEach((scene, index) => {
        if (scene.updateNativeScene()) activeMember.value = index;
      });
      gallery.value?.update(null, activeMember.value, 16);
    }
  }

  function scheduleUpdate() {
    if (!frame) frame = requestAnimationFrame(update);
  }

  function scrollToMember(index: number, behavior: ScrollBehavior = "smooth") {
    if (!track.value) return;
    if (cinematic.value) {
      wheelGesture = { distance: 0, lastAt: 0, stepped: false };
      targetProgress = settledMember(index, count);
      if (behavior === "instant") displayedProgress = index;
      scheduleUpdate();
    } else {
      document.getElementById(memberIds[index] ?? "")?.scrollIntoView({ behavior });
    }
  }

  async function navigateToMember(event: MouseEvent, index: number) {
    if (
      !cinematic.value ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    )
      return;
    event.preventDefault();
    const href = (event.currentTarget as HTMLAnchorElement).getAttribute("href");
    if (href && href !== route.hash) await router.push({ hash: href });
    if (disposed) return;
    scrollToMember(index, event.detail === 0 ? "instant" : "smooth");
  }

  function configure() {
    if (disposed || !stage.value || !track.value) return;
    wheelGesture = { distance: 0, lastAt: 0, stepped: false };
    const nav = document.querySelector<HTMLElement>(".nav");
    stickyTop = nav
      ? nav.getBoundingClientRect().height + (parseFloat(getComputedStyle(nav).top) || 0) + 40
      : 120;
    const stageHeight = window.innerHeight - stickyTop - 88;
    const wasCinematic = cinematic.value;
    const preservePosition = configured;
    settleDuration =
      parseFloat(getComputedStyle(stage.value).getPropertyValue("--duration-slow")) || 520;
    cinematic.value = window.innerWidth >= 720 && stageHeight >= 400 && !motionQuery?.matches;
    scrollStep = Math.max(520, stageHeight * 0.95);
    stage.value.style.setProperty("--team-stage-top", `${stickyTop}px`);
    stage.value.style.setProperty("--team-stage-height", `${stageHeight}px`);
    if (!cinematic.value) scenes.value.forEach((scene) => scene.setCinematicProgress(null, true));
    configured = true;
    void nextTick(() => {
      if (disposed) return;
      if (preservePosition && wasCinematic !== cinematic.value)
        scrollToMember(activeMember.value, "instant");
      if (cinematic.value) window.scrollTo({ top: 0, behavior: "instant" });
      scheduleUpdate();
    });
  }

  onMounted(() => {
    motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    motionQuery.addEventListener("change", configure);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", configure, { passive: true });
    const nav = document.querySelector(".nav");
    if (nav) {
      navObserver = new ResizeObserver(configure);
      navObserver.observe(nav);
    }
    configure();
    const initialIndex = hashes.indexOf(window.location.hash);
    if (initialIndex >= 0) void nextTick(() => scrollToMember(initialIndex, "instant"));
  });

  watch(
    () => route.hash,
    (hash) => {
      if (!configured || !cinematic.value) return;
      const index = hashes.indexOf(hash);
      scrollToMember(index < 0 ? 0 : index);
    },
  );

  onBeforeUnmount(() => {
    disposed = true;
    cancelAnimationFrame(frame);
    motionQuery?.removeEventListener("change", configure);
    navObserver?.disconnect();
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("resize", configure);
  });

  return {
    track,
    stage,
    scenes,
    gallery,
    cinematic,
    activeMember,
    navigateToMember,
    scheduleUpdate,
  };
}
