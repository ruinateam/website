<script setup lang="ts">
import {
  projects,
  lanes,
  connections,
  events,
  projectById,
  laneById,
  geometry,
  point,
  mediaLabels,
  confidenceLabels,
  officialTimeline,
  primarySources,
} from "~/lib/marvel-timeline";
import type { Project, MediaType, Connection, Lane } from "~/lib/marvel-timeline";

useSeoMeta({
  title: "Marvel: ветви времени TVA — Ruina.team",
  description:
    "Интерактивное древо времени Marvel в эстетике TVA: основная линия MCU, параллельные реальности, сюжетные связи и источники.",
});
const format = ref<MediaType | "all">("all");
const query = ref("");
const view = ref<"map" | "list">("map");
const branches = ref(true);
const spoilers = ref(false);
const selectedId = ref<string | null>(null);
const selected = computed(() => (selectedId.value ? projectById.get(selectedId.value) : undefined));
const selectedLane = computed(() =>
  selected.value ? laneById.get(selected.value.lane) : undefined,
);
const selectedConnections = computed(() =>
  connections.filter(
    (link) =>
      !isBackboneLink(link) &&
      (link.source === selectedId.value || link.target === selectedId.value),
  ),
);
const selectedEvents = computed(() =>
  events.filter(
    (event) =>
      event.project === selectedId.value ||
      selectedConnections.value.some((link) => link.event === event.id),
  ),
);
const dialog = ref<HTMLDialogElement | null>(null);
let dialogTrigger: HTMLElement | null = null;
const viewport = ref<HTMLElement | null>(null);
const initialZoom = 0.8;
const zoom = ref(initialZoom);
const scroll = reactive({ x: 0, y: 0, width: 1000, height: 620 });
const activeLane = ref("mcu");
const failedPosters = ref(new Set<string>());
const normalizedQuery = computed(() =>
  query.value.toLocaleLowerCase("ru").replaceAll("ё", "е").trim(),
);
const filtered = computed(() =>
  projects.filter(
    (project) =>
      (branches.value || project.lane === "mcu") &&
      (format.value === "all" || project.media === format.value) &&
      (!normalizedQuery.value ||
        `${project.title} ${laneById.get(project.lane)!.title}`
          .toLocaleLowerCase("ru")
          .replaceAll("ё", "е")
          .includes(normalizedQuery.value)),
  ),
);
const filteredIds = computed(() => new Set(filtered.value.map((project) => project.id)));
const shownLanes = computed(() =>
  lanes.filter((lane) => filtered.value.some((project) => project.lane === lane.id)),
);
const isBackboneLink = (link: Connection) =>
  link.relation === "precedes" && link.id.startsWith("order-");
const shownConnections = computed(() =>
  connections.filter(
    (link) =>
      filteredIds.value.has(link.source) &&
      filteredIds.value.has(link.target) &&
      !isBackboneLink(link),
  ),
);
const connectedIds = computed(
  () =>
    new Set(shownConnections.value.flatMap((connection) => [connection.source, connection.target])),
);
const highlighted = ref<string | null>(null);
const expandedLane = ref<string | null>(null);
const relatedIds = computed(
  () =>
    new Set(
      connections
        .filter(
          (link) =>
            !isBackboneLink(link) &&
            (link.source === highlighted.value || link.target === highlighted.value),
        )
        .flatMap((link) => [link.source, link.target]),
    ),
);
const formats: { id: MediaType | "all"; label: string }[] = [
  { id: "all", label: "Все проекты" },
  { id: "film", label: "Фильмы" },
  { id: "series", label: "Сериалы" },
  { id: "animation", label: "Анимация" },
  { id: "special", label: "Спецвыпуски" },
];
const relationLabels: Record<Connection["relation"], string> = {
  precedes: "Следует по хронологии",
  continues: "Продолжает историю",
  causes: "Запускает события",
  crossover_with: "Пересечение реальностей",
  connected_via: "Связано событием",
  branch_of: "Ответвление линии",
};
const chapters = [
  { id: "first-avenger", title: "Начало", years: "1943–2011" },
  { id: "avengers", title: "Сбор Мстителей", years: "2012–2015" },
  { id: "civil-war", title: "Раскол", years: "2016–2017" },
  { id: "infinity-war", title: "Бесконечность", years: "2018–2023" },
  { id: "no-way-home", title: "Мультивселенная", years: "После «Финала»" },
];
const chapterIndex = computed(() => {
  const centerSlot =
    ((scroll.x + scroll.width / 2) / zoom.value - geometry.padding) / geometry.step;
  return Math.max(
    0,
    chapters.findLastIndex((chapter) => projectById.get(chapter.id)!.slot <= centerSlot + 0.01),
  );
});
const drag = reactive({
  active: false,
  moved: false,
  startX: 0,
  startY: 0,
  scrollX: 0,
  scrollY: 0,
  pointerId: -1,
});
let resizeObserver: ResizeObserver | undefined;
let savedMapPosition = { x: 0, y: 0 };
let zoomFrame: number | undefined;
let pendingZoomScroll: { x: number; y: number } | undefined;

const zoomLimits = { min: 0.45, max: 1.2, step: 0.1 };
const mainStrandOffsets = [-24, -18, -12, -6, 0, 6, 12, 18, 24];
const connectionFiberOffsets = [-5, 0, 5];
const futureBranchOffsets = [-190, -126, -70, -26, 34, 96, 168];
const laneKindLabels: Record<Lane["kind"], string> = {
  main: "Ствол",
  story: "История Земли-616",
  alternate: "Другая реальность",
  "outside-time": "Вне времени",
};
const laneProjectsById = new Map(
  lanes.map((lane) => [
    lane.id,
    projects.filter((project) => project.lane === lane.id).sort((a, b) => a.slot - b.slot),
  ]),
);
const laneBoundsById = new Map(
  lanes.map((lane) => {
    const nodes = laneProjectsById.get(lane.id)!;
    return [
      lane.id,
      { start: point(nodes[0]!).x - 92, end: point(nodes[nodes.length - 1]!).x + 108 },
    ];
  }),
);
const nodeSizes = {
  compact: { width: 184, height: 122 },
  standard: { width: 208, height: 140 },
  wide: { width: 232, height: 158 },
} as const;
function nodeSize(project: Project) {
  if (project.media === "special") return nodeSizes.compact;
  return project.major ? nodeSizes.wide : nodeSizes.standard;
}
function expandLane(id: string) {
  if (drag.active) return;
  expandedLane.value = id;
}
function collapseLane() {
  expandedLane.value = null;
}
function isLaneLink(link: Connection) {
  if (!expandedLane.value) return false;
  return (
    projectById.get(link.source)?.lane === expandedLane.value ||
    projectById.get(link.target)?.lane === expandedLane.value
  );
}
const laneZones = computed(() => {
  const sorted = [...shownLanes.value].sort((a, b) => a.y - b.y);
  return sorted.map((lane, index) => {
    const bounds = laneBoundsById.get(lane.id)!;
    const previous = sorted[index - 1];
    const next = sorted[index + 1];
    const top = previous ? (previous.y + lane.y) / 2 : lane.y - 210;
    const bottom = next ? (lane.y + next.y) / 2 : lane.y + 64;
    return {
      id: lane.id,
      left: bounds.start,
      width: Math.max(0, bounds.end - bounds.start),
      top,
      height: Math.max(0, bottom - top),
    };
  });
});
const sourceDateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const verifiedLabel = computed(() => {
  const value = officialTimeline.accessedAt ? new Date(officialTimeline.accessedAt) : null;
  return value && !Number.isNaN(value.getTime())
    ? sourceDateFormat.format(value)
    : "в сентябре 2026 года";
});

function strandPath(start: number, end: number, y: number, offset: number, index: number) {
  const span = end - start;
  const direction = index % 2 === 0 ? 1 : -1;
  const baseline = y + offset;
  const wave = (8 + (index % 4) * 2.5) * direction;

  return `M ${start} ${baseline}
    C ${start + span * 0.1} ${baseline + wave}, ${start + span * 0.16} ${baseline - wave}, ${start + span * 0.27} ${baseline}
    S ${start + span * 0.43} ${baseline + wave}, ${start + span * 0.54} ${baseline}
    S ${start + span * 0.71} ${baseline - wave}, ${start + span * 0.8} ${baseline}
    S ${start + span * 0.93} ${baseline + wave}, ${end} ${baseline}`;
}

function connectionBranchPath(connection: Connection, offset: number, index: number) {
  const from = point(projectById.get(connection.source)!);
  const to = point(projectById.get(connection.target)!);
  const distance = to.x - from.x;
  const middle = from.x + distance * 0.5;

  if (from.y === to.y) {
    const direction = connection.id.length % 2 === 0 ? 1 : -1;
    const crown = direction * (54 + index * 7 + offset * 2);
    return `M ${from.x} ${from.y}
      C ${from.x + distance * 0.28} ${from.y + crown},
        ${to.x - distance * 0.28} ${to.y + crown},
        ${to.x} ${to.y}`;
  }

  return `M ${from.x} ${from.y}
    C ${middle} ${from.y + offset * 3},
      ${middle} ${to.y + offset * 3},
      ${to.x} ${to.y}`;
}

function futureBranchPath(offset: number, index: number) {
  const start = geometry.width - 820;
  const end = geometry.width - 54;
  const direction = Math.sign(offset) || (index % 2 === 0 ? 1 : -1);

  return `M ${start} ${geometry.mainY + (index - 3) * 4}
    C ${start + 270} ${geometry.mainY + direction * 18},
      ${end - 310} ${geometry.mainY + offset * 0.76},
      ${end} ${geometry.mainY + offset}`;
}

function laneProjectCount(id: string) {
  return laneProjectsById.get(id)!.length;
}

