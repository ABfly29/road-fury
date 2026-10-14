import { config } from '../config';
import type { Input } from '../core/input';
import type { CameraState } from '../entities/camera';
import type { Track } from '../world/track';

/** Temporary drive controls: up/down change speed, left/right move sideways. */
export function updateCamera(cam: CameraState, input: Input, track: Track, dt: number): void {
  const c = config.camera;

  if (input.isDown('accelerate')) cam.speed += c.accel * dt;
  else if (input.isDown('brake')) cam.speed -= c.brake * dt;
  else cam.speed -= c.coastDecel * dt;
  cam.speed = Math.min(Math.max(cam.speed, 0), c.maxSpeed);

  cam.position += cam.speed * dt;

  if (input.isDown('left')) cam.x -= c.lateralSpeed * dt;
  if (input.isDown('right')) cam.x += c.lateralSpeed * dt;
  cam.x = Math.min(Math.max(cam.x, -c.maxOffset), c.maxOffset);

  // Mountains shift against the bend: a right curve (positive) pushes them left.
  const curve = track.segmentAt(cam.position).curve;
  const speedPercent = cam.speed / c.maxSpeed;
  config.background.layers.forEach((layer, i) => {
    cam.parallax[i] += curve * speedPercent * layer.speed * dt;
  });
}
