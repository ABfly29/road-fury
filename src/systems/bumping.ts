import { config } from '../config';
import type { Player } from '../entities/player';
import type { Rival } from '../entities/rival';

/** Anything with a road position that can bump. The player and rivals both fit. */
interface Rider {
  z: number;
  x: number;
  speed: number;
}

/**
 * Riders that overlap exchange a shove: the faster one drops to the slower one's speed, and both are
 * pushed apart sideways. The player is a ghost while wiped out or invincible after a respawn.
 */
export function resolveBumps(player: Player, rivals: Rival[], dt: number): void {
  const b = config.bump;
  const riders: Rider[] = [...rivals];
  if (player.crashTimer <= 0 && player.invincibleTimer <= 0) riders.push(player);

  for (let i = 0; i < riders.length; i++) {
    for (let j = i + 1; j < riders.length; j++) {
      const a = riders[i];
      const o = riders[j];
      const dx = a.x - o.x;
      if (Math.abs(a.z - o.z) >= b.depth || Math.abs(dx) >= b.width) continue;

      if (a.speed > o.speed) a.speed = o.speed;
      else o.speed = a.speed;

      // Push each away from the other; if dead level, the earlier one goes right.
      const dir = dx !== 0 ? Math.sign(dx) : 1;
      a.x += dir * b.pushSpeed * dt;
      o.x -= dir * b.pushSpeed * dt;
      const limit = config.rivals.maxX;
      if ('lane' in a) a.x = Math.min(Math.max(a.x, -limit), limit);
      if ('lane' in o) o.x = Math.min(Math.max(o.x, -limit), limit);
    }
  }
  player.x = Math.min(Math.max(player.x, -config.physics.maxX), config.physics.maxX);
}
