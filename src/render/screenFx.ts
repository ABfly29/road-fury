import { config } from '../config';
import type { Player } from '../entities/player';
import { rgba } from './color';

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

/**
 * Final-frame look, applied over the finished scene but under the HUD: a warm tint and light vignette (one multiply
 * layer) and a warm wash that glows a little more around the sun (one ordinary alpha layer). Both are painted once,
 * so each frame costs two full-screen blits.
 */
export class PostFx {
  private readonly multiply: HTMLCanvasElement;
  private readonly warm: HTMLCanvasElement;

  constructor() {
    const g = config.colorGrade;
    const sun = config.background.sun;

    // Multiply layer: the tint in the middle, darker toward the corners.
    this.multiply = document.createElement('canvas');
    this.multiply.width = W;
    this.multiply.height = H;
    const m = this.multiply.getContext('2d')!;
    const n = parseInt(g.tint.slice(1), 16);
    const tint = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    const edge = tint.map((c) => Math.round(c * (1 - g.vignette)));
    const half = Math.hypot(W, H) / 2;
    const vig = m.createRadialGradient(W / 2, H / 2, half * g.vignetteStart, W / 2, H / 2, half);
    vig.addColorStop(0, `rgb(${tint[0]}, ${tint[1]}, ${tint[2]})`);
    vig.addColorStop(1, `rgb(${edge[0]}, ${edge[1]}, ${edge[2]})`);
    m.fillStyle = `rgb(${tint[0]}, ${tint[1]}, ${tint[2]})`;
    m.fillRect(0, 0, W, H);
    m.fillStyle = vig;
    m.fillRect(0, 0, W, H);

    // Warm layer: an even wash plus a glow around the sun.
    this.warm = document.createElement('canvas');
    this.warm.width = W;
    this.warm.height = H;
    const w = this.warm.getContext('2d')!;
    w.fillStyle = rgba(g.warm, g.warmAlpha);
    w.fillRect(0, 0, W, H);
    const sx = sun.x * W;
    const sy = H / 2 - sun.above;
    const glow = w.createRadialGradient(sx, sy, 0, sx, sy, W * 0.9);
    glow.addColorStop(0, rgba(g.warm, g.warmGlow));
    glow.addColorStop(1, rgba(g.warm, 0));
    w.fillStyle = glow;
    w.fillRect(0, 0, W, H);
  }

  apply(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(this.multiply, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.warm, 0, 0);
    ctx.restore();
  }
}
