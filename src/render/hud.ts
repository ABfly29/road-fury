import { config } from '../config';
import type { Player } from '../entities/player';

/** Speed readout in mph (top speed = config.hud.topSpeedMph), bottom right. */
export function drawSpeed(ctx: CanvasRenderingContext2D, player: Player): void {
  const h = config.hud;
  const mph = Math.round((player.speed / config.physics.maxSpeed) * h.topSpeedMph);
  const x = config.render.width - h.speedRight;
  const y = config.render.height - h.speedBottom;

  ctx.font = h.speedFont;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = h.speedShadow;
  ctx.fillText(`${mph} mph`, x + 1, y + 1);
  ctx.fillStyle = h.speedColor;
  ctx.fillText(`${mph} mph`, x, y);
  ctx.textAlign = 'left';
}
