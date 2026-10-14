import { config } from '../config';
import type { Player } from '../entities/player';

const { width: W, height: H } = config.render;

/** Shake the scene while the bike is wiped out. Call between ctx.save() and ctx.restore(). */
export function applyShake(ctx: CanvasRenderingContext2D, player: Player): void {
  if (player.crashTimer <= 0) return;
  const c = config.crash;
  const elapsed = c.duration - player.crashTimer;
  const amp = c.shakeAmplitude * (1 - elapsed / c.duration) ** 2;
  ctx.translate(
    Math.round(amp * Math.sin(elapsed * c.shakeFrequency)),
    Math.round(amp * Math.sin(elapsed * c.shakeFrequency * 1.3 + 1)),
  );
}

/**
 * Roll the horizon about the screen centre (positive roll = leaning right, so the world turns
 * counter-clockwise), scaled up just enough that the rotated corners stay covered.
 */
export function applyRoll(ctx: CanvasRenderingContext2D, roll: number): void {
  const a = Math.abs(roll);
  const cover = Math.cos(a) + Math.sin(a) * Math.max(W / H, H / W);
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-roll);
  ctx.scale(cover, cover);
  ctx.translate(-W / 2, -H / 2);
}

/**
 * The scene is drawn axis-aligned into an offscreen canvas, then blitted once with the shake and
 * roll applied. Rotating the context itself would push every road fill onto a much slower path.
 */
export class SceneBuffer {
  readonly canvas = document.createElement('canvas');
  readonly ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = this.canvas.getContext('2d')!;
  }

  /** Draw the finished scene onto `target`, shaken and rolled. */
  present(target: CanvasRenderingContext2D, player: Player, roll: number): void {
    target.save();
    applyShake(target, player);
    if (roll !== 0) applyRoll(target, roll);
    target.imageSmoothingEnabled = true;
    target.drawImage(this.canvas, 0, 0);
    target.restore();
  }
}
