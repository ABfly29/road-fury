import { Input, ZERO_AXES } from './input';
import { startLoop } from './loop';
import { FpsCounter } from '../render/fps';
import { drawHud } from '../render/hudLayer';
import { Background } from '../render/background';
import { BikeRenderer } from '../render/bikeRenderer';
import { RoadRenderer } from '../render/roadRenderer';
import { SceneBuffer } from '../render/screenFx';
import { createCamera } from '../entities/camera';
import { createPlayer } from '../entities/player';
import { createRace } from '../entities/race';
import { createRivals } from '../entities/rival';
import { updateCamera } from '../systems/camera';
import { resolveBumps } from '../systems/bumping';
import { findCollision, resolveCollision } from '../systems/collision';
import { updateCrash } from '../systems/crash';
import { updatePlayer } from '../systems/physics';
import { finishedAxes, updateCountdown, updateRace } from '../systems/race';
import { RivalAI } from '../systems/rivalAI';
import { createSampleTrack } from '../world/track';
import { config } from '../config';

const { width: W, height: H } = config.render;

export class Game {
  readonly input = new Input();
  private ctx: CanvasRenderingContext2D;
  private fps = new FpsCounter();
  private track = createSampleTrack();
  private scene = new SceneBuffer();
  private background: Background;
  private road: RoadRenderer;

  // Everything below is rebuilt by restart().
  private player = createPlayer();
  private camera = createCamera();
  private rivals = createRivals();
  private ai = new RivalAI(this.rivals);
  private race = createRace(this.track.length, this.rivals.length + 1);
  private sprites = this.makeSprites();

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

  /** The player's bike (centred on screen) and one bike per rival (placed on the road), all drawn in the road's sprite pass. */
  private makeSprites() {
    return [
      new BikeRenderer(this.player),
      ...this.rivals.map((r) => new BikeRenderer(r, { colors: r.colors, onRoad: true, lift: 0 })),
    ];
  }

  /** Back to the grid for another race. */
  private restart(): void {
    this.player = createPlayer();
    this.camera = createCamera();
    this.rivals = createRivals();
    this.ai = new RivalAI(this.rivals);
    this.race = createRace(this.track.length, this.rivals.length + 1);
    this.sprites = this.makeSprites();
    updateCamera(this.camera, this.player, this.track, ZERO_AXES, 0);
  }

  /** Simulation only: no drawing here. */
  private update(dt: number): void {
    const { player, rivals, race, track } = this;
    this.input.update(dt);
    if (race.phase === 'finished' && race.results.every((r) => r.time !== null) && this.input.consumeConfirm()) {
      this.restart();
      return;
    }

    updateCountdown(race, dt);

    // Bikes are locked on the grid until GO.
    if (race.phase !== 'countdown') {
      const axes = race.finishTimes.player !== undefined ? finishedAxes(player) : this.input;
      const prevZ = player.z;
      updatePlayer(player, axes, track, dt);
      const hit = findCollision(player, prevZ, track);
      if (hit) resolveCollision(player, hit);
      updateCrash(player, dt);

      this.ai.update(rivals, player, track, race.finishTimes, dt);
      resolveBumps(player, rivals, dt);
      updateRace(race, player, rivals, dt);
    }

    updateCamera(this.camera, player, track, race.phase === 'countdown' ? ZERO_AXES : this.input, dt);
  }

  /** Drawing only: no state mutation of the simulation here. */
  private render(): void {
    const { ctx, player, camera, race } = this;
    ctx.fillStyle = config.render.backgroundColor;
    ctx.fillRect(0, 0, W, H);

    // The scene is drawn flat, then blitted with the crash shake and the roll; the HUD stays level.
    this.background.draw(this.scene.ctx, camera.parallax);
    this.road.render(camera, this.sprites);
    this.scene.present(ctx, player, camera.roll);

    drawHud(ctx, { player, race, camera, fps: this.fps, debugAxes: this.input.debugOverlay ? this.input : undefined });
  }
}
