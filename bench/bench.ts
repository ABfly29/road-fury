// Dev-only benchmark + screenshot page. Not part of the production build (vite only builds the root index.html).
// Run: npm run dev, then open /road-fury/bench/
import { config } from '../src/config';
import { createSampleTrack } from '../src/world/track';
import { ZERO_AXES, type InputAxes } from '../src/core/input';
import { createCamera } from '../src/entities/camera';
import { createPlayer, type Player } from '../src/entities/player';
import { updateCamera } from '../src/systems/camera';
import { Background } from '../src/render/background';
import { BikeRenderer } from '../src/render/bikeRenderer';
import { drawDebugOverlay } from '../src/render/debugOverlay';
import { drawHealth, drawSpeed, drawWipeout } from '../src/render/hud';
import { RoadRenderer } from '../src/render/roadRenderer';
import { SceneBuffer } from '../src/render/screenFx';

const track = createSampleTrack();
const segLen = config.road.segmentLength;
const mk = () => {
  const c = document.createElement('canvas');
  c.width = config.render.width;
  c.height = config.render.height;
  document.body.appendChild(c);
  return c.getContext('2d')!;
};

/** One complete frame, exactly as the game draws it. */
function makeScene(ctx: CanvasRenderingContext2D) {
  const player = createPlayer();
  const cam = createCamera();
  const buffer = new SceneBuffer();
  const bg = new Background(buffer.ctx);
  const road = new RoadRenderer(buffer.ctx, track);
  const bike = new BikeRenderer(player);
  const axes: InputAxes = { ...ZERO_AXES };
  return {
    player,
    cam,
    axes,
    debug: false,
    frame() {
      updateCamera(cam, player, track, axes, 0);
      ctx.fillStyle = config.render.backgroundColor;
      ctx.fillRect(0, 0, config.render.width, config.render.height);
      bg.draw(buffer.ctx, cam.parallax);
      road.render(cam, [bike]);
      buffer.present(ctx, player, cam.roll);
      drawSpeed(ctx, player);
      drawHealth(ctx, player);
      drawWipeout(ctx, player);
      if (this.debug) drawDebugOverlay(ctx, axes, player, cam);
    },
  };
}

// Full lap at top speed, one segment per frame, two laps.
{
  const ctx = mk();
  const s = makeScene(ctx);
  const frames = track.segments.length * 2;
  const times: number[] = [];
  s.player.speed = config.physics.maxSpeed;
  for (let i = 0; i < frames; i++) {
    s.player.z = i * segLen;
    s.player.lean = Math.sin(i / 30);
    const t0 = performance.now();
    s.frame();
    ctx.getImageData(0, 0, 1, 1); // force the raster to finish
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  var out = `frames=${frames} avg=${avg.toFixed(2)}ms p95=${times[Math.floor(times.length * 0.95)].toFixed(2)}ms max=${times[times.length - 1].toFixed(2)}ms budget=16.67ms`;
}

// Screenshots of specific situations.
let crest = 0;
for (let i = 0; i < track.segments.length; i++) if (track.segments[i].p2.y > track.segments[crest].p2.y) crest = i;
const firstOf = (type: string, minOff = 0, maxOff = 9) => {
  for (let k = 300; k < track.segments.length; k++) {
    const item = track.segments[k].sprites.find((s) => s.type === type && Math.abs(s.offset) >= minOff && Math.abs(s.offset) <= maxOff);
    if (item) return { k, item };
  }
  throw new Error(`no ${type}`);
};
const palm = firstOf('palm', 1.4, 1.8);
const palmZ = (palm.k + palm.item.frac) * segLen;
const fast = config.physics.maxSpeed * 0.8;
const crashAt = (e: number): Partial<Player> => ({
  z: palmZ, x: palm.item.offset, speed: 0, crashTimer: config.crash.duration - e, crashSpeed: 0.8, crashDir: palm.item.offset > 0 ? -1 : 1,
  health: 80,
});
type Extra = { axes?: Partial<InputAxes>; debug?: boolean; fovKick?: number };
const spots: [string, number, Partial<Player>, Extra?][] = [
  ['upright, overlay on', 40, { speed: fast }, { axes: { throttle: 1 }, debug: true }],
  ['lean right + steer right', 40, { speed: fast, lean: 1 }, { axes: { steer: 1, throttle: 1 }, debug: true }],
  ['lean left + steer left, braking', 40, { speed: fast, lean: -1 }, { axes: { steer: -1, brake: 0.6 }, debug: true }],
  ['lean overshoot (1.2) right', 500, { speed: fast, lean: 1.2 }, { axes: { steer: 0.4, throttle: 1 }, debug: true }],
  ['pulling away: FOV kick on', 40, { speed: config.physics.maxSpeed * 0.15 }, { axes: { throttle: 1 }, fovKick: config.input.fovKick, debug: true }],
  ['same spot, no kick', 40, { speed: config.physics.maxSpeed * 0.15 }, { axes: { throttle: 1 }, debug: true }],
  ['crash e=0.40s (shake + roll off)', 0, crashAt(0.4)],
  ['crest ahead', crest - 22, { speed: fast }],
  ['approaching a palm', palm.k - 6, { speed: fast, x: palm.item.offset }],
];

document.body.innerHTML = '';
document.body.style.cssText = 'margin:0;background:#000;display:grid;grid-template-columns:repeat(3,640px);gap:2px';
for (const [, idx, state, extra] of spots) {
  const s = makeScene(mk());
  Object.assign(s.player, { z: idx * segLen + 60, ...state });
  if (extra?.axes) Object.assign(s.axes, extra.axes);
  s.debug = !!extra?.debug;
  s.cam.fovKick = extra?.fovKick ?? 0; // frame() recomputes it, so also pin the target below
  s.frame();
  if (extra?.fovKick) {
    // frame() eases fovKick from 0; run a few steps to show the steady kick
    for (let i = 0; i < 120; i++) updateCamera(s.cam, s.player, track, s.axes, 1 / 60);
    s.frame();
  }
}
const pre = document.createElement('pre');
pre.id = 'result';
pre.textContent = out;
pre.style.color = '#0f0';
document.body.appendChild(pre);
