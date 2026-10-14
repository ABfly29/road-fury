import { config } from '../config';
import type { RaceState } from '../entities/race';

const { width: W, height: H } = config.hud;

/** m:ss.t */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`;
}

function outlined(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fill: string, width = 4): void {
  ctx.lineJoin = 'round';
  ctx.lineWidth = width;
  ctx.strokeStyle = config.hud.wipeoutOutline;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

/** "POS 3/8" at the top centre, plus lap and race time bottom left. */
export function drawRaceInfo(ctx: CanvasRenderingContext2D, race: RaceState, playerZ: number): void {
  const h = config.hud;
  ctx.textBaseline = 'alphabetic';

  ctx.font = h.positionFont;
  ctx.textAlign = 'center';
  outlined(ctx, `POS ${race.position}/${race.total}`, W / 2, 28, h.positionColor);

  const lapLength = race.distance / race.laps;
  const lap = Math.min(race.laps, Math.floor(playerZ / lapLength) + 1);
  const time = race.finishTimes.player ?? race.time;
  ctx.font = h.infoFont;
  ctx.textAlign = 'left';
  outlined(ctx, `LAP ${lap}/${race.laps}   ${formatTime(time)}`, h.infoX, H - h.infoBottom, h.positionColor, 3);
  ctx.textAlign = 'left';
}

/** 3-2-1 while the bikes are locked, then GO! for a moment. */
export function drawCountdown(ctx: CanvasRenderingContext2D, race: RaceState): void {
  const h = config.hud;
  let text: string;
  let color: string;
  let age: number; // seconds this message has been up, for the pop-in

  if (race.phase === 'countdown') {
    const n = Math.ceil(race.countdown);
    text = String(n);
    color = h.countdownColors[Math.min(h.countdownColors.length - 1, Math.max(0, config.race.countdownSeconds - n))];
    age = n - race.countdown; // 0 as each number appears, up to 1
  } else if (race.phase === 'racing' && race.sinceGo < config.race.goSeconds) {
    text = 'GO!';
    color = h.goColor;
    age = race.sinceGo;
  } else {
    return;
  }

  const pop = 1 + 0.45 * (1 - Math.min(1, age / 0.25)) ** 2;
  ctx.save();
  ctx.translate(W / 2, H * 0.34);
  ctx.scale(pop, pop);
  if (race.phase === 'racing') ctx.globalAlpha = Math.min(1, (config.race.goSeconds - race.sinceGo) / 0.3);
  ctx.font = h.countdownFont;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  outlined(ctx, text, 0, 0, color, 8);
  ctx.restore();
}

/** Finish screen: the results table, best first, with the player highlighted. */
export function drawResults(ctx: CanvasRenderingContext2D, race: RaceState): void {
  if (race.phase !== 'finished') return;
  const h = config.hud;
  const rowH = 20;
  const w = 330;
  const rows = race.results.length;
  const top = 28;
  const height = 70 + rows * rowH + 30;
  const x0 = (W - w) / 2;

  ctx.fillStyle = h.resultsBack;
  ctx.fillRect(x0, top, w, height);

  const place = race.results.findIndex((r) => r.isPlayer) + 1;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.font = h.resultsTitleFont;
  outlined(ctx, place === 1 ? 'YOU WIN!' : 'FINISH!', W / 2, top + 36, place === 1 ? h.resultsPlayer : h.positionColor, 5);

  ctx.font = h.resultsFont;
  race.results.forEach((r, i) => {
    const y = top + 70 + i * rowH;
    ctx.fillStyle = r.isPlayer ? h.resultsPlayer : r.time === null ? h.resultsDim : h.resultsText;
    ctx.textAlign = 'left';
    ctx.fillText(`${i + 1}.`, x0 + 18, y);
    ctx.fillText(r.name.toUpperCase(), x0 + 52, y);
    ctx.textAlign = 'right';
    ctx.fillText(r.time === null ? 'racing...' : formatTime(r.time), x0 + w - 18, y);
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = h.resultsDim;
  ctx.fillText('ENTER to race again', W / 2, top + height - 10);
  ctx.textAlign = 'left';
}
