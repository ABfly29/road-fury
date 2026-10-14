import { config } from '../config';
import type { InputAxes } from '../core/input';
import type { CameraState } from '../entities/camera';
import type { Player } from '../entities/player';
import type { RaceState } from '../entities/race';
import { drawDebugOverlay } from './debugOverlay';
import type { FpsCounter } from './fps';
import { drawHealth, drawSpeed, drawWipeout } from './hud';
import { drawCountdown, drawRaceInfo, drawResults } from './raceHud';

export interface HudState {
  player: Player;
  race: RaceState;
  camera: CameraState;
  fps?: FpsCounter;
  /** When given, the F3 axis overlay is drawn. */
  debugAxes?: InputAxes;
}

/**
 * Every HUD element, laid out in the 640x360 space (config.hud.width/height) and scaled up to the canvas,
 * so fonts and positions keep their tuned look at any render resolution. The HUD never shakes or rolls.
 */
export function drawHud(ctx: CanvasRenderingContext2D, state: HudState): void {
  const { player, race, camera, fps, debugAxes } = state;
  ctx.save();
  ctx.scale(config.render.hudScale, config.render.hudScale);
  drawSpeed(ctx, player);
  drawHealth(ctx, player);
  drawWipeout(ctx, player);
  drawRaceInfo(ctx, race, player.z);
  drawCountdown(ctx, race);
  drawResults(ctx, race);
  if (fps) {
    fps.tick(performance.now());
    fps.draw(ctx);
  }
  if (debugAxes) drawDebugOverlay(ctx, debugAxes, player, camera);
  ctx.restore();
}
