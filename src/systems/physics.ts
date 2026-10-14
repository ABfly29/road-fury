import { config } from '../config';
import type { Input } from '../core/input';
import type { Player } from '../entities/player';
import type { Track } from '../world/track';

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** Advance the player by one fixed step. All tuning comes from config.physics. */
export function updatePlayer(p: Player, input: Pick<Input, 'isDown'>, track: Track, dt: number): void {
  const c = config.physics;
  if (p.crashTimer > 0) return; // controls are locked during a wipeout
  const offRoad = Math.abs(p.x) > 1;
  const cap = offRoad ? c.maxSpeed * c.offRoadLimit : c.maxSpeed;

  // Speed: brake beats throttle; with neither the bike coasts down.
  if (input.isDown('brake')) p.speed -= c.brake * dt;
  else if (input.isDown('accelerate')) {
    if (p.speed < cap) p.speed = Math.min(cap, p.speed + c.accel * dt);
  } else p.speed -= c.coastDecel * dt;
  // Off-road: bleed speed down to the cap rather than stopping dead.
  if (p.speed > cap) p.speed = Math.max(cap, p.speed - c.offRoadDecel * dt);
  p.speed = clamp(p.speed, 0, c.maxSpeed);

  const speedPercent = p.speed / c.maxSpeed;
  const steer = (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0);
  const curve = track.segmentAt(p.z).curve;

  // Steering strength scales with speed; curves push the bike outward (positive curve = right bend).
  const step = c.steerRate * speedPercent * dt;
  p.x += steer * step - step * speedPercent * curve * c.centrifugal;
  p.x = clamp(p.x, -c.maxX, c.maxX);

  p.z += p.speed * dt;

  // Lean into steering and into the bend; none when stopped.
  const ramp = Math.min(1, speedPercent / c.leanSpeedRamp);
  const target = clamp((steer * c.leanSteer + curve * c.leanCurve) * ramp, -1, 1);
  p.lean += (target - p.lean) * Math.min(1, c.leanResponse * dt);
}
