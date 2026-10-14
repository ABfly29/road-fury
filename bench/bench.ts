// Dev-only benchmark + screenshot page. Not part of the production build (vite only builds the root index.html).
// Run: npm run dev, then open /road-fury/bench/
import { config } from '../src/config';
import { createSampleTrack } from '../src/world/track';
import { createCamera } from '../src/entities/camera';
import { Background } from '../src/render/background';
import { RoadRenderer } from '../src/render/roadRenderer';

const track = createSampleTrack();
const mk = () => {
  const c = document.createElement('canvas');
  c.width = config.render.width; c.height = config.render.height;
  document.body.appendChild(c);
  return c.getContext('2d')!;
};
const ctx = mk();
const bg = new Background(ctx);
const road = new RoadRenderer(ctx, track);
const cam = createCamera();

// Full lap at top speed, one segment per frame.
const frames = track.segments.length * 2; // two laps, proves the wrap
const times: number[] = [];
for (let i = 0; i < frames; i++) {
  cam.position = i * config.road.segmentLength;
  const t0 = performance.now();
  bg.draw(ctx, cam.parallax);
  road.render(cam);
  ctx.getImageData(0, 0, 1, 1); // force the raster to finish
  times.push(performance.now() - t0);
}
times.sort((a, b) => a - b);
const avg = times.reduce((a, b) => a + b, 0) / times.length;
const out = `frames=${frames} avg=${avg.toFixed(2)}ms p95=${times[Math.floor(times.length * 0.95)].toFixed(2)}ms max=${times[times.length - 1].toFixed(2)}ms budget=16.67ms`;

// Screenshots at interesting spots (segment index).
document.body.innerHTML = '';
document.body.style.cssText = 'margin:0;background:#000;display:grid;grid-template-columns:repeat(3,640px);gap:2px';
const spots: [string, number, number][] = [
  ['start', 0, 0], ['gentle right', 75 + 60 + 10, 0], ['rolling hills', 220, 0],
  ['hard left', 460, 0], ['big hill climb', 790, 0], ['big hill crest', 850, 0],
  ['loop end -6', track.segments.length - 6, 0], ['loop join (wrapped)', track.segments.length + 0, 0], ['after join', track.segments.length + 6, 0],
];
for (const [, idx, x] of spots) {
  const c = mk();
  const b = new Background(c); const r = new RoadRenderer(c, track);
  const cm = createCamera(); cm.position = idx * config.road.segmentLength + 60; cm.x = x;
  b.draw(c, cm.parallax); r.render(cm);
}
const pre = document.createElement('pre'); pre.id = 'result'; pre.textContent = out; pre.style.color = '#0f0';
document.body.appendChild(pre);
