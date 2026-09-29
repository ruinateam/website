import { projectById, projects } from "./marvel-timeline";
import type { Connection, Project } from "./marvel-timeline";

/**
 * Layout layer for the timeline screen.
 *
 * Everything here is diagram geometry, never lore: coordinates describe how the
 * archive is drawn, not when events happen in-universe. Two independent layouts
 * are derived from the same data model:
 *
 * - `timeline` reads left to right and answers "what is the order?";
 * - `tree` reads bottom to top and answers "how is the multiverse shaped?".
 */

export type CanvasView = "timeline" | "tree";
export type DetailLevel = "overview" | "compact" | "full";
export type CaptionSide = "above" | "below" | "left" | "right";
export type LayoutPoint = { x: number; y: number };

const round = (value: number) => Math.round(value * 10) / 10;

/**
 * Semantic zoom: the diagram shows less of a medallion as it gets smaller
 * instead of scaling an unreadable rectangle down.
 */
export function detailLevelFor(zoom: number): DetailLevel {
  if (zoom < 0.6) return "overview";
  if (zoom < 0.78) return "compact";
  return "full";
}

/* ------------------------------- medallions ------------------------------- */

const discByGroup = {
  overview: { special: 18, standard: 21, major: 28 },
  compact: { special: 68, standard: 76, major: 92 },
  full: { special: 84, standard: 96, major: 124 },
} as const;

/** Caption metrics; the medallion reserves this height so rows never collide. */
export const medallionCaptionWidth = { compact: 172, full: 200 } as const;
export const medallionCaptionHeight = { compact: 42, full: 56 } as const;
export const medallionCaptionGap = 10;

export function medallionDisc(project: Project, level: DetailLevel): number {
  const group = project.media === "special" ? "special" : project.major ? "major" : "standard";
  return discByGroup[level][group];
}

/* --------------------------------- timeline -------------------------------- */

export const timelineGeometry = {
  padding: 190,
  step: 344,
  chapterExtra: 132,
  landmarkExtra: 56,
  mainY: 900,
  landmarkOffset: 132,
  branchGap: 14,
  trailing: 360,
  bottom: 250,
};

export type TimelineChapter = {
  id: string;
  index: number;
  slot: number;
  title: string;
  years: string;
};

/** Chapter anchors drive both the epoch separators and the extra column spacing. */
export const timelineChapters: TimelineChapter[] = [
  { id: "first-avenger", title: "Начало", years: "1943–2011" },
  { id: "avengers", title: "Сбор Мстителей", years: "2012–2015" },
  { id: "civil-war", title: "Раскол", years: "2016–2017" },
  { id: "infinity-war", title: "Бесконечность", years: "2018–2023" },
  { id: "no-way-home", title: "Мультивселенная", years: "После «Финала»" },
].map((chapter, index) => ({
  ...chapter,
  index,
  slot: projectById.get(chapter.id)?.slot ?? 0,
}));

/** Rows with room between them; lanes sharing a row never overlap along x. */
export const timelineRows: { y: number; lanes: string[] }[] = [
  { y: 320, lanes: ["webb", "raimi", "spiderverse", "neighbor"] },
  { y: 560, lanes: ["history", "groot", "tva"] },
  { y: timelineGeometry.mainY, lanes: ["mcu"] },
  { y: 1420, lanes: ["stories"] },
  { y: 1660, lanes: ["street"] },
  { y: 1900, lanes: ["whatif"] },
  { y: 2140, lanes: ["four"] },
  { y: 2380, lanes: ["mutants"] },
  { y: 2620, lanes: ["fox"] },
  { y: 2860, lanes: ["sony"] },
];

const timelineLaneRow = new Map<string, number>(
  timelineRows.flatMap((row) => row.lanes.map((id): [string, number] => [id, row.y])),
);

const timelineLastRow = timelineRows[timelineRows.length - 1]?.y ?? timelineGeometry.mainY;

export function timelineLaneY(laneId: string): number {
  // Unmapped lanes never fall back onto the trunk; they get their own row below.
  return timelineLaneRow.get(laneId) ?? timelineLastRow + 240;
}

const maxSlot = Math.max(...projects.map((project) => project.slot));

const timelineMainBySlot = new Map<number, Project>();
for (const project of projects) {
  if (project.lane === "mcu") timelineMainBySlot.set(project.slot, project);
}

