export function canDragModel(pointerType: string, button: number): boolean {
  return pointerType === "mouse" && button === 0;
}

export function isLeftButtonHeld(buttons: number): boolean {
  return (buttons & 1) !== 0;
}

export function settledMember(progress: number, count: number): number {
  if (!Number.isFinite(progress) || count <= 1) return 0;
  return Math.max(0, Math.min(count - 1, Math.round(progress)));
}

interface MemberNavigationInput {
  key: string;
  shiftKey?: boolean;
  progress: number;
  count: number;
}

/** Return null for keys owned by model controls, links or browser navigation. */
export function keyboardMember({
  key,
  shiftKey = false,
  progress,
  count,
}: MemberNavigationInput): number | null {
  if (key === "Home") return 0;
  if (key === "End") return Math.max(0, count - 1);
  let direction: number;
  switch (key) {
    case "ArrowDown":
    case "PageDown":
      direction = 1;
      break;
    case "ArrowUp":
    case "PageUp":
      direction = -1;
      break;
    case " ":
      direction = shiftKey ? -1 : 1;
      break;
    default:
      return null;
  }
  return settledMember(progress + direction, count);
}

/** WheelEvent deltaMode: pixels, lines (16px), or pages (one shot). */
export function wheelProgress(
  current: number,
  delta: number,
  mode: number,
  step: number,
  count: number,
) {
  const pixels = delta * (mode === 1 ? 16 : mode === 2 ? step : 1);
  if (!Number.isFinite(pixels) || step <= 0) return current;
  return Math.max(0, Math.min(count - 1, current + pixels / step));
}

/** Frame-rate-independent settling; duration is the existing theme's slow-motion token. */
export function dampProgress(
  current: number,
  target: number,
  elapsedMs: number,
  durationMs: number,
): number {
  if (durationMs <= 0) return target;
  return target + (current - target) * Math.exp((-3 * Math.max(0, elapsedMs)) / durationMs);
}
