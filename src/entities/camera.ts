import { config } from '../config';

/** Distance from the eye to the projection plane for a field of view in degrees. */
export const depthForFov = (fovDeg: number) => 1 / Math.tan(((fovDeg / 2) * Math.PI) / 180);

/** The player sits this far ahead of the camera, so the bike lands at the bottom of the screen (any FOV). */
export const playerZForFov = (fovDeg: number) => config.camera.height * depthForFov(fovDeg);

export interface CameraState {
  /** Total distance travelled by the camera (player.z - playerZ; can be negative at the start). */
  position: number;
  /** Sideways offset in road half-widths (follows the player, nudged by steer and lean). */
  x: number;
  /** Current field of view in degrees (base FOV plus the acceleration kick). */
  fov: number;
  /** Extra FOV from accelerating hard, in degrees. */
  fovKick: number;
  /** Horizon roll in radians; positive = leaning right. */
  roll: number;
  /** Per-layer parallax offsets in layer widths, one per mountain layer. */
  parallax: number[];
}

export function createCamera(): CameraState {
  return {
    position: 0,
    x: 0,
    fov: config.camera.fov,
    fovKick: 0,
    roll: 0,
    parallax: config.background.layers.map(() => 0),
  };
}