const chapterSlots = new Set(timelineChapters.map((chapter) => chapter.slot));

/** One x per story column; columns breathe around chapters and landmarks. */
export const timelineColumns: number[] = (() => {
  const columns: number[] = [];
  let x = timelineGeometry.padding;
  for (let slot = 0; slot <= maxSlot; slot += 1) {
    if (slot > 0) {
      const column = timelineMainBySlot.get(slot);
      x += timelineGeometry.step;
      if (column && chapterSlots.has(slot)) x += timelineGeometry.chapterExtra;
      if (column?.major) x += timelineGeometry.landmarkExtra;
    }
    columns.push(x);
  }
  return columns;
})();

export function timelineX(slot: number): number {
  const index = Math.max(0, Math.round(slot));
  const column = timelineColumns[index];
  if (column !== undefined) return column;
  const last = timelineColumns[timelineColumns.length - 1] ?? timelineGeometry.padding;
  return last + (index - timelineColumns.length + 1) * timelineGeometry.step;
}

export const timelineCanvas = {
  width: round(
    timelineX(maxSlot) + timelineGeometry.trailing + timelineGeometry.padding,
  ),
  height: round(
    (timelineRows[timelineRows.length - 1]?.y ?? timelineGeometry.mainY) + timelineGeometry.bottom,
  ),
};

/** Stable anchor on the lane line: connections and tethers never move with zoom. */
export function timelineAnchor(project: Project): LayoutPoint {
  return { x: timelineX(project.slot), y: timelineLaneY(project.lane) };
}

export function timelineDiscCenter(project: Project, level: DetailLevel): LayoutPoint {
  const x = timelineX(project.slot);
  if (project.lane === "mcu") {
    const direction = project.slot % 2 === 0 ? -1 : 1;
    return { x, y: timelineGeometry.mainY + direction * timelineGeometry.landmarkOffset };
  }
  const disc = medallionDisc(project, level);
  return { x, y: timelineLaneY(project.lane) - timelineGeometry.branchGap - disc / 2 };
}

export function timelineCaptionSide(project: Project): CaptionSide {
  if (project.lane !== "mcu") return "above";
  return project.slot % 2 === 0 ? "above" : "below";
}

const laneProjectsByRow = new Map<string, Project[]>();
for (const project of projects) {
  const list = laneProjectsByRow.get(project.lane) ?? [];
  list.push(project);
  laneProjectsByRow.set(project.lane, list);
}
for (const list of laneProjectsByRow.values()) list.sort((a, b) => a.slot - b.slot);

export function laneProjects(laneId: string): Project[] {
  return laneProjectsByRow.get(laneId) ?? [];
}

export function timelineLaneBounds(laneId: string): { start: number; end: number } {
  const nodes = laneProjects(laneId);
  if (!nodes.length) return { start: 0, end: 0 };
  const first = nodes[0]!;
  const last = nodes[nodes.length - 1]!;
  return { start: timelineAnchor(first).x - 128, end: timelineAnchor(last).x + 132 };
}

export function timelineRowBand(laneId: string): { top: number; bottom: number } {
  const y = timelineLaneY(laneId);
  // The trunk band covers both medallion rows around the main line.
  if (laneId === "mcu") return { top: y - 195, bottom: y + 195 };
  return { top: y - 195, bottom: y + 45 };
}

/* ------------------------------ timeline paths ----------------------------- */

export const timelineStrandOffsets: Record<DetailLevel, number[]> = {
  overview: [-6, 0, 6],
  compact: [-12, -6, 0, 6, 12],
  full: [-12, -6, 0, 6, 12],
};

export const timelineFutureOffsets = [-190, -126, -70, -26, 34, 96, 168];

export function timelineStrandPath(
  start: number,
  end: number,
  y: number,
  offset: number,
  index: number,
): string {
  const span = end - start;
  const direction = index % 2 === 0 ? 1 : -1;
  const baseline = y + offset;
  const wave = (8 + (index % 4) * 2.5) * direction;

  return `M ${round(start)} ${round(baseline)}
    C ${round(start + span * 0.1)} ${round(baseline + wave)}, ${round(start + span * 0.16)} ${round(baseline - wave)}, ${round(start + span * 0.27)} ${round(baseline)}
    S ${round(start + span * 0.43)} ${round(baseline + wave)}, ${round(start + span * 0.54)} ${round(baseline)}
    S ${round(start + span * 0.71)} ${round(baseline - wave)}, ${round(start + span * 0.8)} ${round(baseline)}
    S ${round(start + span * 0.93)} ${round(baseline + wave)}, ${round(end)} ${round(baseline)}`;
}

