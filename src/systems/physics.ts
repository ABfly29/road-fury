import { config } from '../config';
import type { InputAxes } from '../core/input';
import type { Player } from '../entities/player';
import type { Track } from '../world/track';

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** Advance the player by one fixed step. Reads only the smoothed input axes; tuning is in config.physics / config.input. */
export function updatePlayer(p: Player, axes: InputAxes, track: Track, dt: number): void {
  const c = config.physics;
  const ic = config.input;
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

  // Steering strength scales with speed but loses effectiveness toward top speed;
  // curves push the bike outward (positive curve = right bend) by the unreduced step.
  const step = c.steerRate * speedPercent * dt;
  const effectiveness = 1 - ic.steerSpeedLoss * speedPercent;
  p.x += axes.steer * step * effectiveness - step * speedPercent * curve * c.centrifugal;
  p.x = clamp(p.x, -c.maxX, c.maxX);

  p.z += p.speed * dt;

  // Lean chases its target through a slightly underdamped spring, so it eases in and overshoots a little.
  const ramp = Math.min(1, speedPercent / c.leanSpeedRamp);
  const target = clamp((axes.steer * c.leanSteer + curve * c.leanCurve) * ramp, -1, 1);
  const w = ic.leanFrequency;
  p.leanVel += (w * w * (target - p.lean) - 2 * ic.leanDamping * w * p.leanVel) * dt;
  p.lean = clamp(p.lean + p.leanVel * dt, -ic.leanMax, ic.leanMax);
}
