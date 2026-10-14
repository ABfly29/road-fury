import { config } from '../config';
import { mulberry32 } from '../core/random';
import type { Player } from '../entities/player';
import type { Rival } from '../entities/rival';
import type { Track } from '../world/track';
import { stepLateral, stepLean } from './physics';

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Something a rival has to steer around: lateral centre and half-width in road half-widths. */
interface Obstacle {
  x: number;
  half: number;
  speed: number;
  /** Distance ahead of the rival (world units); negative = slightly behind, alongside. */
  dz: number;
}

/** Drives the rivals: lane wandering, curve braking, steering around traffic and scenery, rubber band. */
export class RivalAI {
  private readonly rngs: (() => number)[];

  constructor(rivals: readonly Rival[]) {
    this.rngs = rivals.map((r) => mulberry32(config.rivals.seed + 1000 + r.id));
  }

  /** Advance every rival one fixed step. `finished` says which riders have already crossed the line. */
  update(
    rivals: Rival[],
    player: Player,
    track: Track,
    finished: Readonly<Record<string, number>>,
    dt: number,
  ): void {
    for (const rival of rivals) {
      this.step(rival, rivals, player, track, finished[String(rival.id)] !== undefined, dt);
    }
  }

  private step(rival: Rival, all: readonly Rival[], player: Player, track: Track, done: boolean, dt: number): void {
    const c = config.rivals;
    const p = config.physics;
    const segLen = config.road.segmentLength;
    const rng = this.rngs[rival.id];

    // --- Target speed: personal pace, held down by the curves ahead (it must be able to brake in time),
    // then nudged by the rubber band.
    const brake = p.brake * c.brakeFraction;
    let curveCap = Infinity;
    for (let k = 0; k <= c.curveLookahead; k += 2) {
      const curve = Math.abs(track.segmentAt(rival.z + k * segLen).curve);
      const hold = Math.min(1, 1 / (p.centrifugal * curve + config.input.steerSpeedLoss)) * c.curveMargin * p.maxSpeed;
      // Fastest speed from which braking still brings us down to `hold` after k segments.
      curveCap = Math.min(curveCap, Math.sqrt(hold * hold + 2 * brake * k * segLen));
    }
    const curveFactor = Math.min(1, curveCap / (rival.pace * p.maxSpeed));

    const rel = rival.z - player.z;
    const rb = c.rubber;
    let rubber = 1;
    if (rel > rb.distance) rubber = 1 + (rb.ahead - 1) * clamp((rel - rb.distance) / rb.ramp, 0, 1);
    else if (rel < -rb.distance) rubber = 1 + (rb.behind - 1) * clamp((-rel - rb.distance) / rb.ramp, 0, 1);

    let target = Math.min(c.maxSpeedFraction, rival.pace * curveFactor * rubber) * p.maxSpeed;
    if (done) target = rival.pace * config.race.finishCruise * p.maxSpeed;

    // --- Obstacles within the lookahead: other riders and any scenery that reaches into their lanes.
    const lookahead = Math.max(c.lookahead, rival.speed * c.lookaheadTime);
    const obstacles: Obstacle[] = [];
    const consider = (z: number, x: number, speed: number) => {
      const dz = z - rival.z;
      if (dz > -c.alongside && dz <= lookahead) obstacles.push({ x, half: c.obstacleHalfWidth, speed, dz });
    };
    for (const other of all) if (other !== rival) consider(other.z, other.x, other.speed);
    if (player.crashTimer <= 0) consider(player.z, player.x, player.speed);

    const segs = track.segments;
    for (let k = Math.floor(rival.z / segLen); k <= Math.floor((rival.z + lookahead) / segLen); k++) {
      for (const item of segs[mod(k, segs.length)].sprites) {
        const width = config.scenery.types[item.type].collisionWidth;
        if (width <= 0 || Math.abs(item.offset) - width / 2 > c.maxX + c.clearance) continue;
        const dz = (k + item.frac) * segLen - rival.z;
        if (dz > 0 && dz <= lookahead) obstacles.push({ x: item.offset, half: width / 2, speed: 0, dz });
      }
    }

    // A lane is blocked by something close, or by something slower that we are closing on.
    const blockers = (laneX: number) =>
      obstacles.filter(
        (o) =>
          Math.abs(o.x - laneX) < o.half + c.obstacleHalfWidth + c.clearance &&
          (o.dz < c.alongside + 150 || o.speed < rival.speed - 100),
      );

    // --- Lane choice: dodge when blocked, otherwise wander now and then.
    rival.laneTimer -= dt;
    const laneBlockers = blockers(c.lanes[rival.lane]);
    if (laneBlockers.length > 0) {
      let best = -1;
      let bestDist = Infinity;
      c.lanes.forEach((laneX, k) => {
        if (blockers(laneX).length === 0 && Math.abs(k - rival.lane) < bestDist) {
          best = k;
          bestDist = Math.abs(k - rival.lane);
        }
      });
      if (best >= 0) {
        rival.lane = best;
      } else {
        // Boxed in: tuck in behind the slowest thing in the way.
        const slowest = Math.min(...laneBlockers.map((o) => o.speed));
        const nearest = Math.min(...laneBlockers.map((o) => o.dz));
        if (nearest < lookahead * 0.6) target = Math.min(target, slowest * 0.97);
      }
    } else if (rival.laneTimer <= 0) {
      rival.laneTimer = c.laneChangeMin + rng() * (c.laneChangeMax - c.laneChangeMin);
      const options = [rival.lane - 1, rival.lane + 1].filter(
        (k) => k >= 0 && k < c.lanes.length && blockers(c.lanes[k]).length === 0,
      );
      if (options.length > 0) rival.lane = options[Math.floor(rng() * options.length)];
    }

    // Never close on something in our path faster than we could sidestep or brake for it.
    for (const o of obstacles) {
      if (o.dz > 0 && Math.abs(o.x - rival.x) < o.half + c.obstacleHalfWidth + c.clearance) {
        target = Math.min(target, o.speed + Math.max(0, (o.dz - config.bump.depth) / c.dodgeTime));
      }
    }

    // --- Speed: the player's acceleration, and a slightly softer brake.
    if (rival.speed < target) rival.speed = Math.min(target, rival.speed + p.accel * dt);
    else rival.speed = Math.max(target, rival.speed - brake * dt);

    // --- Steering: aim for the lane centre, cancelling the curve's outward push, then use the player's own lateral rules.
    const speedPercent = rival.speed / p.maxSpeed;
    const curve = track.segmentAt(rival.z).curve;
    const step = p.steerRate * speedPercent * dt;
    const authority = step * (1 - config.input.steerSpeedLoss * speedPercent);
    const wanted = clamp((c.lanes[rival.lane] - rival.x) * c.laneGain, -c.maxLateralSpeed, c.maxLateralSpeed) * dt;
    const push = step * speedPercent * curve * p.centrifugal;
    const steer = authority > 1e-9 ? clamp((wanted + push) / authority, -1, 1) : 0;

    rival.x = clamp(stepLateral(rival.x, steer, speedPercent, curve, dt), -c.maxX, c.maxX);
    rival.z += rival.speed * dt;
    stepLean(rival, steer, curve, speedPercent, dt);
  }
}
