export type Point3 = [number, number, number];

export const GALLERY_CENTERS = [0, 64, 128] as const;
export const PLAYER_POSITIONS: Point3[] = [
  [11, 16, 0],
  [54, 16, -2],
  [124, 19, 1],
];

const clamp = (value: number) => Math.max(0, Math.min(1, value));
export function cue(start: number, end: number, value: number) {
  const t = clamp((value - start) / (end - start));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

const cameras: Point3[] = [
  [0, 23, 66],
  [64, 20, 62],
  [130, 29, 68],
];
const targets: Point3[] = [
  [0, 17, 0],
  [64, 18, -2],
  [128, 18, 0],
];
const mix = (a: Point3, b: Point3, t: number): Point3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** Reversible shot choreography: physical camera travel, not model opacity. */
export function galleryFrame(value: number, compact: boolean) {
  const progress = Math.max(0, Math.min(2, Number.isFinite(value) ? value : 0));
  const from = Math.min(1, Math.floor(progress));
  const phase = progress - from;
  const travel = cue(0.16, 0.9, phase);
  const camera = mix(cameras[from]!, cameras[from + 1]!, travel);
  const target = mix(targets[from]!, targets[from + 1]!, travel);
  // A different rail for each handoff: lateral recession, then a raised diagonal approach.
  const arc = Math.sin(travel * Math.PI);
  camera[2] += arc * (from === 0 ? 9 : -7);
  camera[1] += arc * (from === 0 ? 1.5 : 4);
  if (compact) {
    const player = mix(PLAYER_POSITIONS[from]!, PLAYER_POSITIONS[from + 1]!, travel);
    camera[0] = player[0] + 4;
    camera[1] = 21;
    camera[2] = 62;
    target[0] = player[0];
    target[1] = 17;
  }
  return {
    camera,
    target,
    members: GALLERY_CENTERS.map((_, index) => {
      const distance = progress - index;
      const reveal = distance < 0 ? cue(-0.4, -0.12, distance) : 1 - cue(0.12, 0.42, distance);
      const links = distance < 0 ? cue(-0.18, -0.03, distance) : 1 - cue(0.05, 0.22, distance);
      const light = distance < 0 ? cue(-0.7, -0.12, distance) : 1 - cue(0.12, 0.75, distance);
      return {
        reveal,
        links,
        light,
        turn: Math.max(-1, Math.min(1, distance)) * (index === 1 ? -0.32 : 0.24),
      };
    }),
  };
}
