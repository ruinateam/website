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

export interface WheelGesture {
  distance: number;
  lastAt: number;
  stepped: boolean;
}

/** A pause longer than this starts a new wheel or trackpad gesture. */
export const WHEEL_GESTURE_IDLE_MS = 220;
/** Small trackpad deltas accumulate until this distance within one gesture. */
export const WHEEL_MIN_DISTANCE = 24;

/**
 * Advances at most one participant per gesture. A one-notch wheel event passes the
 * threshold immediately; a slow trackpad gesture accumulates until it does, and the
 * first frame is never discarded by settling between wheel events.
 */
export function wheelMember(
  current: number,
  deltaPixels: number,
  count: number,
  gesture: WheelGesture,
  now: number,
): { member: number; gesture: WheelGesture } {
  const settled = settledMember(current, count);
  if (!Number.isFinite(deltaPixels) || deltaPixels === 0 || count <= 1)
    return { member: settled, gesture: { ...gesture, lastAt: now } };

  const fresh = now - gesture.lastAt > WHEEL_GESTURE_IDLE_MS;
  const distance = (fresh ? 0 : gesture.distance) + deltaPixels;
  const stepped = fresh ? false : gesture.stepped;
  if (!stepped && Math.abs(distance) >= WHEEL_MIN_DISTANCE) {
    return {
      member: settledMember(settled + Math.sign(distance), count),
      gesture: { distance: 0, lastAt: now, stepped: true },
    };
  }
  return { member: settled, gesture: { distance, lastAt: now, stepped } };
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