function syncScroll() {
  if (!viewport.value) return;
  scroll.x = viewport.value.scrollLeft;
  scroll.y = viewport.value.scrollTop;
  scroll.width = viewport.value.clientWidth;
  scroll.height = viewport.value.clientHeight;
}
function moveTo(x: number, y: number, smooth = true) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const left = Math.max(0, x * zoom.value - scroll.width / 2);
  const top = Math.max(0, y * zoom.value - scroll.height / 2);
  const nearby = Math.hypot(left - scroll.x, top - scroll.y) < scroll.width;
  viewport.value?.scrollTo({
    left,
    top,
    behavior: smooth && nearby && !reduced ? "smooth" : "instant",
  });
}
function goToProject(id: string) {
  const project = projectById.get(id);
  if (!project) return;
  if (project.lane !== "mcu") branches.value = true;
  format.value = "all";
  query.value = "";
  nextTick(() => {
    activeLane.value = project.lane;
    if (view.value === "list") {
      document
        .getElementById(`list-${id}`)
        ?.scrollIntoView({ block: "center", behavior: "instant" });
    } else moveTo(point(project).x, point(project).y);
  });
}
async function goToUniverse(id: string) {
  const nodes = laneProjectsById.get(id);
  const project = nodes?.[Math.floor(nodes.length / 2)];
  if (!project) return;
  branches.value = true;
  format.value = "all";
  query.value = "";
  view.value = "map";
  activeLane.value = id;
  await nextTick();
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelector<HTMLElement>(".map-heading")?.scrollIntoView({
    block: "start",
    behavior: reduced ? "auto" : "smooth",
  });
  moveTo(point(project).x, point(project).y);
}
function cancelPendingZoom() {
  if (zoomFrame !== undefined) cancelAnimationFrame(zoomFrame);
  zoomFrame = undefined;
  pendingZoomScroll = undefined;
}
function setZoom(
  nextZoom: number,
  anchor: { x: number; y: number },
  viewportOffset: { x: number; y: number },
) {
  const value = Math.max(
    zoomLimits.min,
    Math.min(zoomLimits.max, Math.round(nextZoom * 100) / 100),
  );
  if (value === zoom.value) return;

  zoom.value = value;
  pendingZoomScroll = {
    x: Math.max(0, anchor.x * value - viewportOffset.x),
    y: Math.max(0, anchor.y * value - viewportOffset.y),
  };
  if (zoomFrame !== undefined) return;

  zoomFrame = requestAnimationFrame(() => {
    zoomFrame = undefined;
    const position = pendingZoomScroll;
    pendingZoomScroll = undefined;
    if (!viewport.value || !position) return;
    viewport.value.scrollTo({ left: position.x, top: position.y, behavior: "instant" });
    syncScroll();
  });
}
function changeZoom(delta: number) {
  const element = viewport.value;
  if (!element) return;
  const position = pendingZoomScroll ?? { x: element.scrollLeft, y: element.scrollTop };
  const viewportOffset = { x: element.clientWidth / 2, y: element.clientHeight / 2 };
  setZoom(
    zoom.value + delta,
    {
      x: (position.x + viewportOffset.x) / zoom.value,
      y: (position.y + viewportOffset.y) / zoom.value,
    },
    viewportOffset,
  );
}
function zoomMap(event: WheelEvent) {
  if ((!event.ctrlKey && !event.metaKey) || !event.deltaY || !viewport.value) return;

  event.preventDefault();
  const element = viewport.value;
  const box = element.getBoundingClientRect();
  const viewportOffset = {
    x: Math.max(0, Math.min(element.clientWidth, event.clientX - box.left)),
    y: Math.max(0, Math.min(element.clientHeight, event.clientY - box.top)),
  };
  const position = pendingZoomScroll ?? { x: element.scrollLeft, y: element.scrollTop };
  setZoom(
    zoom.value + (event.deltaY < 0 ? zoomLimits.step : -zoomLimits.step),
    {
      x: (position.x + viewportOffset.x) / zoom.value,
      y: (position.y + viewportOffset.y) / zoom.value,
    },
    viewportOffset,
  );
}
async function resetMap() {
  format.value = "all";
  query.value = "";
  branches.value = true;
  activeLane.value = "mcu";
  cancelPendingZoom();
  zoom.value = initialZoom;
  await nextTick();
  syncScroll();
  moveTo(scroll.width / (2 * zoom.value), geometry.mainY - 48, false);
}
function openProject(project: Project, event?: MouseEvent) {
  if (drag.moved) return;
  if (!dialog.value?.open)
    dialogTrigger =
      event?.currentTarget instanceof HTMLElement
        ? event.currentTarget
        : (document.activeElement as HTMLElement);
  selectedId.value = project.id;
  nextTick(() => {
    if (dialog.value && !dialog.value.open) dialog.value.showModal();
  });
}
function closeProject() {
  dialog.value?.close();
}
async function revealSelected() {
  const id = selectedId.value;
  if (!id) return;
  closeProject();
  view.value = "map";
  await nextTick();
  goToProject(id);
}
function selectRelated(id: string) {
  selectedId.value = id;
  nextTick(() => {
    dialog.value?.scrollTo({ top: 0, behavior: "instant" });
    dialog.value?.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
  });
}
function onDialogClose() {
  selectedId.value = null;
  spoilers.value = false;
  dialogTrigger?.focus({ preventScroll: true });
}
function startDrag(event: PointerEvent) {
  // Touch uses native two-axis scrolling and browser pinch zoom.
  drag.moved = false;
  expandedLane.value = null;
  if (!viewport.value || event.pointerType !== "mouse" || event.button !== 0) return;
  drag.active = true;
  drag.moved = false;
  drag.startX = event.clientX;
  drag.startY = event.clientY;
  drag.scrollX = viewport.value.scrollLeft;
  drag.scrollY = viewport.value.scrollTop;
  drag.pointerId = event.pointerId;
}
function dragMap(event: PointerEvent) {
  if (!drag.active || !viewport.value) return;
  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;
  if (!drag.moved && Math.hypot(dx, dy) < 5) return;
  drag.moved = true;
  viewport.value.setPointerCapture(event.pointerId);
  viewport.value.scrollLeft = drag.scrollX - dx;
  viewport.value.scrollTop = drag.scrollY - dy;
}
function stopDrag() {
  if (viewport.value?.hasPointerCapture(drag.pointerId))
    viewport.value.releasePointerCapture(drag.pointerId);
  drag.active = false;
}
function keyboardMap(event: KeyboardEvent) {
  if (event.target !== viewport.value) return;
  const offsets: Record<string, [number, number]> = {
    ArrowLeft: [-240, 0],
    ArrowRight: [240, 0],
    ArrowUp: [0, -180],
    ArrowDown: [0, 180],
  };
  const offset = offsets[event.key];
  if (offset) {
    event.preventDefault();
    viewport.value?.scrollBy({ left: offset[0], top: offset[1], behavior: "instant" });
  }
  if (event.key === "Home") {
    event.preventDefault();
    resetMap();
  }
}
function overviewNavigate(event: MouseEvent) {
  const box =
    event.currentTarget instanceof Element ? event.currentTarget.getBoundingClientRect() : null;
  if (box)
    moveTo(
      ((event.clientX - box.left) / box.width) * geometry.width,
      ((event.clientY - box.top) / box.height) * geometry.height,
    );
}
function nodeTop(project: Project) {
  const position = point(project);
  return project.lane === "mcu"
    ? position.y + (project.slot % 2 === 0 ? -205 : 72)
    : position.y - 166;
}
function laneBounds(id: string) {
  return laneBoundsById.get(id)!;
}
function failPoster(id: string) {
  failedPosters.value = new Set([...failedPosters.value, id]);
}
watch([format, branches, normalizedQuery], () => {
  activeLane.value = "mcu";
  const first = filtered.value[0];
  if (first && (normalizedQuery.value || format.value !== "all")) {
    activeLane.value = first.lane;
    nextTick(() => moveTo(point(first).x, point(first).y, false));
  }
  if (!branches.value && !normalizedQuery.value && format.value === "all")
    nextTick(() => moveTo((scroll.x + scroll.width / 2) / zoom.value, geometry.mainY, false));
});
watch(viewport, (element, previous) => {
  if (previous) resizeObserver?.unobserve(previous);
  if (!element) return;
  resizeObserver?.observe(element);
  syncScroll();
  if (!normalizedQuery.value && format.value === "all")
    moveTo(scroll.width / (2 * zoom.value), geometry.mainY, false);
});
watch(view, async (next, previous) => {
  if (previous === "map") savedMapPosition = { x: scroll.x, y: scroll.y };
  await nextTick();
  if (next === "map" && viewport.value) {
    resizeObserver?.observe(viewport.value);
    viewport.value.scrollTo({
      left: savedMapPosition.x,
      top: savedMapPosition.y,
      behavior: "instant",
    });
    syncScroll();
  }
});
onMounted(() => {
  resizeObserver = new ResizeObserver(syncScroll);
  if (viewport.value) resizeObserver.observe(viewport.value);
  syncScroll();
  resetMap();
});
onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  cancelPendingZoom();
});
</script>

