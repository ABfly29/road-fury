import { config } from '../config';

export interface CameraState {
  /** Total distance travelled along the road (never wrapped). */
  position: number;
  /** World units per second. */
  speed: number;
  /** Sideways offset in road half-widths (0 = road center). */
  x: number;
  /** Per-layer parallax offsets in layer widths, one per mountain layer. */
  parallax: number[];
}

export function createCamera(): CameraState {
  return { position: 0, speed: 0, x: 0, parallax: config.background.layers.map(() => 0) };
}
