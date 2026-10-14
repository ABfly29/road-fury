import { Input } from './input';
import { startLoop } from './loop';
import { FpsCounter } from '../render/fps';
import { config } from '../config';

export class Game {
  readonly input = new Input();
  private ctx: CanvasRenderingContext2D;
  private fps = new FpsCounter();

  constructor(private canvas: HTMLCanvasElement) {
    canvas.width = config.render.width;
    canvas.height = config.render.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas not supported');
    this.ctx = ctx;
  }

  start(): void {
    startLoop({
      update: (dt) => this.update(dt),
      render: () => this.render(),
    });
  }

  /** Simulation only: no drawing here. */
  private update(_dt: number): void {
    // systems update goes here
  }

  /** Drawing only: no state mutation of the simulation here. */
  private render(): void {
    const { ctx } = this;
    ctx.fillStyle = config.render.backgroundColor;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.fps.tick(performance.now());
    this.fps.draw(ctx);
  }
}
