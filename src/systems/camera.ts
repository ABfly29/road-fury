import { config } from '../config';
import type { InputAxes } from '../core/input';
import { playerZForFov, type CameraState } from '../entities/camera';
import type { Player } from '../entities/player';
import type { Track } from '../world/track';

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** The camera trails the player and follows x, with a little roll, sideways shift and FOV kick. */
export function updateCamera(cam: CameraState, player: Player, track: Track, axes: InputAxes, dt: number): void {
  const ic = config.input;
  const speedPercent = player.speed / config.physics.maxSpeed;
  const motion = Math.min(1, speedPercent / config.physics.leanSpeedRamp); // no sway when stopped

  // FOV kick while accelerating hard, fading out as the bike nears top speed.
  const throttle = axes.throttle * (1 - axes.brake);
  const kickTarget = ic.fovKick * throttle * (1 - speedPercent);
  cam.fovKick += (kickTarget - cam.fovKick) * Math.min(1, ic.fovKickResponse * dt);
  cam.fov = config.camera.fov + cam.fovKick;

  cam.position = player.z - playerZForFov(cam.fov);
  cam.x = player.x + (axes.steer * ic.camXSteer + player.lean * ic.camXLean) * motion;
  cam.roll = clamp(player.lean, -1, 1) * ((ic.rollMaxDeg * Math.PI) / 180);

  // Mountains shift against the bend: a right curve (positive) pushes them left.
  const curve = track.segmentAt(player.z).curve;
  config.background.layers.forEach((layer, i) => {
    cam.parallax[i] += curve * speedPercent * layer.speed * dt;
  });
}
