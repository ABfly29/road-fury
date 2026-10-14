import { config } from '../config';
import type { InputAxes } from '../core/input';
import type { Player } from '../entities/player';
import type { Track } from '../world/track';

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/**
 * New lateral position after one step of steering. Steering strength scales with speed but loses
 * effectiveness toward top speed; curves push the bike outward (positive curve = right bend) by the
 * unreduced step. Not clamped: callers clamp to their own range. Rivals use this too: same rules as the player.
 */
export function stepLateral(x: number, steer: number, speedPercent: number, curve: number, dt: number): number {
  const c = config.physics;
  const step = c.steerRate * speedPercent * dt;
  const effectiveness = 1 - config.input.steerSpeedLoss * speedPercent;
  return x + steer * step * effectiveness - step * speedPercent * curve * c.centrifugal;
}

/** Lean chases its target through a slightly underdamped spring, so it eases in and overshoots a little. */
export function stepLean(b: { lean: number; leanVel: number }, steer: number, curve: number, speedPercent: number, dt: number): void {
  const c = config.physics;
  const ic = config.input;
  const ramp = Math.min(1, speedPercent / c.leanSpeedRamp);
  const target = clamp((steer * c.leanSteer + curve * c.leanCurve) * ramp, -1, 1);
  const w = ic.leanFrequency;
  b.leanVel += (w * w * (target - b.lean) - 2 * ic.leanDamping * w * b.leanVel) * dt;
  b.lean = clamp(b.lean + b.leanVel * dt, -ic.leanMax, ic.leanMax);
}

/** Advance the player by one fixed step. Reads only the smoothed input axes; tuning is in config.physics / config.input. */
export function updatePlayer(p: Player, axes: InputAxes, track: Track, dt: number): void {
  const c = config.physics;
  if (p.crashTimer > 0) return; // controls are locked during a wipeout
  const offRoad = Math.abs(p.x) > 1;
  const cap = offRoad ? c.maxSpeed * c.offRoadLimit : c.maxSpeed;

  // Speed: brake beats throttle; whatever neither asks for is coast.
  const throttle = axes.throttle * (1 - axes.brake);
  if (p.speed < cap) p.speed = Math.min(cap, p.speed + c.accel * throttle * dt);
  p.speed -= c.brake * axes.brake * dt;
  p.speed -= c.coastDecel * (1 - throttle) * (1 - axes.brake) * dt;
  // Off-road: bleed speed down to the cap rather than stopping dead.
  if (p.speed > cap) p.speed = Math.max(cap, p.speed - c.offRoadDecel * dt);
  p.speed = clamp(p.speed, 0, c.maxSpeed);

  const speedPercent = p.speed / c.maxSpeed;
  const curve = track.segmentAt(p.z).curve;

  p.x = clamp(stepLateral(p.x, axes.steer, speedPercent, curve, dt), -c.maxX, c.maxX);
  p.z += p.speed * dt;
  stepLean(p, axes.steer, curve, speedPercent, dt);
}
