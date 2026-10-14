import { config } from '../config';

/** Distance from the eye to the projection plane, from the field of view. */
export const cameraDepth = 1 / Math.tan(((config.camera.fov / 2) * Math.PI) / 180);

/** The player sits this far ahead of the camera, so the bike lands at the bottom of the screen. */
export const playerZ = config.camera.height * cameraDepth;

export interface CameraState {
  /** Total distance travelled by the camera (player.z - playerZ; can be negative at the start). */
  position: number;
  /** Sideways offset in road half-widths (follows the player). */
  x: number;
  /** Per-layer parallax offsets in layer widths, one per mountain layer. */
  parallax: number[];
}

export function createCamera(): CameraState {
  return { position: 0, x: 0, parallax: config.background.layers.map(() => 0) };
}