<template>
  <main class="marvel-page">
    <header class="archive-header">
      <div class="archive-meta">
        <span>TVA · Карта временных ветвей <span class="meta-slash">/</span> 001</span
        ><span>Архив мультивселенной Marvel</span>
      </div>
      <div class="hero-content">
        <div class="hero-title">
          <span class="marvel-stamp">MARVEL / TEMPORAL TREE</span>
          <h1>Древо<br /><span>мультивселенной.</span></h1>
          <p class="hero-lede">
            Основная реальность проходит сквозь центр. Каждая дуга — отдельная вселенная, история
            или линия вне времени. Тонкие перемычки показывают подтверждённые сюжетные встречи.
          </p>
          <div class="archive-stats">
            <span
              ><b>{{ projects.length }}</b> проектов</span
            ><span
              ><b>{{ lanes.length - 1 }}</b> самостоятельных ветвей</span
            ><span class="archive-status"><i></i> Древо доступно</span>
          </div>
        </div>
        <figure class="temporal-tree" aria-hidden="true">
          <svg viewBox="0 0 620 390" preserveAspectRatio="xMidYMid meet">
            <g class="tree-aura">
              <circle cx="318" cy="194" r="162" />
              <circle cx="318" cy="194" r="116" />
            </g>
            <g class="tree-limbs tree-limbs--halo">
              <path d="M316 378 C307 320 328 286 315 228 C306 182 318 128 313 18" />
              <path d="M315 286 C257 272 221 238 178 192 C138 150 93 136 28 124" />
              <path d="M311 250 C250 221 224 176 190 112 C166 68 123 48 74 28" />
              <path d="M314 218 C251 200 205 200 139 208 C91 214 59 240 16 274" />
              <path d="M316 288 C374 270 402 234 438 184 C470 140 518 122 602 110" />
              <path d="M314 246 C376 222 412 175 441 112 C463 66 506 42 566 22" />
              <path d="M317 220 C384 201 429 205 493 222 C538 234 573 261 611 298" />
              <path d="M314 174 C262 145 237 110 222 55 C214 31 195 17 172 7" />
              <path d="M315 160 C366 136 392 99 406 48 C413 23 431 11 452 3" />
            </g>
            <g class="tree-limbs">
              <path d="M316 378 C307 320 328 286 315 228 C306 182 318 128 313 18" />
              <path d="M315 286 C257 272 221 238 178 192 C138 150 93 136 28 124" />
              <path d="M311 250 C250 221 224 176 190 112 C166 68 123 48 74 28" />
              <path d="M314 218 C251 200 205 200 139 208 C91 214 59 240 16 274" />
              <path d="M316 288 C374 270 402 234 438 184 C470 140 518 122 602 110" />
              <path d="M314 246 C376 222 412 175 441 112 C463 66 506 42 566 22" />
              <path d="M317 220 C384 201 429 205 493 222 C538 234 573 261 611 298" />
              <path d="M314 174 C262 145 237 110 222 55 C214 31 195 17 172 7" />
              <path d="M315 160 C366 136 392 99 406 48 C413 23 431 11 452 3" />
            </g>
            <g class="tree-nodes">
              <circle cx="315" cy="286" r="7" />
              <circle cx="314" cy="218" r="6" />
              <circle cx="316" cy="288" r="7" />
              <circle cx="315" cy="160" r="5" />
            </g>
          </svg>
          <figcaption>
            <span>Священная линия</span><b>Земля-616</b><span>Временные ответвления</span>
          </figcaption>
        </figure>
      </div>
    </header>
    <section class="atlas" aria-label="Карта экранных историй Marvel">
      <div class="atlas-toolbar">
        <div class="format-filters" role="group" aria-label="Тип проекта">
          <button
            v-for="item in formats"
            :key="item.id"
            type="button"
            :aria-pressed="format === item.id"
            @click="format = item.id"
          >
            {{ item.label }}
          </button>
        </div>
        <div class="toolbar-right">
          <label class="search-box"
            ><span class="material-symbols-outlined" aria-hidden="true">search</span
            ><span class="visually-hidden">Найти проект или ветку</span
            ><input v-model="query" type="search" placeholder="Найти проект или ветку"
          /></label>
          <div class="view-toggle" role="group" aria-label="Отображение">
            <button
              type="button"
              :aria-pressed="view === 'map'"
              aria-label="Показать карту"
              title="Карта"
              @click="view = 'map'"
            >
              <span class="material-symbols-outlined" aria-hidden="true">account_tree</span></button
            ><button
              type="button"
              :aria-pressed="view === 'list'"
              aria-label="Показать список"
              title="Список"
              @click="view = 'list'"
            >
              <span class="material-symbols-outlined" aria-hidden="true">view_list</span>
            </button>
          </div>
        </div>
      </div>
      <div class="atlas-navigation">
        <nav class="chapters" aria-label="Эпохи основной линии">
          <button
            v-for="(chapter, index) in chapters"
            :key="chapter.id"
            type="button"
            :class="{ 'is-current': chapterIndex === index }"
            :title="chapter.years"
            @click="goToProject(chapter.id)"
          >
            <span>0{{ index + 1 }}</span
            >{{ chapter.title }}
          </button>
        </nav>
        <label class="branch-toggle"
          ><input v-model="branches" type="checkbox" /> Ответвления</label
        >
      </div>
      <div class="map-heading">
        <div>
          <span class="route-key"></span><strong>{{ laneById.get(activeLane)?.title }}</strong
          ><span class="map-heading__note">{{
            activeLane === "mcu" ? "Сюжетная хронология" : laneById.get(activeLane)?.order
          }}</span>
        </div>
        <span class="result-count" role="status"
          >Показано {{ filtered.length }} / {{ projects.length }}</span
        >
      </div>
      <div v-if="!filtered.length" class="empty-state">
        <span class="material-symbols-outlined" aria-hidden="true">search_off</span>
        <h2>Такой истории пока нет</h2>
        <p>По запросу «{{ query }}» с выбранными фильтрами ничего не найдено.</p>
        <button type="button" @click="resetMap">Сбросить фильтры</button>
      </div>
      <template v-else-if="view === 'map'">
        <div class="map-frame">
          <div
            ref="viewport"
            class="map-viewport"
            :class="{ 'is-dragging': drag.active && drag.moved }"
            tabindex="0"
            role="region"
            aria-label="Карта Marvel. Стрелки перемещают карту, Home возвращает к началу, Ctrl и колесо изменяют масштаб. Можно переключиться на список."
            @scroll.passive="syncScroll"
            @pointerdown="startDrag"
            @pointermove="dragMap"
            @pointerup="stopDrag"
            @pointercancel="stopDrag"
            @lostpointercapture="drag.active = false"
            @pointerleave="!drag.moved && stopDrag()"
            @keydown="keyboardMap"
            @wheel="zoomMap"
          >
            <div
              class="map-space"
              :style="{
                width: `${geometry.width * zoom}px`,
                height: `${geometry.height * zoom}px`,
              }"
            >
              <div
                class="map-canvas"
                :class="{ 'map-canvas--lane-focus': expandedLane !== null }"
                :style="{
                  width: `${geometry.width}px`,
                  height: `${geometry.height}px`,
                  transform: `scale(${zoom})`,
                }"
              >
                <svg
                  class="map-lines"
                  :width="geometry.width"
                  :height="geometry.height"
                  aria-hidden="true"
                >
                  <g v-if="shownLanes.some((lane) => lane.kind === 'main')" class="timeline-trunk">
                    <path
                      :d="strandPath(42, geometry.width - 58, geometry.mainY, 0, 0)"
                      class="timeline-trunk__halo"
                    />
                    <path
                      v-for="(offset, strandIndex) in mainStrandOffsets"
                      :key="offset"
                      :d="strandPath(42, geometry.width - 58, geometry.mainY, offset, strandIndex)"
                      class="timeline-strand timeline-strand--main"
                      :class="{ 'timeline-strand--core': offset === 0 }"
                    />
                    <path
                      v-for="(offset, branchIndex) in futureBranchOffsets"
                      :key="`future-${offset}`"
                      :d="futureBranchPath(offset, branchIndex)"
                      class="future-branch"
                    />
                  </g>
                  <g
                    v-for="link in shownConnections"
                    :key="link.id"
                    class="connection-group"
                    :class="{
                      'connection-group--active':
                        highlighted === link.source ||
                        highlighted === link.target ||
                        isLaneLink(link),
                    }"
                  >
                    <path :d="connectionBranchPath(link, 0, 1)" class="connection-halo" />
                    <path
                      v-for="(offset, fiberIndex) in connectionFiberOffsets"
                      :key="offset"
                      :d="connectionBranchPath(link, offset, fiberIndex)"
                      :stroke="laneById.get(projectById.get(link.source)!.lane)!.color"
                      class="connection"
                      :class="{
                        'connection--core': offset === 0,
                        'connection--disputed': link.confidence === 'disputed',
                        'connection--order': link.relation === 'precedes',
                      }"
                    />
                  </g>
                  <g v-for="project in filtered" :key="project.id">
                    <line
                      v-if="project.lane === 'mcu' || connectedIds.has(project.id)"
                      :x1="point(project).x"
                      :x2="point(project).x"
                      :y1="
                        point(project).y +
                        (project.lane === 'mcu' && project.slot % 2 !== 0
                          ? 24
                          : project.lane === 'mcu'
                            ? -24
                            : 0)
                      "
                      :y2="
                        project.lane === 'mcu' && project.slot % 2 !== 0
                          ? nodeTop(project)
                          : nodeTop(project) + nodeSize(project).height
                      "
                      :stroke="laneById.get(project.lane)!.color"
                      class="node-tether"
                    />
                    <circle
                      v-if="project.lane === 'mcu' || connectedIds.has(project.id)"
                      :cx="point(project).x"
                      :cy="point(project).y"
                      :r="project.major ? 9 : 6"
                      :fill="project.lane === 'mcu' ? '#100b06' : 'var(--canvas)'"
                      :stroke="
                        project.lane === 'mcu'
                          ? 'var(--red)'
                          : laneById.get(project.lane)!.color
                      "
                      class="timeline-junction"
                      :class="{ 'timeline-junction--major': project.major }"
                    />
                    <circle
                      v-if="
                        project.major && (project.lane === 'mcu' || connectedIds.has(project.id))
                      "
                      :cx="point(project).x"
                      :cy="point(project).y"
                      r="3"
                      fill="#fff3b0"
                      class="timeline-junction__core"
                    />
                    <text
                      v-if="project.lane === 'mcu'"
                      :x="point(project).x + 17"
                      :y="point(project).y + 4"
                      class="axis-year"
                    >
                      {{ project.story }}
                    </text>
                  </g>
                </svg>
                <button
                  v-for="lane in shownLanes.filter((item) => item.kind !== 'main')"
                  :key="lane.id"
                  type="button"
                  class="lane-label"
                  :class="{ 'lane-label--expanded': expandedLane === lane.id }"
                  :style="{
                    left: `${laneBounds(lane.id).start}px`,
                    top: `${lane.y + 8}px`,
                    '--lane-color': lane.color,
                  }"
                  :aria-label="`Перейти к ветке: ${lane.title}`"
                  @click="goToUniverse(lane.id)"
                  @pointerenter="expandLane(lane.id)"
                  @pointerleave="collapseLane()"
                  @focus="expandLane(lane.id)"
                  @blur="collapseLane()"
                >
                  <em>{{ laneKindLabels[lane.kind] }} · {{ laneProjectCount(lane.id) }}</em>
                  <span>{{ lane.title }}</span>
                  <small>{{ lane.universe }}</small>
                </button>
                <div
                  v-for="(chapter, index) in chapters"
                  v-show="!normalizedQuery"
                  :key="chapter.id"
                  class="epoch-label"
                  :style="{
                    left: `${point(projectById.get(chapter.id)!).x - 104}px`,
                    top: `${geometry.mainY - 264}px`,
                  }"
                >
                  <span>0{{ index + 1 }}</span
                  >{{ chapter.title }}<small>{{ chapter.years }}</small>
                </div>
                <div
                  v-for="zone in laneZones"
                  :key="`zone-${zone.id}`"
                  class="lane-zone"
                  aria-hidden="true"
                  :style="{
                    left: `${zone.left}px`,
                    top: `${zone.top}px`,
                    width: `${zone.width}px`,
                    height: `${zone.height}px`,
                  }"
                  @pointerenter="expandLane(zone.id)"
                  @pointerleave="collapseLane()"
                />
                <button
                  v-for="project in filtered"
                  :key="project.id"
                  type="button"
                  class="project-node"
                  :class="{
                    'project-node--main': project.lane === 'mcu',
                    'project-node--major': project.major,
                    'project-node--compact': project.media === 'special',
                    'project-node--wide': project.major && project.media !== 'special',
                    'is-related': relatedIds.has(project.id),
                    'is-highlighted': highlighted === project.id,
                    'is-lane-expanded': expandedLane === project.lane,
                  }"
                  :style="{
                    left: `${point(project).x - nodeSize(project).width / 2}px`,
                    top: `${nodeTop(project)}px`,
                    '--lane-color': laneById.get(project.lane)!.color,
                  }"
                  :aria-label="`${project.title}. ${mediaLabels[project.media]}, ${project.releaseYear}. Открыть сведения и связи`"
                  @click="openProject(project, $event)"
                  @keydown.enter="drag.moved = false"
                  @keydown.space="drag.moved = false"
                  @pointerenter="
                    highlighted = project.id;
                    activeLane = project.lane;
                    expandedLane = project.lane;
                  "
                  @pointerleave="
                    highlighted = null;
                    expandedLane = null;
                  "
                  @focus="
                    highlighted = project.id;
                    activeLane = project.lane;
                    expandedLane = project.lane;
                  "
                  @blur="
                    highlighted = null;
                    expandedLane = null;
                  "
                >
                  <div class="node-topline">
                    <span
                      >{{ mediaLabels[project.media] }}
                      <span class="node-release">/ {{ project.releaseYear }}</span></span
                    ><span class="node-arrow" aria-hidden="true">↗</span>
                  </div>
                  <div class="node-content">
                    <img
                      v-if="project.poster && !failedPosters.has(project.id)"
                      :src="`https://image.tmdb.org/t/p/w185/${project.poster}`"
                      alt=""
                      loading="lazy"
                      decoding="async"
                      draggable="false"
                      @error="failPoster(project.id)"
                    /><span
                      v-else
                      class="node-symbol material-symbols-outlined"
                      aria-hidden="true"
                      >{{
                        project.media === "series"
                          ? "live_tv"
                          : project.media === "animation"
                            ? "animation"
                            : project.major
                              ? "stars"
                              : "movie"
                      }}</span
                    ><strong>{{ project.title }}</strong>
                  </div>
                  <div class="node-bottom">
                    <span>{{
                      project.lane === "mcu"
                        ? String(project.slot + 1).padStart(2, "0") + " / MCU"
                        : project.story
                    }}</span
                    ><span v-if="project.major" class="node-landmark">Ключевой</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
          <div class="map-tools">
            <label
              ><span class="visually-hidden">Перейти к ветке</span
              ><select v-model="activeLane" @change="goToUniverse(activeLane)">
                <option v-for="lane in lanes" :key="lane.id" :value="lane.id">
                  {{ lane.title }}
                </option>
              </select></label
            >
            <div class="zoom-controls">
              <button
                type="button"
                aria-label="Уменьшить масштаб"
                :disabled="zoom <= zoomLimits.min"
                @click="changeZoom(-zoomLimits.step)"
              >
                −</button
              ><output aria-label="Масштаб">{{ Math.round(zoom * 100) }}%</output
              ><button
                type="button"
                aria-label="Увеличить масштаб"
                :disabled="zoom >= zoomLimits.max"
                @click="changeZoom(zoomLimits.step)"
              >
                +</button
              ><button
                type="button"
                aria-label="Вернуться к началу карты"
                title="К началу"
                @click="resetMap"
              >
                <span class="material-symbols-outlined" aria-hidden="true">restart_alt</span>
              </button>
            </div>
          </div>
          <div class="map-hint" aria-hidden="true">
            <span class="material-symbols-outlined">open_with</span> Перетаскивайте карту · Ctrl +
            колесо меняет масштаб
          </div>
        </div>
        <div class="overview-row">
          <div class="overview-label">
            <span>Крона целиком</span><small>Рамка — видимая область</small>
          </div>
          <svg
            class="overview"
            :viewBox="`0 0 ${geometry.width} ${geometry.height}`"
            preserveAspectRatio="none"
            role="img"
            aria-label="Обзор древа реальностей. Текущая область выделена рамкой."
            @click="overviewNavigate"
          >
            <path
              v-if="shownLanes.some((lane) => lane.kind === 'main')"
              :d="strandPath(42, geometry.width - 58, geometry.mainY, 0, 0)"
              stroke="var(--red)"
              class="overview-trunk"
            />
            <path
              v-for="link in shownConnections"
              :key="link.id"
              :d="connectionBranchPath(link, 0, 1)"
              :stroke="laneById.get(projectById.get(link.source)!.lane)!.color"
              class="overview-limb"
            />
            <rect
              :x="scroll.x / zoom"
              :y="scroll.y / zoom"
              :width="scroll.width / zoom"
              :height="scroll.height / zoom"
              fill="var(--accent-wash)"
              stroke="var(--red)"
              stroke-width="2"
              vector-effect="non-scaling-stroke"
            /></svg
          ><span class="overview-end">Выберите ветвь<br />ниже ↘</span>
        </div>
      </template>
      <div v-else class="project-list">
        <section
          v-for="lane in shownLanes"
          :key="lane.id"
          class="list-lane"
          :style="{ '--lane-color': lane.color }"
        >
          <header>
            <h2>{{ lane.title }}</h2>
            <p>{{ lane.order }}</p>
          </header>
          <div class="list-grid">
            <button
              v-for="project in filtered.filter((item) => item.lane === lane.id)"
              :id="`list-${project.id}`"
              :key="project.id"
              type="button"
              @click="
                drag.moved = false;
                openProject(project, $event);
              "
            >
              <span>{{ mediaLabels[project.media] }} · {{ project.releaseYear }}</span
              ><strong>{{ project.title }}</strong
              ><small>{{ project.story }} <span aria-hidden="true">↗</span></small>
            </button>
          </div>
        </section>
      </div>
      <footer class="map-legend">
        <span><i class="legend-spine"></i> Ствол · подтверждённый порядок MCU</span
        ><span><i class="legend-branch"></i> Связанные проекты</span
        ><span><i class="legend-order"></i> Хронологический переход между ветками</span
        ><span><i class="legend-dotted"></i> Спорная / неподтверждённая связь</span
        ><span><i class="legend-node"></i> Без линии · связь не установлена</span>
      </footer>
    </section>
    <section class="reality-directory" aria-labelledby="reality-directory-title">
      <header>
        <div>
          <span>TVA / BRANCH INDEX</span>
          <h2 id="reality-directory-title">Вселенные на древе</h2>
        </div>
        <p>
          Проекты сгруппированы по реальностям, но линия между ними появляется только при наличии
          сюжетной связи. Одинаковая вселенная или соседство на карте сами по себе ничего не
          связывают.
        </p>
      </header>
      <div class="reality-grid">
        <button
          v-for="(lane, index) in lanes"
          :key="lane.id"
          type="button"
          :class="{ 'is-active': activeLane === lane.id }"
          :style="{ '--lane-color': lane.color }"
          @click="goToUniverse(lane.id)"
        >
          <span class="reality-index">{{ String(index + 1).padStart(2, "0") }}</span>
          <i aria-hidden="true"></i>
          <span class="reality-copy">
            <strong>{{ lane.title }}</strong>
            <small>{{ lane.universe }}</small>
          </span>
          <span class="reality-count">{{ laneProjectCount(lane.id) }}</span>
          <span class="reality-arrow" aria-hidden="true">↗</span>
        </button>
      </div>
    </section>
    <footer class="archive-footer">
      <div>
        <span class="footer-index">001 / TVA ARCHIVE</span>
        <p>
          Не просто порядок просмотра.<br /><strong>Древо историй, собранное в одну карту.</strong>
        </p>
      </div>
      <details>
        <summary>Как читать карту и откуда данные <span aria-hidden="true">↗</span></summary>
        <div class="methodology">
          <p>
            Центральный светящийся ствол — подтверждённый сюжетный порядок фильмов Marvel / Disney+.
            Остальные ветви строятся только по добавленным смысловым связям. Если между карточками
            нет линии, связь в источниках не установлена.
          </p>
          <p>
            Ветки не образуют общую календарную шкалу. У Fox и Sony показан порядок выхода; сезоны
            Защитников сгруппированы, год на их карточке — год премьеры первого сезона. Знак ≈
            означает приблизительную дату. Если дата не установлена, указан относительный период.
            Карта не претендует на полный каталог всех экранизаций Marvel.
          </p>
          <p>
            Тонкие дуги между проектами — смысловые связи с типом, степенью уверенности и
            первоисточником. Пунктир означает спорную или неподтверждённую связь. Связи, помеченные
            курсивом, читаются в обе стороны: например, «Финал» → «Локи» и встречный переход TVA к
            «Финалу». Сюжетные объяснения скрыты до включения спойлеров.
          </p>
          <div class="source-list">
            <a
              v-for="source in primarySources"
              :key="source.title"
              :href="source.url"
              target="_blank"
              rel="noopener noreferrer"
              >{{ source.title }} ↗</a
            >
          </div>
          <small
            >Источники проверены {{ verifiedLabel }}. Точные даты релизов и внутримировые периоды
            указаны отдельно; анонсированные проекты не получают подтверждённую дату.</small
          >
        </div>
      </details>
    </footer>
    <dialog
      ref="dialog"
      class="project-dialog"
      aria-labelledby="project-dialog-title"
      @close="onDialogClose"
      @click="
        (event) => {
          if (event.target === dialog) closeProject();
        }
      "
    >
      <article
        v-if="selected && selectedLane"
        class="project-details"
        :style="{ '--lane-color': selectedLane.color }"
      >
        <header class="details-top">
          <span>{{ selectedLane.title }}</span
          ><button
            type="button"
            aria-label="Закрыть сведения о проекте"
            autofocus
            @click="closeProject"
          >
            <span class="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </header>
        <p class="details-kicker">{{ mediaLabels[selected.media] }} / {{ selected.releaseYear }}</p>
        <h2 id="project-dialog-title" tabindex="-1">{{ selected.title }}</h2>
        <dl class="project-facts">
          <div>
            <dt>Время событий</dt>
            <dd>{{ selected.story }}</dd>
          </div>
          <div>
            <dt>Реальность / контекст</dt>
            <dd>{{ selectedLane.universe }}</dd>
          </div>
          <div>
            <dt>Точность даты</dt>
            <dd>{{ confidenceLabels[selected.dateConfidence] }}</dd>
          </div>
          <div>
            <dt>Порядок на дорожке</dt>
            <dd>{{ selectedLane.order }}</dd>
          </div>
        </dl>
        <label class="spoiler-toggle"
          ><input v-model="spoilers" type="checkbox" /> Показать сюжетные подробности и объяснения
          связей</label
        >
        <template v-if="spoilers"
          ><p class="project-description">{{ selected.description }}</p>
          <section v-if="selectedEvents.length" class="event-details">
            <h3>Ключевые события</h3>
            <article v-for="event in selectedEvents" :key="event.id">
              <h4>{{ event.title }}</h4>
              <p>{{ event.description }}</p>
              <small>Источник: {{ event.evidence.title }}</small>
            </article>
          </section></template
        >
        <section class="connection-details">
          <h3>
            Связи <span>{{ selectedConnections.length }}</span>
          </h3>
          <p v-if="!selectedConnections.length" class="no-connections">
            Подтверждённые переходы к другим проектам пока не добавлены. Соседство на дорожке само
            по себе не означает сюжетную связь.
          </p>
          <article
            v-for="link in selectedConnections"
            :key="link.id"
            :class="{ 'connection--italic': link.italic }"
          >
            <button
              type="button"
              @click="selectRelated(link.source === selectedId ? link.target : link.source)"
            >
              <span class="connection-direction">{{
                link.source === selectedId ? "Куда ведёт" : "Откуда приходит"
              }}</span
              ><strong
                >{{
                  projectById.get(link.source === selectedId ? link.target : link.source)?.title
                }}
                <span aria-hidden="true">↗</span></strong
              >
            </button>
            <div class="connection-meta">
              <span :class="{ 'is-disputed': link.confidence === 'disputed' }">{{
                confidenceLabels[link.confidence]
              }}</span
              ><code>{{ relationLabels[link.relation] }}</code>
            </div>
            <template v-if="spoilers"
              ><p>{{ link.label }}</p>
              <details>
                <summary>Доказательство и источник</summary>
                <p>{{ link.evidence.note }}</p>
                <small>{{ link.evidence.title }} · первоисточник</small>
              </details></template
            >
          </article>
        </section>
        <button class="reveal-project" type="button" @click="revealSelected">
          Показать на карте <span aria-hidden="true">↗</span>
        </button>
        <footer class="details-source">
          <span>Источники проекта</span>
          <div v-for="source in selected.evidence" :key="source.title">
            <a v-if="source.url" :href="source.url" target="_blank" rel="noopener noreferrer"
              >{{ source.title }} ↗</a
            >
            <strong v-else>{{ source.title }} · первоисточник</strong>
            <small>{{ source.note }}</small>
          </div>
        </footer>
      </article>
    </dialog>
  </main>