export function timelineFuturePath(offset: number, index: number): string {
  const start = timelineCanvas.width - 860;
  const end = timelineCanvas.width - 54;
  const { mainY } = timelineGeometry;
  const direction = Math.sign(offset) || (index % 2 === 0 ? 1 : -1);

  return `M ${round(start)} ${round(mainY + (index - 3) * 4)}
    C ${round(start + 270)} ${round(mainY + direction * 18)},
      ${round(end - 320)} ${round(mainY + offset * 0.76)},
      ${round(end)} ${round(mainY + offset)}`;
}

export function timelineConnectionPath(
  connection: Connection,
  offset: number,
  index: number,
): string {
  const source = projectById.get(connection.source);
  const target = projectById.get(connection.target);
  if (!source || !target) return "";

  const from = timelineAnchor(source);
  const to = timelineAnchor(target);
  const distance = to.x - from.x;
  const middle = from.x + distance * 0.5;

  if (from.y === to.y) {
    const direction = connection.id.length % 2 === 0 ? 1 : -1;
    const crown = direction * (58 + index * 7 + offset * 2);
    return `M ${round(from.x)} ${round(from.y)}
      C ${round(from.x + distance * 0.28)} ${round(from.y + crown)},
        ${round(to.x - distance * 0.28)} ${round(to.y + crown)},
        ${round(to.x)} ${round(to.y)}`;
  }

  return `M ${round(from.x)} ${round(from.y)}
    C ${round(middle)} ${round(from.y + offset * 3)},
      ${round(middle)} ${round(to.y + offset * 3)},
      ${round(to.x)} ${round(to.y)}`;
}

/* ---------------------------------- tree ---------------------------------- */

export const treeGeometry = {
  width: 4600,
  height: 11500,
  trunkX: 2200,
  stepY: 232,
  roots: 460,
};

const treeBaseY = treeGeometry.height - treeGeometry.roots;

export function treeY(slot: number): number {
  return round(treeBaseY - slot * treeGeometry.stepY);
}

export function treeTrunkX(slot: number): number {
  return round(treeGeometry.trunkX + Math.sin(slot * 0.55) * 34 + Math.sin(slot * 0.17) * 18);
}

type TreeLaneStrategy =
  | { kind: "trunk"; offset: number }
  | { kind: "braid"; side: "left" | "right"; spread: number }
  | { kind: "branch"; side: "left" | "right"; spread: number }
  | { kind: "orbit"; rx: number; ry: number; cySlot: number; angles: number[] };

/**
 * Layout metadata: which side of the trunk a lane grows on and how far out.
 * Earth-616 story lanes stay close to the trunk as inner threads; alternate
 * realities fan out as branches; TVA orbits outside the ordinary time axis.
 */
const treeLaneStrategy = new Map<string, TreeLaneStrategy>([
  ["mcu", { kind: "trunk", offset: 96 }],
  ["stories", { kind: "braid", side: "left", spread: 300 }],
  ["street", { kind: "braid", side: "left", spread: 560 }],
  ["groot", { kind: "braid", side: "left", spread: 560 }],
  ["history", { kind: "braid", side: "right", spread: 300 }],
  ["four", { kind: "branch", side: "left", spread: 900 }],
  ["raimi", { kind: "branch", side: "left", spread: 1160 }],
  ["webb", { kind: "branch", side: "left", spread: 1400 }],
  ["fox", { kind: "branch", side: "left", spread: 1640 }],
  ["whatif", { kind: "branch", side: "right", spread: 900 }],
  ["mutants", { kind: "branch", side: "right", spread: 1160 }],
  ["spiderverse", { kind: "branch", side: "right", spread: 1400 }],
  ["sony", { kind: "branch", side: "right", spread: 1640 }],
  ["neighbor", { kind: "branch", side: "right", spread: 1880 }],
  ["tva", { kind: "orbit", rx: 1180, ry: 2100, cySlot: 24, angles: [-0.95, -0.5] }],
]);

