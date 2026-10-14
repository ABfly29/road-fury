// Dev-only benchmark + screenshot page. Not part of the production build (vite only builds the root index.html).
// Run: npm run dev, then open /road-fury/bench/
import { config } from '../src/config';
import { createSampleTrack } from '../src/world/track';
import { createCamera } from '../src/entities/camera';
import { createPlayer, type Player } from '../src/entities/player';
import { updateCamera } from '../src/systems/camera';
import { Background } from '../src/render/background';
import { BikeRenderer } from '../src/render/bikeRenderer';
import { drawHealth, drawSpeed, drawWipeout } from '../src/render/hud';
import { RoadRenderer } from '../src/render/roadRenderer';

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
  const bg = new Background(ctx);
  const road = new RoadRenderer(ctx, track);
  const bike = new BikeRenderer(player);
  return {
    player,
    cam,
    frame() {
      updateCamera(cam, player, track, 0);
      bg.draw(ctx, cam.parallax);
      road.render(cam, [bike]);
      drawSpeed(ctx, player);
      drawHealth(ctx, player);
      drawWipeout(ctx, player);
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
const board = firstOf('billboard');
const fast = config.physics.maxSpeed * 0.8;
const crashAt = (e: number): Partial<Player> => ({
  z: palmZ, x: palm.item.offset, speed: 0, crashTimer: config.crash.duration - e, crashSpeed: 0.8, crashDir: palm.item.offset > 0 ? -1 : 1,
  health: 80,
});
const spots: [string, number, Partial<Player>][] = [
  ['beach zone', 40, { speed: fast }],
  ['forest, hard curve + chevrons', 500, { speed: fast, lean: 0.5 }],
  ['rocky zone', 800, { speed: fast }],
  ['billboard', board.k - 14, { speed: fast }],
  ['approaching a palm', palm.k - 6, { speed: fast, x: palm.item.offset }],
  ['crash e=0.10s', 0, crashAt(0.1)],
  ['crash e=0.40s', 0, crashAt(0.4)],
  ['crash e=0.90s', 0, crashAt(0.9)],
  ['crash e=1.50s', 0, crashAt(1.5)],
  ['crash e=2.10s', 0, crashAt(2.1)],
  ['respawn, invincible (flash on)', palm.k - 6, { speed: 0, invincibleTimer: 2.99, health: 80 }],
  ['crest ahead', crest - 22, { speed: fast }],
  ['just below the crest', crest - 8, { speed: fast }],
  ['over the crest: trees poke up behind it', crest + 2, { speed: fast }],
];

document.body.innerHTML = '';
document.body.style.cssText = 'margin:0;background:#000;display:grid;grid-template-columns:repeat(3,640px);gap:2px';
for (const [, idx, state] of spots) {
  const s = makeScene(mk());
  Object.assign(s.player, { z: idx * segLen + 60, ...state });
  s.frame();
}
const pre = document.createElement('pre');
pre.id = 'result';
pre.textContent = out;
pre.style.color = '#0f0';
document.body.appendChild(pre);
