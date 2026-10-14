import { config } from '../config';

/** Counts rendered frames and draws the averaged FPS on the canvas. */
export class FpsCounter {
  private frames = 0;
  private windowStart = 0;
  private fps = 0;

  tick(nowMs: number): void {
    if (this.windowStart === 0) this.windowStart = nowMs;
    this.frames++;
    const elapsed = (nowMs - this.windowStart) / 1000;
    if (elapsed >= config.hud.fpsSampleWindow) {
      this.fps = this.frames / elapsed;
      this.frames = 0;
      this.windowStart = nowMs;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.font = config.hud.fpsFont;
    ctx.fillStyle = config.hud.fpsColor;
    ctx.fillText(`FPS: ${Math.round(this.fps)}`, config.hud.fpsX, config.hud.fpsY);
  }
}
