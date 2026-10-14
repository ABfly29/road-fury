import { Input, ZERO_AXES } from './input';
import { startLoop } from './loop';
import { FpsCounter } from '../render/fps';
import { drawDebugOverlay } from '../render/debugOverlay';
import { drawHealth, drawSpeed, drawWipeout } from '../render/hud';
import { Background } from '../render/background';
import { BikeRenderer } from '../render/bikeRenderer';
import { RoadRenderer } from '../render/roadRenderer';
import { SceneBuffer } from '../render/screenFx';
import { createCamera } from '../entities/camera';
import { createPlayer } from '../entities/player';
import { updateCamera } from '../systems/camera';
import { findCollision, resolveCollision } from '../systems/collision';
import { updateCrash } from '../systems/crash';
import { updatePlayer } from '../systems/physics';
import { createSampleTrack } from '../world/track';
import { config } from '../config';

const { width: W, height: H } = config.render;

export class Game {
  readonly input = new Input();
  private ctx: CanvasRenderingContext2D;
  private fps = new FpsCounter();
  private track = createSampleTrack();
  private player = createPlayer();
  private camera = createCamera();
  private scene = new SceneBuffer();
  private background: Background;
  private road: RoadRenderer;
  private bike = new BikeRenderer(this.player);

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas not supported');
    this.ctx = ctx;
    this.background = new Background(this.scene.ctx);
    this.road = new RoadRenderer(this.scene.ctx, this.track);
    updateCamera(this.camera, this.player, this.track, ZERO_AXES, 0);
  }

  start(): void {
    startLoop({
      update: (dt) => this.update(dt),
      render: () => this.render(),
    });
  }

  /** Simulation only: no drawing here. */
  private update(dt: number): void {
    this.input.update(dt);
    const prevZ = this.player.z;
    updatePlayer(this.player, this.input, this.track, dt);
    const hit = findCollision(this.player, prevZ, this.track);
    if (hit) resolveCollision(this.player, hit);
    updateCrash(this.player, dt);
    updateCamera(this.camera, this.player, this.track, this.input, dt);
  }

  /** Drawing only: no state mutation of the simulation here. */
  private render(): void {
    const { ctx, player, camera } = this;
    ctx.fillStyle = config.render.backgroundColor;
    ctx.fillRect(0, 0, W, H);

    // The scene is drawn flat, then blitted with the crash shake and the roll; the HUD stays level.
    this.background.draw(this.scene.ctx, camera.parallax);
    this.road.render(camera, [this.bike]);
    this.scene.present(ctx, player, camera.roll);

    drawSpeed(ctx, player);
    drawHealth(ctx, player);
    drawWipeout(ctx, player);
    this.fps.tick(performance.now());
    this.fps.draw(ctx);
    if (this.input.debugOverlay) drawDebugOverlay(ctx, this.input, player, camera);
  }
}