const treeOrbit = (() => {
  const strategy = treeLaneStrategy.get("tva");
  if (strategy?.kind !== "orbit") return undefined;
  return {
    cx: treeGeometry.trunkX,
    cy: treeY(strategy.cySlot),
    rx: strategy.rx,
    ry: strategy.ry,
  };
})();

function treeLanePhase(laneId: string): number {
  let hash = 0;
  for (const char of laneId) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return (hash / 360) * Math.PI * 2;
}

/** Horizontal distance of a lane node from the trunk centre. */
function treeLaneOffset(project: Project, laneId: string): number {
  const strategy = treeLaneStrategy.get(laneId);
  if (!strategy) return 0;

  if (strategy.kind === "trunk") {
    const direction = project.slot % 2 === 0 ? -1 : 1;
    return direction * strategy.offset;
  }

  if (strategy.kind === "braid" || strategy.kind === "branch") {
    const wave = Math.sin(project.slot * 0.62 + treeLanePhase(laneId)) * 44;
    const direction = strategy.side === "left" ? -1 : 1;
    return direction * (strategy.spread + wave);
  }

  return 0;
}

export function treeDiscCenter(project: Project): LayoutPoint {
  const laneId = project.lane;
  const strategy = treeLaneStrategy.get(laneId);

  if (strategy?.kind === "orbit" && treeOrbit) {
    const nodes = laneProjects(laneId);
    const index = nodes.findIndex((node) => node.id === project.id);
    const angle = strategy.angles[index] ?? -0.5;
    return {
      x: round(treeGeometry.trunkX + Math.cos(angle) * treeOrbit.rx),
      y: round(treeOrbit.cy + Math.sin(angle) * treeOrbit.ry),
    };
  }

  return {
    x: round(treeTrunkX(project.slot) + treeLaneOffset(project, laneId)),
    y: treeY(project.slot),
  };
}

/** Point where a trunk node meets the trunk itself (junction and tether anchor). */
export function treeTrunkAnchor(project: Project): LayoutPoint {
  return { x: treeTrunkX(project.slot), y: treeY(project.slot) };
}

export function treeLaneSide(laneId: string): "left" | "right" | "center" | "orbit" {
  const strategy = treeLaneStrategy.get(laneId);
  if (!strategy) return "center";
  if (strategy.kind === "orbit") return "orbit";
  if (strategy.kind === "trunk") return "center";
  return strategy.side;
}

/** Catmull-Rom to cubic bezier: organic limbs through a list of nodes. */
function smoothPath(points: LayoutPoint[]): string {
  if (points.length < 2) return "";
  const commands = [`M ${round(points[0]!.x)} ${round(points[0]!.y)}`];
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[Math.max(0, index - 1)]!;
    const start = points[index]!;
    const end = points[index + 1]!;
    const next = points[Math.min(points.length - 1, index + 2)]!;
    const controlA = {
      x: start.x + (end.x - previous.x) / 6,
      y: start.y + (end.y - previous.y) / 6,
    };
    const controlB = {
      x: end.x - (next.x - start.x) / 6,
      y: end.y - (next.y - start.y) / 6,
    };
    commands.push(
      `C ${round(controlA.x)} ${round(controlA.y)}, ${round(controlB.x)} ${round(controlB.y)}, ${round(end.x)} ${round(end.y)}`,
    );
  }
  return commands.join(" ");
}

export function treeTrunkSpine(offset = 0): string {
  const nodes = laneProjects("mcu");
  return smoothPath(
    nodes.map((project) => ({
      x: treeTrunkX(project.slot) + offset,
      y: treeY(project.slot),
    })),
  );
}

/** A branch leaves the trunk below its lowest node and grows outward upwards. */
export function treeBranchSpine(laneId: string): string {
  const nodes = laneProjects(laneId);
  if (nodes.length < 1) return "";
  const first = nodes[0]!;
  const start = { x: treeTrunkX(first.slot), y: treeY(first.slot) + 40 };
  const points: LayoutPoint[] = [start, ...nodes.map((node) => treeDiscCenter(node))];
  return smoothPath(points);
}

