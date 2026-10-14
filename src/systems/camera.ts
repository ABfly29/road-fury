import { config } from '../config';
import { playerZ, type CameraState } from '../entities/camera';
import type { Player } from '../entities/player';
import type { Track } from '../world/track';

/** The camera trails the player by playerZ and follows the player's x. */
export function updateCamera(cam: CameraState, player: Player, track: Track, dt: number): void {
  cam.position = player.z - playerZ;
  cam.x = player.x;

  // Mountains shift against the bend: a right curve (positive) pushes them left.
  const curve = track.segmentAt(player.z).curve;
  const speedPercent = player.speed / config.physics.maxSpeed;
  config.background.layers.forEach((layer, i) => {
    cam.parallax[i] += curve * speedPercent * layer.speed * dt;
  });
}
