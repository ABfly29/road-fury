import { Input } from './input';
import { startLoop } from './loop';
import { FpsCounter } from '../render/fps';
import { drawHealth, drawSpeed, drawWipeout } from '../render/hud';
import { Background } from '../render/background';
import { BikeRenderer } from '../render/bikeRenderer';
import { RoadRenderer } from '../render/roadRenderer';
import { createCamera } from '../entities/camera';
import { createPlayer } from '../entities/player';
import { updateCamera } from '../systems/camera';
import { findCollision, resolveCollision } from '../systems/collision';
import { updateCrash } from '../systems/crash';
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
    const prevZ = this.player.z;
    updatePlayer(this.player, this.input, this.track, dt);
    const hit = findCollision(this.player, prevZ, this.track);
    if (hit) resolveCollision(this.player, hit);
    updateCrash(this.player, dt);
    updateCamera(this.camera, this.player, this.track, dt);
  }

  /** Drawing only: no state mutation of the simulation here. */
  private render(): void {
    const { ctx, player } = this;
    // Camera shake moves the whole scene (not the HUD); the strip it uncovers stays dark.
    ctx.fillStyle = config.render.backgroundColor;
    ctx.fillRect(0, 0, config.render.width, config.render.height);
    ctx.save();
    if (player.crashTimer > 0) {
      const c = config.crash;
      const elapsed = c.duration - player.crashTimer;
      const amp = c.shakeAmplitude * (1 - elapsed / c.duration) ** 2;
      ctx.translate(
        Math.round(amp * Math.sin(elapsed * c.shakeFrequency)),
        Math.round(amp * Math.sin(elapsed * c.shakeFrequency * 1.3 + 1)),
      );
    }
    this.background.draw(ctx, this.camera.parallax);
    this.road.render(this.camera, [this.bike]);
    ctx.restore();

    drawSpeed(ctx, player);
    drawHealth(ctx, player);
    drawWipeout(ctx, player);
    this.fps.tick(performance.now());
    this.fps.draw(this.ctx);
  }
}
