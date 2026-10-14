export interface Player {
  /** Total distance travelled along the road (never wrapped). */
  z: number;
  /** Lateral position in road half-widths: -1 / +1 are the road edges. */
  x: number;
  /** World units per second. */
  speed: number;
  /** Lean, -1 (full left) to +1 (full right). Visual only; derived from steering and curves. */
  lean: number;
}

export function createPlayer(): Player {
  return { z: 0, x: 0, speed: 0, lean: 0 };
}
