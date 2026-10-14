// Dev-only benchmark + screenshot page. Not part of the production build (vite only builds the root index.html).
// Run: npm run dev, then open /road-fury/bench/
import { config } from '../src/config';
import { createSampleTrack } from '../src/world/track';
import { createCamera } from '../src/entities/camera';
import { createPlayer, type Player } from '../src/entities/player';
import { updateCamera } from '../src/systems/camera';
import { Background } from '../src/render/background';
import { BikeRenderer } from '../src/render/bikeRenderer';
import { drawSpeed } from '../src/render/hud';
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

// Screenshots of specific situations: [label, segment index, speed fraction, lean, x]
let crest = 0;
for (let i = 0; i < track.segments.length; i++) if (track.segments[i].p2.y > track.segments[crest].p2.y) crest = i;
const spots: [string, number, number, number, number][] = [
  ['stopped', 4, 0, 0, 0],
  ['straight, full speed', 10, 1, 0, 0],
  ['hard left, lean left', 470, 0.6, -0.9, -0.2],
  ['hard right, lean right', 1270, 0.6, 0.9, 0.2],
  ['running wide (off-road)', 470, 0.3, -0.9, 1.4],
  ['big hill, climbing', crest - 60, 0.8, 0, 0],
  ['big hill, just before crest', crest - 12, 0.8, 0, 0],
  ['big hill, over the crest', crest + 4, 0.8, 0, 0],
  ['big hill, descending', crest + 40, 0.8, 0, 0],
];

document.body.innerHTML = '';
document.body.style.cssText = 'margin:0;background:#000;display:grid;grid-template-columns:repeat(3,640px);gap:2px';
for (const [, idx, speed, lean, x] of spots) {
  const s = makeScene(mk());
  Object.assign(s.player as Player, { z: idx * segLen + 60, speed: speed * config.physics.maxSpeed, lean, x });
  s.frame();
}
const pre = document.createElement('pre');
pre.id = 'result';
pre.textContent = out;
pre.style.color = '#0f0';
document.body.appendChild(pre);