export function treeOrbitPath(): string {
  if (!treeOrbit) return "";
  const { cx, cy, rx, ry } = treeOrbit;
  return `M ${round(cx - rx)} ${round(cy)}
    A ${round(rx)} ${round(ry)} 0 1 0 ${round(cx + rx)} ${round(cy)}
    A ${round(rx)} ${round(ry)} 0 1 0 ${round(cx - rx)} ${round(cy)}`;
}

export function treeConnectionPath(connection: Connection): string {
  const source = projectById.get(connection.source);
  const target = projectById.get(connection.target);
  if (!source || !target) return "";
  const from = treeDiscCenter(source);
  const to = treeDiscCenter(target);
  const middle = (from.y + to.y) / 2;
  return `M ${round(from.x)} ${round(from.y)}
    C ${round(from.x)} ${round(middle)}, ${round(to.x)} ${round(middle)}, ${round(to.x)} ${round(to.y)}`;
}

export function treeLaneLabelPoint(laneId: string): LayoutPoint {
  const nodes = laneProjects(laneId);
  const top = nodes[nodes.length - 1];
  if (!top) return { x: treeGeometry.trunkX, y: treeBaseY };
  const point = treeDiscCenter(top);
  const side = treeLaneSide(laneId);
  const direction = side === "left" ? -1 : 1;
  return {
    x: round(point.x + direction * 92),
    y: round(point.y - 26),
  };
}

export function treeLaneBounds(laneId: string): { top: number; bottom: number } {
  const nodes = laneProjects(laneId);
  if (!nodes.length) return { top: treeBaseY, bottom: treeBaseY };
  const top = nodes[nodes.length - 1]!;
  const bottom = nodes[0]!;
  return { top: treeY(top.slot) - 190, bottom: treeY(bottom.slot) + 190 };
}

/** Decorative root system: no lore, only a direction cue for the reading order. */
export function treeRootPaths(): string[] {
  const base = treeBaseY;
  const cx = treeGeometry.trunkX;
  const specs = [
    { spread: -640, drop: 320, bend: -150 },
    { spread: -380, drop: 250, bend: -60 },
    { spread: -170, drop: 300, bend: -190 },
    { spread: 150, drop: 280, bend: 120 },
    { spread: 420, drop: 330, bend: 90 },
    { spread: 680, drop: 250, bend: 240 },
  ];
  return specs.map(
    ({ spread, drop, bend }) => `M ${round(cx + spread * 0.16)} ${round(base - 60)}
      C ${round(cx + spread * 0.34)} ${round(base + drop * 0.4)},
        ${round(cx + spread * 0.7 + bend * 0.2)} ${round(base + drop * 0.66)},
        ${round(cx + spread)} ${round(base + drop)}`,
  );
}

/** Open crown: unfinished branches, deliberately not attached to any project. */
export function treeCrownPaths(): { d: string; tip: LayoutPoint }[] {
  const topSlot = maxSlot;
  const base = treeY(topSlot) - 40;
  const cx = treeTrunkX(topSlot);
  const specs = [
    { spread: -1080, rise: 900, bend: -260 },
    { spread: -760, rise: 1160, bend: -180 },
    { spread: -430, rise: 980, bend: -90 },
    { spread: -140, rise: 1320, bend: -40 },
    { spread: 190, rise: 1080, bend: 60 },
    { spread: 520, rise: 1240, bend: 140 },
    { spread: 860, rise: 940, bend: 240 },
    { spread: 1180, rise: 1120, bend: 320 },
  ];
  return specs.map(({ spread, rise, bend }) => {
    const tip = { x: round(cx + spread), y: round(base - rise) };
    return {
      d: `M ${round(cx + spread * 0.06)} ${round(base + 40)}
        C ${round(cx + spread * 0.2)} ${round(base - rise * 0.44)},
          ${round(cx + spread * 0.72 + bend * 0.16)} ${round(base - rise * 0.74)},
          ${tip.x} ${tip.y}`,
      tip,
    };
  });
}

export function treeRootLabelPoint(): LayoutPoint {
  return { x: treeGeometry.trunkX, y: treeBaseY + 380 };
}

export function treeCrownLabelPoint(): LayoutPoint {
  return { x: treeTrunkX(maxSlot), y: treeY(maxSlot) - 70 };
}
