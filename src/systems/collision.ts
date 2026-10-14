import { config } from '../config';
import type { Player } from '../entities/player';
import type { SceneryItem } from '../world/scenery';
import type { Track } from '../world/track';

export interface Hit {
  item: SceneryItem;
  /** Total distance along the road where the object stands. */
  z: number;
}

const { segmentLength } = config.road;
const mod = (a: number, n: number) => ((a % n) + n) % n;

/** First scenery object the bike passed through while moving from prevZ to player.z, if any. */
export function findCollision(p: Player, prevZ: number, track: Track): Hit | null {
  if (p.z <= prevZ || p.invincibleTimer > 0) return null;
  const segs = track.segments;

  for (let k = Math.floor(prevZ / segmentLength); k <= Math.floor(p.z / segmentLength); k++) {
    for (const item of segs[mod(k, segs.length)].sprites) {
      const width = config.scenery.types[item.type].collisionWidth;
      if (width <= 0) continue;
      const z = (k + item.frac) * segmentLength;
      if (z <= prevZ || z > p.z) continue;
      if (Math.abs(p.x - item.offset) < (width + config.collision.bikeWidth) / 2) return { item, z };
    }
  }
  return null;
}

/** Crash at speed; just stop (and get nudged clear) when slow. */
export function resolveCollision(p: Player, hit: Hit): void {
  if (p.speed > config.collision.crashSpeedFraction * config.physics.maxSpeed) {
    startCrash(p, hit);
  } else {
    stopAt(p, hit);
  }
}

function startCrash(p: Player, hit: Hit): void {
  p.crashTimer = config.crash.duration;
  p.crashSpeed = p.speed / config.physics.maxSpeed;
  p.crashDir = p.x >= hit.item.offset ? 1 : -1; // thrown away from the object
  p.health = Math.max(0, p.health - config.crash.damage);
  p.speed = 0;
  p.lean = 0;
  p.leanVel = 0;
  p.z = hit.z;
}

function stopAt(p: Player, hit: Hit): void {
  const { maxX } = config.physics;
  const reach = (config.scenery.types[hit.item.type].collisionWidth + config.collision.bikeWidth) / 2 + config.collision.nudge;
  const preferred = p.x >= hit.item.offset ? 1 : -1;

  // Nudge to the side the bike came from, or the other side if that would leave the clamp range.
  let x = hit.item.offset + preferred * reach;
  if (Math.abs(x) > maxX) x = hit.item.offset - preferred * reach;

  p.x = Math.min(Math.max(x, -maxX), maxX);
  p.speed = 0;
  p.z = hit.z - 1;
}
