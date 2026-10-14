import { config } from '../config';

export interface Player {
  /** Total distance travelled along the road (never wrapped). */
  z: number;
  /** Lateral position in road half-widths: -1 / +1 are the road edges. */
  x: number;
  /** World units per second. */
  speed: number;
  /** Lean, about -1 (left) to +1 (right); a spring-damper follows steering and curves, so it can overshoot a little. */
  lean: number;
  /** Rate of change of lean (spring-damper velocity). */
  leanVel: number;
  /** Health, 0..config.crash.maxHealth. Each crash costs config.crash.damage. */
  health: number;
  /** Seconds left in the current wipeout; 0 when not crashed. Controls are locked while > 0. */
  crashTimer: number;
  /** Speed fraction (0..1) at the moment of impact; scales the tumble. */
  crashSpeed: number;
  /** Side the rider is thrown toward: +1 right, -1 left. */
  crashDir: number;
  /** Seconds of invincibility left after respawning (collisions are ignored). */
  invincibleTimer: number;
}

export function createPlayer(): Player {
  return {
    z: 0,
    x: 0,
    speed: 0,
    lean: 0,
    leanVel: 0,
    health: config.crash.maxHealth,
    crashTimer: 0,
    crashSpeed: 0,
    crashDir: 1,
    invincibleTimer: 0,
  };
}
