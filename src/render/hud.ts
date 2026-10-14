import { config } from '../config';
import type { Player } from '../entities/player';

/** Speed readout in mph (top speed = config.hud.topSpeedMph), bottom right. */
export function drawSpeed(ctx: CanvasRenderingContext2D, player: Player): void {
  const h = config.hud;
  const mph = Math.round((player.speed / config.physics.maxSpeed) * h.topSpeedMph);
  const x = config.hud.width - h.speedRight;
  const y = config.hud.height - h.speedBottom;

  ctx.font = h.speedFont;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = h.speedShadow;
  ctx.fillText(`${mph} mph`, x + 1, y + 1);
  ctx.fillStyle = h.speedColor;
  ctx.fillText(`${mph} mph`, x, y);
  ctx.textAlign = 'left';
}

/** Health bar, top right. Shrinks (and changes colour) with each crash. */
export function drawHealth(ctx: CanvasRenderingContext2D, player: Player): void {
  const h = config.hud;
  const fraction = Math.min(1, Math.max(0, player.health / config.crash.maxHealth));
  const x = config.hud.width - h.healthRight - h.healthWidth;
  const y = h.healthTop;

  ctx.fillStyle = h.healthBack;
  ctx.fillRect(x, y, h.healthWidth, h.healthHeight);
  ctx.fillStyle = fraction < h.healthLowBelow ? h.healthLow : fraction < h.healthWarnBelow ? h.healthWarn : h.healthGood;
  ctx.fillRect(x, y, Math.round(h.healthWidth * fraction), h.healthHeight);
  ctx.strokeStyle = h.healthBorder;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 0.5, y - 0.5, h.healthWidth + 1, h.healthHeight + 1);

  ctx.font = h.labelFont;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = h.speedColor;
  ctx.fillText('HEALTH', x + h.healthWidth, y - 4);
  ctx.textAlign = 'left';
}

/** Big "WIPEOUT!" message while the bike is crashed. */
export function drawWipeout(ctx: CanvasRenderingContext2D, player: Player): void {
  if (player.crashTimer <= 0) return;
  const h = config.hud;
  const elapsed = config.crash.duration - player.crashTimer;
  const pop = 1 + 0.5 * (1 - Math.min(1, elapsed / h.wipeoutPop)) ** 2;
  const fadeOut = Math.min(1, player.crashTimer / 0.4);

  ctx.save();
  ctx.translate(config.hud.width / 2, config.hud.height * h.wipeoutY);
  ctx.scale(pop, pop);
  ctx.globalAlpha = fadeOut;
  ctx.font = h.wipeoutFont;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 8;
  ctx.strokeStyle = h.wipeoutOutline;
  ctx.strokeText(h.wipeoutText, 0, 0);
  ctx.fillStyle = h.wipeoutColor;
  ctx.fillText(h.wipeoutText, 0, 0);
  ctx.restore();
}
