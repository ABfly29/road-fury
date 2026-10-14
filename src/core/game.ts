import { Input } from './input';
import { startLoop } from './loop';
import { FpsCounter } from '../render/fps';
import { drawSpeed } from '../render/hud';
import { Background } from '../render/background';
import { BikeRenderer } from '../render/bikeRenderer';
import { RoadRenderer } from '../render/roadRenderer';
import { createCamera } from '../entities/camera';
import { createPlayer } from '../entities/player';
import { updateCamera } from '../systems/camera';
import { updatePlayer } from '../systems/physics';
import { createSampleTrack } from '../world/track';
import { config } from '../config';

export class Game {
  readonly input = new Input();
  private ctx: CanvasRenderingContext2D;
  private fps = new FpsCounter();
  private track = createSampleTrack();
  private player = createPlayer();
  private camera = createCamera();
  private background: Background;
  private road: RoadRenderer;
  private bike = new BikeRenderer(this.player);

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = config.render.width;
    canvas.height = config.render.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas not supported');
    this.ctx = ctx;
    this.background = new Background(ctx);
    this.road = new RoadRenderer(ctx, this.track);
    updateCamera(this.camera, this.player, this.track, 0);
  }

  start(): void {
    startLoop({
      update: (dt) => this.update(dt),
      render: () => this.render(),
    });
  }

  /** Simulation only: no drawing here. */
  private update(dt: number): void {
    updatePlayer(this.player, this.input, this.track, dt);
    updateCamera(this.camera, this.player, this.track, dt);
  }

  /** Drawing only: no state mutation of the simulation here. */
  private render(): void {
    this.background.draw(this.ctx, this.camera.parallax);
    this.road.render(this.camera, [this.bike]);
    drawSpeed(this.ctx, this.player);
    this.fps.tick(performance.now());
    this.fps.draw(this.ctx);
  }
}
