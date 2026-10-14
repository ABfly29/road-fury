import { config } from '../config';
import type { Player } from '../entities/player';

/** Run the wipeout countdown, respawn when it ends, and tick down invincibility. */
export function updateCrash(p: Player, dt: number): void {
  if (p.crashTimer > 0) {
    p.crashTimer -= dt;
    if (p.crashTimer <= 0) {
      p.crashTimer = 0;
      p.x = config.crash.respawnX;
      p.speed = 0;
      p.lean = 0;
      p.leanVel = 0;
      p.invincibleTimer = config.crash.invincibleTime;
    }
  } else if (p.invincibleTimer > 0) {
    p.invincibleTimer = Math.max(0, p.invincibleTimer - dt);
  }
}
