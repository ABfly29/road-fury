import { Input } from './input';
import { startLoop } from './loop';
import { FpsCounter } from '../render/fps';
import { Background } from '../render/background';
import { RoadRenderer } from '../render/roadRenderer';
import { createCamera } from '../entities/camera';
import { updateCamera } from '../systems/cameraControl';
import { createSampleTrack } from '../world/track';
import { config } from '../config';

export class Game {
  readonly input = new Input();
  private ctx: CanvasRenderingContext2D;
  private fps = new FpsCounter();
  private track = createSampleTrack();
  private camera = createCamera();
  private background: Background;
  private road: RoadRenderer;

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = config.render.width;
    canvas.height = config.render.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas not supported');
    this.ctx = ctx;
    this.background = new Background(ctx);
    this.road = new RoadRenderer(ctx, this.track);
  }

  start(): void {
    startLoop({
      update: (dt) => this.update(dt),
      render: () => this.render(),
    });
  }

  /** Simulation only: no drawing here. */
  private update(dt: number): void {
    updateCamera(this.camera, this.input, this.track, dt);
  }

  /** Drawing only: no state mutation of the simulation here. */
  private render(): void {
    this.background.draw(this.ctx, this.camera.parallax);
    this.road.render(this.camera);
    this.fps.tick(performance.now());
    this.fps.draw(this.ctx);
  }
}