</template>

<style scoped>
.marvel-page {
  --paper: #100e0e;
  --ink: #f4eee8;
  --text: #f4eee8;
  --muted: #b9ada3;
  --text-dim: #d2c5ba;
  --red: #f4434d;
  --warm: #e3b36a;
  --positive: #9bc675;
  --rule: #3a302c;
  --line-strong: #5a4941;
  --surface: #191514;
  --surface-raised: #211b19;
  --surface-hover: #302521;
  --main-lane: #2c2421;
  --canvas: #151211;
  --accent-wash: #f4434d26;
  color-scheme: dark;
  color: var(--ink);
  background: linear-gradient(180deg, #171111 0, #100e0e 340px, #0d0c0c 100%);
  margin-inline: calc(50% - 50vw);
  padding: 35px clamp(20px, 4.7vw, 80px) 32px;
}
.marvel-page button {
  cursor: pointer;
}
.marvel-page :is(button, input, select, summary):focus-visible {
  outline: 2px solid var(--red);
  outline-offset: 4px;
}
.marvel-page button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.marvel-page .material-symbols-outlined {
  font-size: 20px;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
.archive-meta {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  color: var(--muted);
  font: 10px/1.5 var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}
.archive-meta > span:first-child {
  color: var(--red);
}
.meta-slash {
  padding-inline: 10px;
  color: #b5b1a8;
}
.hero-content {
  display: flex;
  justify-content: space-between;
  gap: 36px;
  align-items: end;
  padding: 29px 0 34px;
}
.hero-title {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 9px;
}
.marvel-stamp {
  background: var(--red);
  color: #fff;
  font:
    900 19px/1 Arial,
    sans-serif;
  letter-spacing: -1.4px;
  padding: 5px 5px 3px;
}
h1 {
  font-size: clamp(40px, 5.25vw, 78px);
  letter-spacing: -0.065em;
  line-height: 1.05;
  margin: 0;
  font-weight: 800;
}
h1 > span {
  color: var(--red);
}
.hero-aside {
  max-width: 400px;
  padding-bottom: 3px;
}
.hero-aside p {
  font-size: 13px;
  line-height: 1.75;
  margin: 0 0 16px;
  color: #56574f;
}
.archive-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 22px;
  color: var(--muted);
  font: 10px/1.5 var(--font-mono);
}
.archive-stats b {
  font-size: 14px;
  color: var(--ink);
}
.archive-status {
  display: flex;
  align-items: center;
  gap: 6px;
}
.archive-status i {
  width: 5px;
  height: 5px;
  border-radius: 0;
  background: #537849;
}
.atlas {
  border-block: 1px solid var(--ink);
}
.atlas-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
  padding-block: 14px;
}
.format-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.format-filters button {
  min-height: 38px;
  padding: 8px 12px;
  background: transparent;
  border: 1px solid transparent;
  color: #5b5c55;
  font-size: 12px;
  font-weight: 600;
  border-radius: 0;
}
.format-filters button[aria-pressed="true"] {
  background: var(--ink);
  color: var(--paper);
}
.toolbar-right {
  display: flex;
  gap: 16px;
  align-items: center;
}
.search-box {
  display: flex;
  align-items: center;
  gap: 7px;
  border-bottom: 1px solid #bbb9b0;
  min-width: 0;
}
.search-box .material-symbols-outlined {
  color: #76786e;
  font-size: 18px;
}
.search-box input {
  width: 180px;
  min-height: 38px;
  border: 0;
  background: transparent;
  font-size: 12px;
  color: var(--ink);
}
.search-box input::placeholder {
  color: #77786f;
}
.view-toggle {
  display: flex;
  border: 1px solid var(--rule);
  padding: 3px;
  border-radius: 0;
}
.view-toggle button {
  display: grid;
  place-items: center;
  width: 34px;
  height: 32px;
  border: 0;
  background: transparent;
  color: #75766c;
  border-radius: 0;
}
.view-toggle button[aria-pressed="true"] {
  background: #e4e1d9;
  color: var(--ink);
}
.atlas-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  border-block: 1px solid var(--rule);
}
.chapters {
  display: flex;
  flex-wrap: wrap;
  column-gap: 22px;
}
.chapters button {
  display: flex;
  gap: 7px;
  align-items: center;
  min-height: 45px;
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
  color: #68695f;
  padding: 0;
  font-size: 11px;
}
.chapters button > span {
  font: 9px var(--font-mono);
  color: #8c8b81;
}
.chapters button.is-current {
  color: var(--red);
  border-bottom-color: var(--red);
}
.chapters button.is-current > span {
  color: var(--red);
}
.branch-toggle {
  display: flex;
  gap: 7px;
  align-items: center;
  font-size: 11px;
  white-space: nowrap;
  min-height: 44px;
}
input[type="checkbox"] {
  accent-color: var(--red);
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}
.map-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 47px;
  font-size: 11px;
}
.map-heading > div {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
}
.map-heading strong {
  font-size: 11px;
  white-space: nowrap;
}
.map-heading__note {
  color: var(--muted);
  font-size: 10px;
}
.route-key {
  width: 20px;
  height: 5px;
  background: var(--red);
}
.result-count {
  color: var(--muted);
  white-space: nowrap;
  font: 10px var(--font-mono);
}
.map-frame {
  position: relative;
  border: 1px solid var(--rule);
}
.map-viewport {
  height: 620px;
  overflow: auto;
  overscroll-behavior: contain;
  cursor: grab;
  scrollbar-width: thin;
  scrollbar-color: #9d9e90 #e9e6dc;
  background-color: #f8f6f0;
  background-image: radial-gradient(#b6b4aa80 0.7px, transparent 0.7px);
  background-size: 20px 20px;
}
.map-viewport.is-dragging {
  cursor: grabbing;
  user-select: none;
}
.map-viewport.is-dragging .project-node {
  cursor: grabbing;
}
.map-space {
  position: relative;
  overflow: hidden;
}
.map-canvas {
  position: relative;
  transform-origin: 0 0;
}
.map-lines {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.connection {
  fill: none;
  stroke-width: 2;
  opacity: 0.24;
}
.connection--active {
  stroke-width: 4;
  opacity: 1;
}
.axis-year {
  fill: #ecebe3;
  font: 9px var(--font-mono);
}
.project-node {
  position: absolute;
  display: flex;
  flex-direction: column;
  width: 208px;
  height: 140px;
  padding: 12px;
  text-align: start;
  background: #f8f6f0;
  border: 1px solid #cfcec5;
  border-top: 2px solid var(--lane-color);
  border-radius: 0;
  color: var(--ink);
  z-index: 2;
}
.project-node--main {
  background: #fffefa;
}
.project-node--major {
  border-color: #baaaa1;
  border-top: 3px solid var(--red);
  box-shadow: 3px 3px 0 #dbd6ca;
}
.node-topline {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  color: var(--lane-color);
  font: 9px/1.4 var(--font-mono);
  text-transform: uppercase;
}
.node-release {
  color: #78796d;
}
.node-arrow {
  font-size: 14px;
  line-height: 12px;
  color: #8d8b7f;
}
.node-content {
  display: flex;
  align-items: center;
  flex: 1;
  min-height: 0;
  gap: 10px;
  padding-block: 8px;
}
.node-content img {
  width: 38px;
  height: 54px;
  object-fit: cover;
  flex-shrink: 0;
  border-radius: 0;
  outline: 1px solid #0000001a;
}
.node-content strong {
  font-size: 13px;
  letter-spacing: -0.025em;
  line-height: 1.3;
  text-wrap: pretty;
}
.node-symbol {
  display: grid;
  place-items: center;
  width: 29px;
  height: 38px;
  color: var(--lane-color);
  flex-shrink: 0;
}
.node-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 5px;
  border-top: 1px solid #e8e5dc;
  padding-top: 7px;
  color: #77786d;
  font: 8px/1.3 var(--font-mono);
}
.node-landmark {
  color: var(--red);
}
.project-node.is-related,
.project-node.is-highlighted {
  border-color: var(--lane-color);
  background: #fffefa;
  box-shadow: 3px 3px 0 color-mix(in srgb, var(--lane-color) 25%, transparent);
  z-index: 3;
}
.lane-label {
  position: absolute;
  display: flex;
  flex-direction: column;
  color: var(--lane-color);
  border-inline-start: 3px solid var(--lane-color);
  padding-inline-start: 9px;
  max-width: 500px;
  pointer-events: none;
}
.lane-label > span {
  font-size: 13px;
  font-weight: 700;
}
.lane-label small {
  font: 9px/1.8 var(--font-mono);
  color: #7c7d70;
}
.epoch-label {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 12px;
  font-weight: 600;
  color: #484b41;
  white-space: nowrap;
  pointer-events: none;
}
.epoch-label > span {
  font: 10px var(--font-mono);
  color: var(--red);
  border: 1px solid #d1bdb0;
  padding: 4px 6px;
}
.epoch-label > small {
  font: 9px var(--font-mono);
  color: #8a8b7d;
}
.map-tools {
  position: absolute;
  z-index: 5;
  inset-inline: 14px;
  top: 14px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  pointer-events: none;
}
.map-tools > * {
  pointer-events: auto;
}
.map-tools select {
  max-width: 240px;
  min-height: 38px;
  border: 1px solid #cfcfc3;
  border-radius: 0;
  padding: 8px 26px 8px 10px;
  font-size: 11px;
  background: #fffefa;
  color: var(--ink);
  box-shadow: 0 2px 6px #20211f08;
}
.zoom-controls {
  display: flex;
  align-items: center;
  background: #fffefa;
  border: 1px solid #cfcfc3;
  border-radius: 0;
  box-shadow: 0 2px 6px #20211f08;
}
.zoom-controls button {
  min-width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  font-size: 19px;
  padding: 0;
  background: transparent;
  border: 0;
  color: var(--ink);
}
.zoom-controls output {
  min-width: 44px;
  text-align: center;
  font: 10px var(--font-mono);
}
.zoom-controls button:last-child {
  border-inline-start: 1px solid #e2e1d7;
}
.map-hint {
  position: absolute;
  bottom: 18px;
  left: 18px;
  display: flex;
  align-items: center;
  gap: 6px;
  font: 9px var(--font-mono);
  color: #727466;
  background: #f8f6f0ec;
  padding: 6px 8px;
  border-radius: 0;
  pointer-events: none;
}
.map-hint .material-symbols-outlined {
  font-size: 14px;
}
.overview-row {
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 16px 0;
}
.overview {
  flex: 1;
  width: 0;
  height: 62px;
  cursor: crosshair;
  border-inline: 1px solid var(--rule);
}
.overview-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font: 10px var(--font-mono);
}
.overview-label small {
  color: #828276;
  font-size: 9px;
}
.overview-end {
  color: #828276;
  font: 9px/1.7 var(--font-mono);
}
.map-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 22px;
  border-top: 1px solid var(--rule);
  padding-block: 13px;
  color: #696b60;
  font-size: 10px;
}
.map-legend > span {
  display: flex;
  align-items: center;
  gap: 7px;
}
.map-legend i {
  display: inline-block;
  width: 19px;
}
.legend-spine {
  height: 5px;
  background: #252720;
}
.legend-branch {
  border-top: 2px solid #406a8b;
}
.legend-dotted {
  border-top: 2px dotted #767864;
}
.legend-note {
  margin-inline-start: auto;
}
.archive-footer {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 24px;
  padding-block: 26px 5px;
}
.footer-index {
  font: 9px var(--font-mono);
  color: var(--red);
  letter-spacing: 0.08em;
}
.archive-footer p {
  font-size: 11px;
  line-height: 1.7;
  color: #7a7a6d;
  margin: 8px 0 0;
}
.archive-footer p strong {
  font-weight: 400;
  color: #494c40;
}
.archive-footer > details {
  width: min(100%, 480px);
  padding-block: 5px;
}
.archive-footer summary {
  font-size: 11px;
  cursor: pointer;
  text-align: end;
}
.archive-footer summary > span {
  margin-inline-start: 9px;
  color: var(--red);
}
.methodology {
  padding-top: 8px;
}
.methodology a {
  display: block;
  text-decoration: underline;
  font-size: 11px;
  margin-top: 14px;
}
.methodology small {
  display: block;
  font-size: 10px;
  color: #7a7a6d;
  margin-top: 8px;
}
.empty-state {
  text-align: center;
  padding: 80px 20px;
}
.empty-state .material-symbols-outlined {
  font-size: 34px;
  color: var(--red);
}
.empty-state h2 {
  font-size: 23px;
  margin-bottom: 6px;
}
.empty-state p {
  color: var(--muted);
  font-size: 14px;
}
.empty-state button {
  color: #fff;
  background: var(--ink);
  padding: 10px 16px;
  border: 0;
  border-radius: 0;
}
.project-list {
  padding: 16px 0 30px;
}
.list-lane + .list-lane {
  margin-top: 36px;
}
.list-lane header {
  border-inline-start: 3px solid var(--lane-color);
  padding-inline-start: 12px;
  margin-bottom: 16px;
}
.list-lane h2 {
  font-size: 18px;
  margin: 0;
}
.list-lane p {
  color: var(--muted);
  font-size: 11px;
  margin: 3px 0 0;
}
.list-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(215px, 1fr));
  gap: 12px;
}
.list-grid button {
  display: flex;
  flex-direction: column;
  align-items: start;
  gap: 10px;
  padding: 16px;
  background: #fffefa;
  color: var(--ink);
  border: 1px solid var(--rule);
  border-top: 2px solid var(--lane-color);
  text-align: start;
  min-height: 135px;
  border-radius: 0;
  scroll-margin-block: 150px;
}
.list-grid button > span {
  font: 10px var(--font-mono);
  color: var(--lane-color);
}
.list-grid strong {
  line-height: 1.4;
  font-size: 14px;
}
.list-grid small {
  display: flex;
  justify-content: space-between;
  width: 100%;
  font-size: 11px;
  color: var(--muted);
  margin-top: auto;
  gap: 10px;
}
.project-dialog {
  padding: 0;
  border: 1px solid #b5b2a5;
  border-radius: 0;
  background: var(--paper);
  color: var(--ink);
  width: min(650px, calc(100vw - 32px));
  max-height: calc(100dvh - 48px);
  overflow-y: auto;
  overscroll-behavior: contain;
  box-shadow: 0 30px 100px #0005;
}
.project-dialog::backdrop {
  background: #11140fb3;
  backdrop-filter: blur(4px);
}
.project-details {
  padding: 24px 30px 30px;
}
.details-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  font: 11px var(--font-mono);
  color: var(--lane-color);
}
.details-top button {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--rule);
  border-radius: 0;
  background: transparent;
  color: var(--ink);
}
.details-kicker {
  font: 11px var(--font-mono);
  color: var(--muted);
  margin-top: 24px;
}
.project-details h2 {
  margin: 12px 0 24px;
  font-size: clamp(25px, 3vw, 35px);
  letter-spacing: -0.045em;
  line-height: 1.15;
}
.project-facts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  padding-block: 20px;
  margin: 0;
  border-block: 1px solid var(--rule);
}
.project-facts dt {
  font: 10px var(--font-mono);
  color: var(--muted);
  margin-bottom: 7px;
}
.project-facts dd {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
}
.spoiler-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-block: 24px;
  font-size: 12px;
  min-height: 44px;
  padding: 10px;
  background: #e9e5da;
  border-radius: 0;
}
.project-description {
  font-size: 14px;
  line-height: 1.8;
}
.project-details h3 {
  font-size: 15px;
  margin: 26px 0 16px;
}
.project-details h3 > span {
  font: 11px var(--font-mono);
  color: var(--muted);
  padding-inline-start: 5px;
}
.event-details article {
  border-inline-start: 2px solid var(--red);
  padding-inline-start: 15px;
  margin-bottom: 18px;
}
.event-details h4 {
  font-size: 13px;
  margin: 0 0 6px;
}
.event-details p,
.connection-details p {
  font-size: 12px;
  line-height: 1.8;
  color: #565a4e;
  margin: 8px 0;
}
.event-details small {
  font-size: 10px;
  color: var(--muted);
}
.connection-details > article {
  border: 1px solid var(--rule);
  padding: 14px;
  margin-bottom: 10px;
  background: #faf8f2;
  border-radius: 0;
}
.connection-details article > button {
  display: flex;
  flex-direction: column;
  gap: 7px;
  text-align: start;
  width: 100%;
  background: transparent;
  border: 0;
  padding: 0 0 8px;
  color: var(--ink);
}
.connection-direction {
  font: 9px var(--font-mono);
  color: var(--muted);
}
.connection-details button strong {
  font-size: 13px;
  line-height: 1.5;
}
.connection-details button strong > span {
  color: var(--red);
}
.connection-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font: 9px var(--font-mono);
  color: #527147;
}
.connection-meta code {
  color: #797b6e;
}
.connection-meta .is-disputed {
  color: #ad4825;
}
.connection-details details {
  margin-top: 12px;
  font-size: 11px;
}
.connection-details summary {
  cursor: pointer;
}
.connection-details details small {
  color: var(--muted);
  font-size: 10px;
}
.details-source {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 28px;
  padding-top: 18px;
  border-top: 1px solid var(--rule);
}
.reveal-project {
  display: flex;
  justify-content: space-between;
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  margin-top: 20px;
  border: 0;
  border-radius: 0;
  background: var(--ink);
  color: var(--paper);
  font-size: 12px;
}
.details-source strong {
  display: block;
  font-size: 12px;
  font-weight: 500;
}
.details-source small {
  display: block;
  margin-top: 5px;
}
.details-source > span {
  font: 10px var(--font-mono);
  color: var(--muted);
}
.details-source a {
  font-size: 12px;
  text-decoration: underline;
}
.details-source small {
  font-size: 10px;
  color: var(--muted);
  line-height: 1.6;
}
.meta-slash,
.hero-aside p,
.archive-footer p,
.methodology small,
.event-details p,
.connection-details p {
  color: var(--muted);
}
.archive-status i {
  background: var(--positive);
  box-shadow: none;
}
.atlas {
  border-color: var(--line-strong);
}
.format-filters button,
.chapters button,
.search-box input,
.view-toggle button {
  color: var(--muted);
}
.format-filters button {
  min-height: 40px;
  border-radius: 0;
}
.format-filters button[aria-pressed="true"] {
  background: var(--red);
  color: #fff8f4;
}
.search-box {
  border-bottom-color: var(--line-strong);
}
.search-box .material-symbols-outlined,
.search-box input::placeholder {
  color: var(--muted);
}
.search-box input {
  color: var(--ink);
}
.view-toggle {
  border-color: var(--rule);
  border-radius: 0;
  background: var(--surface);
}
.view-toggle button {
  width: 40px;
  height: 40px;
  border-radius: 0;
}
.view-toggle button[aria-pressed="true"] {
  background: var(--surface-hover);
  color: var(--text);
  box-shadow: inset 0 0 0 1px var(--line-strong);
}
.atlas-navigation {
  border-color: var(--rule);
}
.chapters button {
  color: var(--muted);
}
.chapters button > span,
.map-heading__note,
.result-count,
.archive-footer p strong {
  color: var(--text-dim);
}
.branch-toggle {
  color: var(--text-dim);
}
input[type="checkbox"] {
  accent-color: var(--red);
}
.map-frame {
  overflow: hidden;
  border-color: var(--line-strong);
  border-radius: 0;
  box-shadow: 0 18px 40px #00000042;
}
.map-viewport {
  scrollbar-color: var(--line-strong) var(--canvas);
  background-color: var(--canvas);
  background-image:
    linear-gradient(#f4434d0d 1px, transparent 1px),
    linear-gradient(90deg, #f4434d0d 1px, transparent 1px),
    radial-gradient(#f4eee817 0.7px, transparent 0.7px);
  background-size:
    72px 72px,
    72px 72px,
    20px 20px;
}
.map-viewport::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
.map-viewport::-webkit-scrollbar-track {
  background: var(--canvas);
}
.map-viewport::-webkit-scrollbar-thumb {
  background: var(--line-strong);
  border: 2px solid var(--canvas);
  border-radius: 0;
}
.axis-year {
  fill: var(--text-dim);
}
.project-node {
  background: var(--surface);
  border-color: var(--rule);
  border-radius: 0;
  color: var(--text);
  box-shadow: 0 10px 24px #00000038;
}
.project-node--main {
  background: var(--surface-raised);
}
.project-node--major {
  border-color: color-mix(in srgb, var(--warm) 72%, var(--rule));
  border-top-color: var(--red);
  box-shadow: 0 14px 28px #00000052;
}
.node-release,
.node-arrow,
.node-bottom,
.lane-label small,
.epoch-label,
.epoch-label > small,
.map-hint,
.overview-label small,
.overview-end,
.map-legend,
.details-kicker,
.connection-direction,
.connection-meta code {
  color: var(--muted);
}
.node-bottom {
  border-top-color: var(--rule);
}
.node-content img {
  outline-color: #ffffff1a;
}
.project-node.is-related,
.project-node.is-highlighted {
  background: var(--surface-raised);
  box-shadow: 0 14px 28px #00000052;
}
.epoch-label {
  color: var(--text-dim);
}
.epoch-label > span {
  border-color: color-mix(in srgb, var(--red) 62%, var(--rule));
}
.map-tools select,
.zoom-controls {
  border-color: var(--line-strong);
  background: var(--surface-raised);
  color: var(--text);
  box-shadow: 0 10px 22px #00000042;
}
.map-tools select {
  min-height: 40px;
}
.zoom-controls {
  border-radius: 0;
}
.zoom-controls button {
  min-width: 40px;
  height: 40px;
  color: var(--text);
}
.zoom-controls button:last-child {
  border-inline-start-color: var(--rule);
}
.map-hint {
  color: var(--text-dim);
  background: #171211eb;
  border: 1px solid #4b3831;
  border-radius: 0;
}
.overview {
  border-color: var(--rule);
}
.legend-spine {
  background: var(--text);
}
.legend-branch {
  border-top-color: var(--warm);
}
.legend-dotted {
  border-top-color: var(--muted);
}
.archive-footer > details {
  color: var(--text-dim);
}
.methodology a,
.archive-footer summary > span,
.connection-details button strong > span {
  color: var(--red);
}
.empty-state button,
.reveal-project {
  background: var(--red);
  color: #fff8f4;
}
.list-grid button,
.connection-details > article {
  background: var(--surface);
  border-color: var(--rule);
  color: var(--text);
}
.project-dialog {
  border-color: var(--line-strong);
  background: var(--paper);
  box-shadow: 0 30px 100px #000000a8;
}
.project-dialog::backdrop {
  background: #080606d9;
}
.details-top button {
  border-color: var(--rule);
  color: var(--text);
}
.project-facts {
  border-color: var(--rule);
}
.spoiler-toggle {
  background: var(--surface-hover);
  color: var(--text);
}
.event-details article {
  border-inline-start-color: var(--red);
}
.connection-meta {
  color: var(--positive);
}
.connection-meta .is-disputed {
  color: var(--warm);
}
.details-source {
  border-top-color: var(--rule);
}
.map-tools select,
.empty-state button,
.list-grid button,
.connection-details > article,
.project-dialog,
.details-top button,
.spoiler-toggle,
.reveal-project,
.node-content img,
.map-viewport::-webkit-scrollbar-thumb {
  border-radius: 0;
}
.marvel-page {
  --paper: #0d0b0b;
  --ink: #f5eee8;
  --text: #f5eee8;
  --muted: #b3a69d;
  --text-dim: #d8ccc3;
  --red: #ed1d24;
  --warm: #d9ab4d;
  --positive: #9bc675;
  --rule: #3b302c;
  --line-strong: #5d4942;
  --surface: #161211;
  --surface-raised: #211a18;
  --surface-hover: #302522;
  --main-lane: #251715;
  --canvas: #100d0c;
  --accent-wash: #ed1d2426;
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background: var(--paper);
}
.marvel-page::before,
.marvel-page::after {
  position: absolute;
  z-index: -1;
  content: "";
  pointer-events: none;
}
.marvel-page::before {
  display: none;
}
.marvel-page::after {
  display: none;
}
.marvel-page ::selection {
  color: #181005;
  background: var(--warm);
}
.archive-header {
  position: relative;
  padding-block: 18px 30px;
}
.archive-meta {
  color: var(--muted);
}
.archive-meta > span:first-child {
  color: var(--red);
}
.hero-content {
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(420px, 0.98fr);
  min-height: 470px;
  align-items: center;
  gap: clamp(36px, 6vw, 96px);
  padding-block: 40px 24px;
}
.hero-title {
  align-items: flex-start;
  gap: 18px;
}
.marvel-stamp {
  border: 1px solid var(--red);
  border-radius: 0;
  background: var(--surface-raised);
  color: var(--red);
  box-shadow: none;
  font: 700 10px/1 var(--font-mono);
  letter-spacing: 0.16em;
  padding: 9px 11px;
}
h1 {
  max-width: 800px;
  color: var(--ink);
  font-size: clamp(64px, 7.2vw, 108px);
  line-height: 0.82;
  letter-spacing: -0.075em;
  text-wrap: balance;
  text-shadow: none;
}
h1 > span {
  display: block;
  color: var(--red);
  font-size: 0.63em;
  line-height: 1.02;
  letter-spacing: -0.055em;
}
.hero-lede {
  max-width: 62ch;
  margin: 8px 0 0;
  color: var(--text-dim);
  font-size: clamp(13px, 1.05vw, 16px);
  line-height: 1.65;
  text-wrap: pretty;
}
.archive-stats {
  gap: 14px 24px;
  margin-top: 8px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.archive-stats b {
  color: var(--text);
}
.archive-status i {
  border-radius: 0;
}
.temporal-tree {
  position: relative;
  width: min(100%, 620px);
  margin: 0;
}
.temporal-tree::before {
  display: none;
}
.temporal-tree svg {
  display: block;
  width: 100%;
  overflow: visible;
}
.tree-aura {
  fill: none;
  stroke: #ed1d2426;
  stroke-width: 1;
}
.tree-limbs {
  fill: none;
  stroke: var(--red);
  stroke-linecap: square;
  stroke-linejoin: miter;
  stroke-width: 1.5;
}
.tree-limbs path:first-child {
  stroke-width: 5;
}
.tree-limbs--halo {
  display: none;
}
.tree-limbs--halo path:first-child {
  stroke-width: 26;
}
.tree-nodes {
  fill: var(--paper);
  stroke: var(--red);
  stroke-width: 2;
}
.temporal-tree figcaption {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 16px;
  align-items: center;
  border-top: 1px solid var(--rule);
  padding-top: 11px;
  color: var(--muted);
  font: 9px/1.4 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.temporal-tree figcaption b {
  color: var(--text);
  font-weight: 500;
}
.temporal-tree figcaption span:last-child {
  text-align: end;
}
.atlas {
  position: relative;
  border-color: var(--line-strong);
  background: transparent;
}
.atlas::before {
  display: none;
}
.atlas-toolbar {
  min-height: 70px;
}
.format-filters button,
.view-toggle,
.view-toggle button,
.map-tools select,
.zoom-controls,
.zoom-controls button,
.empty-state button,
.list-grid button,
.project-dialog,
.details-top button,
.spoiler-toggle,
.reveal-project {
  border-radius: 0;
}
.format-filters button[aria-pressed="true"] {
  background: var(--red);
  color: #fff8f4;
}
.search-box {
  border-bottom-color: var(--line-strong);
}
.view-toggle {
  background: var(--surface);
}
.view-toggle button[aria-pressed="true"] {
  background: var(--surface-hover);
  color: var(--text);
  box-shadow: none;
}
.chapters button.is-current,
.chapters button.is-current > span {
  color: var(--red);
  border-bottom-color: var(--red);
}
input[type="checkbox"] {
  accent-color: var(--red);
}
.route-key {
  width: 20px;
  height: 5px;
  background: var(--red);
  filter: none;
}
.map-heading {
  scroll-margin-top: 96px;
}
.map-frame {
  overflow: hidden;
  border-color: var(--line-strong);
  border-radius: 0;
  box-shadow: none;
}
.map-viewport {
  height: 680px;
  scrollbar-color: var(--line-strong) var(--canvas);
  background-color: var(--canvas);
  background-image:
    linear-gradient(#ed1d240d 1px, transparent 1px),
    linear-gradient(90deg, #ed1d240d 1px, transparent 1px),
    radial-gradient(#f5eee817 0.7px, transparent 0.7px);
  background-size:
    72px 72px,
    72px 72px,
    20px 20px;
}
.map-viewport::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
.map-viewport::-webkit-scrollbar-track {
  background: var(--canvas);
}
.map-viewport::-webkit-scrollbar-thumb {
  border: 2px solid var(--canvas);
  border-radius: 0;
  background: var(--line-strong);
}
.timeline-strand,
.future-branch,
.timeline-trunk__halo {
  fill: none;
  stroke-linecap: square;
  stroke-linejoin: miter;
  vector-effect: non-scaling-stroke;
}
.timeline-trunk__halo {
  display: none;
}
.timeline-strand--main {
  stroke: var(--red);
  stroke-width: 1.5;
  opacity: 0.55;
}
.timeline-strand--main:nth-of-type(2n) {
  opacity: 0.4;
}
.timeline-strand--core {
  stroke-width: 3;
  opacity: 1;
}
.future-branch {
  stroke: var(--red);
  stroke-width: 1.6;
  opacity: 0.45;
}
.connection-group {
  opacity: 0.34;
  transition: opacity 150ms;
}
.connection-group--active {
  opacity: 1;
}
.connection {
  stroke-width: 1.1;
  opacity: 0.52;
  stroke-linecap: round;
}
.connection--core {
  stroke-width: 2.6;
  opacity: 1;
}
.connection--disputed {
  stroke-dasharray: 3 9;
}
.connection-halo {
  display: none;
}
.node-tether {
  stroke-width: 1.2;
  opacity: 0.58;
  stroke-dasharray: 2 5;
}
.timeline-junction {
  stroke-width: 2.5;
  filter: none;
}
.timeline-junction--major {
  stroke-width: 3;
}
.timeline-junction__core {
  filter: none;
}
.axis-year {
  fill: #d8c9ad;
  font-variant-numeric: tabular-nums;
}
.project-node {
  overflow: visible;
  border-color: var(--rule);
  border-top-color: var(--lane-color);
  border-radius: 0;
  background: var(--surface);
  box-shadow: none;
}
.project-node::before {
  display: none;
}
.project-node::after {
  display: none;
}
.project-node--main {
  border-color: var(--rule);
  background: var(--surface-raised);
}
.project-node--major {
  border-color: color-mix(in srgb, var(--warm) 72%, var(--rule));
  border-top-color: var(--red);
  box-shadow: none;
}
.node-content img {
  border-radius: 0;
  outline-color: #ffffff1a;
  filter: none;
}
.node-topline {
  letter-spacing: 0.08em;
}
.node-bottom {
  border-top-color: #3b2d1d;
}
.node-landmark {
  color: var(--warm);
}
.project-node.is-related,
.project-node.is-highlighted {
  border-color: var(--lane-color);
  background: var(--surface-raised);
  box-shadow: none;
}
.lane-label {
  min-width: 0;
  border-inline-start: 3px solid var(--lane-color);
  padding: 8px 10px;
  border-radius: 0;
  background: var(--canvas);
  box-shadow: none;
  text-shadow: none;
}
.lane-label em {
  color: var(--lane-color);
  font: 8px/1.4 var(--font-mono);
  font-style: normal;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.lane-label > span {
  margin-top: 3px;
  color: var(--text);
  font-family: var(--font-base);
  font-size: 14px;
  letter-spacing: -0.01em;
  text-transform: none;
}
.lane-label small {
  max-width: 32ch;
  color: var(--muted);
}
.epoch-label {
  color: var(--text-dim);
}
.epoch-label > span {
  border-color: color-mix(in srgb, var(--red) 62%, var(--rule));
  border-radius: 0;
  color: var(--red);
  background: var(--surface);
}
.map-tools select,
.zoom-controls {
  border-color: var(--line-strong);
  border-radius: 0;
  background: var(--surface-raised);
  color: var(--text);
  box-shadow: none;
  backdrop-filter: none;
}
.map-hint {
  border-color: var(--line-strong);
  border-radius: 0;
  background: var(--surface-raised);
}
.overview {
  border-color: var(--rule);
  filter: none;
}
.overview-trunk,
.overview-limb {
  fill: none;
  stroke-linecap: square;
  vector-effect: non-scaling-stroke;
}
.overview-trunk {
  stroke-width: 5;
}
.overview-limb {
  stroke-width: 3;
  opacity: 0.7;
}
.legend-spine {
  height: 5px;
  border-radius: 0;
  background: var(--red);
}
.legend-node {
  width: 8px !important;
  height: 8px;
  border: 2px solid var(--muted);
  border-radius: 0;
}
.legend-branch {
  border-top-color: var(--warm);
}
.legend-dotted {
  border-top-color: var(--muted);
}
.reality-directory {
  padding-block: 76px 46px;
}
.reality-directory > header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 0.72fr);
  gap: 48px;
  align-items: end;
  margin-bottom: 28px;
}
.reality-directory header > div > span {
  color: var(--red);
  font: 9px/1.4 var(--font-mono);
  letter-spacing: 0.12em;
}
.reality-directory h2 {
  margin: 8px 0 0;
  font-size: clamp(32px, 4vw, 56px);
  line-height: 1;
  letter-spacing: -0.055em;
  text-wrap: balance;
}
.reality-directory header p {
  max-width: 58ch;
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.7;
  text-wrap: pretty;
}
.reality-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-block: 1px solid var(--line-strong);
}
.reality-grid button {
  position: relative;
  display: grid;
  grid-template-columns: 28px 14px minmax(0, 1fr) auto 20px;
  gap: 12px;
  align-items: center;
  min-height: 78px;
  padding: 14px 18px;
  border: 0;
  border-bottom: 1px solid var(--rule);
  background: transparent;
  color: var(--text);
  text-align: start;
}
.reality-grid button:nth-child(odd) {
  border-inline-end: 1px solid var(--rule);
}
.reality-grid button.is-active {
  background: color-mix(in srgb, var(--lane-color) 14%, var(--surface));
}
.reality-index,
.reality-count {
  color: var(--muted);
  font: 9px/1 var(--font-mono);
  font-variant-numeric: tabular-nums;
}
.reality-grid button > i {
  width: 8px;
  height: 8px;
  border: 1px solid var(--lane-color);
  border-radius: 0;
  background: var(--paper);
  box-shadow: none;
}
.reality-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 3px;
}
.reality-copy strong {
  font-size: 13px;
  line-height: 1.35;
}
.reality-copy small {
  overflow: hidden;
  color: var(--muted);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.reality-count {
  min-width: 22px;
  padding: 5px 6px;
  border: 1px solid var(--rule);
  border-radius: 0;
  text-align: center;
}
.reality-arrow {
  color: var(--lane-color);
  font-size: 14px;
}
.archive-footer {
  padding-block-start: 34px;
}
.footer-index,
.archive-footer summary > span,
.methodology a,
.connection-details button strong > span {
  color: var(--red);
}
.list-grid button,
.connection-details > article {
  border-color: var(--rule);
  background: var(--surface);
}
.project-dialog {
  border-color: var(--line-strong);
  background: var(--paper);
  box-shadow: none;
}
.spoiler-toggle {
  background: var(--surface-hover);
}
.empty-state button,
.reveal-project {
  background: var(--red);
  color: #fff8f4;
}
.connection-meta {
  color: var(--positive);
}
.connection-meta .is-disputed {
  color: var(--warm);
}
@media (hover: hover) {
  .format-filters button:not([aria-pressed="true"]):hover,
  .view-toggle button:hover,
  .zoom-controls button:not(:disabled):hover {
    background: var(--surface-hover);
  }
  .chapters button:hover {
    color: var(--red);
  }
  .project-node:hover,
  .list-grid button:hover {
    border-color: var(--lane-color);
  }
  .project-node:hover {
    transform: translateY(-2px);
  }
  .list-grid button:hover {
    background: var(--surface-hover);
  }
}
@media (prefers-reduced-motion: no-preference) {
  .project-node {
    transition:
      border-color 150ms,
      box-shadow 150ms,
      transform 150ms;
  }
  .connection {
    transition:
      opacity 150ms,
      stroke-width 150ms;
  }
  .zoom-controls button:active,
  .view-toggle button:active {
    scale: 0.96;
  }
}
@media (max-width: 1050px) {
  .atlas-toolbar {
    flex-wrap: wrap;
    gap: 12px;
  }
  .toolbar-right {
    flex: 1;
    justify-content: flex-end;
  }
  .chapters {
    column-gap: 15px;
  }
  .hero-aside {
    max-width: 325px;
  }
  .archive-stats {
    gap: 14px;
  }
  .archive-status {
    display: none;
  }
  .map-heading__note {
    display: none;
  }
}
@media (max-width: 700px) {
  .marvel-page {
    padding: 25px 20px;
  }
  .archive-meta > span:last-child {
    display: none;
  }
  .hero-content {
    flex-direction: column;
    align-items: start;
    gap: 20px;
    padding-block: 22px 24px;
  }
  .hero-title {
    gap: 12px;
  }
  h1 {
    font-size: clamp(38px, 8.7vw, 60px);
  }
  .hero-aside {
    max-width: none;
  }
  .hero-aside p {
    font-size: 12px;
    margin-bottom: 12px;
  }
  .archive-stats {
    gap: 14px;
  }
  .archive-status {
    display: flex;
  }
  .format-filters {
    gap: 2px;
  }
  .format-filters button {
    font-size: 11px;
    padding: 7px 8px;
    min-height: 40px;
  }
  .toolbar-right {
    flex-basis: 100%;
    justify-content: space-between;
  }
  .search-box {
    flex: 1;
  }
  .search-box input {
    width: 100%;
    font-size: 16px;
  }
  .view-toggle button {
    width: 40px;
    height: 38px;
  }
  .atlas-navigation {
    align-items: start;
    flex-direction: column;
    gap: 0;
    padding-top: 6px;
  }
  .chapters {
    column-gap: 15px;
  }
  .chapters button {
    font-size: 10px;
    min-height: 40px;
  }
  .branch-toggle {
    align-self: flex-end;
    min-height: 40px;
  }
  .map-heading {
    gap: 8px;
  }
  .map-heading > div {
    gap: 6px;
  }
  .map-heading strong {
    font-size: 10px;
  }
  .result-count {
    font-size: 9px;
  }
  .route-key {
    width: 12px;
  }
  .map-viewport {
    height: 540px;
  }
  .epoch-label {
    display: none;
  }
  .map-tools {
    inset-inline: 8px;
    top: 8px;
    flex-wrap: wrap;
    gap: 8px;
  }
  .map-tools select {
    max-width: 170px;
    min-height: 44px;
    font-size: 10px;
  }
  .zoom-controls button {
    min-width: 42px;
    height: 44px;
  }
  .zoom-controls output {
    min-width: 34px;
    font-size: 9px;
  }
  .map-hint {
    max-width: calc(100% - 24px);
    font-size: 8px;
    bottom: 14px;
    left: 8px;
  }
  .overview-row {
    gap: 12px;
  }
  .overview-label {
    font-size: 9px;
  }
  .overview-label small {
    font-size: 8px;
  }
  .overview-end {
    display: none;
  }
  .legend-note {
    margin-inline-start: 0;
    line-height: 1.6;
  }
  .archive-footer {
    flex-direction: column;
    gap: 20px;
  }
  .archive-footer summary {
    text-align: start;
  }
  .list-grid {
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  }
  .project-details {
    padding: 18px 20px 24px;
  }
  .project-facts {
    gap: 18px;
  }
}
@media (max-width: 390px) {
  .map-tools select {
    max-width: 150px;
  }
  .map-tools {
    flex-direction: column;
    align-items: start;
  }
  .zoom-controls {
    align-self: flex-end;
  }
  .archive-stats {
    gap: 12px;
  }
  .archive-status {
    display: none;
  }
  .project-facts {
    grid-template-columns: 1fr;
  }
}
@media (hover: hover) {
  .reality-grid button:hover {
    background: color-mix(in srgb, var(--lane-color) 12%, var(--surface));
  }
  .reality-grid button:hover .reality-arrow {
    translate: 2px -2px;
  }
}
@media (prefers-reduced-motion: no-preference) {
  .reality-arrow {
    transition: translate 150ms;
  }
  .reality-grid button:active {
    scale: 0.99;
  }
}
@media (max-width: 900px) {
  .hero-content {
    grid-template-columns: 1fr;
    min-height: 0;
    gap: 24px;
  }
  .temporal-tree {
    width: min(100%, 560px);
    margin-inline: auto;
  }
  .reality-directory > header {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
@media (max-width: 700px) {
  .hero-content {
    display: grid;
    padding-block: 26px 24px;
  }
  h1 {
    font-size: clamp(50px, 15vw, 74px);
  }
  h1 > span {
    font-size: 0.55em;
  }
  .hero-lede {
    font-size: 13px;
    line-height: 1.6;
  }
  .temporal-tree figcaption {
    gap: 8px;
    font-size: 7px;
  }
  .map-frame {
    border-radius: 0;
  }
  .reality-directory {
    padding-block: 54px 28px;
  }
  .reality-grid {
    grid-template-columns: 1fr;
  }
  .reality-grid button:nth-child(odd) {
    border-inline-end: 0;
  }
  .reality-grid button {
    min-height: 74px;
    padding-inline: 10px;
  }
  .reality-copy small {
    white-space: normal;
  }
}
@media (max-width: 390px) {
  .temporal-tree {
    width: calc(100% + 20px);
    margin-inline: -10px;
  }
  .temporal-tree figcaption span:first-child,
  .temporal-tree figcaption span:last-child {
    display: none;
  }
  .temporal-tree figcaption {
    grid-template-columns: 1fr;
    text-align: center;
  }
  .reality-grid button {
    grid-template-columns: 22px 12px minmax(0, 1fr) auto 16px;
    gap: 8px;
  }
}
/* Ветки карты: размеры карточек по типу проекта и раскрытие ветки при наведении. */
button.lane-label {
  margin: 0;
  border: 0;
  border-inline-start: 3px solid var(--lane-color);
  font: inherit;
  text-align: start;
  cursor: pointer;
  pointer-events: auto;
}
.lane-zone {
  position: absolute;
  z-index: 1;
}
.project-node--compact {
  width: 184px;
  height: 122px;
  padding: 10px;
}
.project-node--compact .node-content img {
  width: 32px;
  height: 46px;
}
.project-node--compact .node-content strong {
  font-size: 12px;
}
.project-node--compact .node-symbol {
  font-size: 18px;
}
.project-node--wide {
  width: 232px;
  height: 158px;
}
.project-node--wide .node-content strong {
  font-size: 14px;
}
.node-content strong {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
}
.project-node--compact .node-content strong {
  -webkit-line-clamp: 3;
}
.project-node.is-lane-expanded {
  z-index: 5;
  transform: translateY(-3px) scale(1.06);
  border-color: var(--lane-color);
  box-shadow: 0 16px 32px #00000080;
}
.map-canvas--lane-focus .project-node:not(.is-lane-expanded) {
  opacity: 0.45;
}
.map-canvas--lane-focus .connection-group {
  opacity: 0.1;
}
.map-canvas--lane-focus .connection-group--active {
  opacity: 1;
}
.lane-label--expanded {
  background: var(--surface-hover);
}
.source-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 18px;
}
.source-list a {
  font: 10px/1.8 var(--font-mono);
}
.connection--order {
  stroke-width: 1.2;
  opacity: 0.4;
}
.connection--order.connection--core {
  stroke-width: 1.8;
  opacity: 0.66;
}
.legend-order {
  border-top: 1px solid var(--muted);
}
.connection--italic .connection-direction,
.connection--italic p {
  font-style: italic;
}
@media (prefers-reduced-motion: no-preference) {
  .project-node {
    transition:
      transform 170ms,
      opacity 170ms,
      border-color 150ms,
      box-shadow 150ms;
  }
  .lane-label {
    transition:
      background-color 150ms,
      transform 150ms;
  }
}
</style>
