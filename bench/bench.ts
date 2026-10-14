// Dev-only benchmark + screenshot page. Not part of the production build (vite only builds the root index.html).
// Run: npm run dev, then open /road-fury/bench/
import { config } from '../src/config';
import { createSampleTrack } from '../src/world/track';
import { ZERO_AXES, type InputAxes } from '../src/core/input';
import { createCamera } from '../src/entities/camera';
import { createPlayer, type Player } from '../src/entities/player';
import { createRace } from '../src/entities/race';
import { createRivals } from '../src/entities/rival';
import { updateCamera } from '../src/systems/camera';
import { Background } from '../src/render/background';
import { BikeRenderer } from '../src/render/bikeRenderer';
import { drawHud } from '../src/render/hudLayer';
import { RoadRenderer } from '../src/render/roadRenderer';
import { PostFx, SceneBuffer } from '../src/render/screenFx';

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
  const bg = new Background();
  const post = new PostFx();
  const road = new RoadRenderer(buffer.ctx, track);
  const rivals = createRivals();
  const race = createRace(track.length, rivals.length + 1);
  const sprites = [
    new BikeRenderer(player),
    ...rivals.map((r) => new BikeRenderer(r, { colors: r.colors, onRoad: true, lift: 0 })),
  ];
  const axes: InputAxes = { ...ZERO_AXES };
  return {
    player,
    cam,
    axes,
    rivals,
    race,
    debug: false,
    frame() {
      updateCamera(cam, player, track, axes, 0);
      ctx.fillStyle = config.render.backgroundColor;
      ctx.fillRect(0, 0, config.render.width, config.render.height);
      bg.draw(buffer.ctx, cam);
      road.render(cam, sprites);
      buffer.present(ctx, player, cam.roll);
      post.apply(ctx);
      drawHud(ctx, { player, race, camera: cam, debugAxes: this.debug ? axes : undefined });
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
    s.race.phase = 'racing';
    s.rivals.forEach((r, k) => {
      r.z = s.player.z + 600 + k * 500;
      r.x = (k % 2 ? 1 : -1) * 0.5;
      r.speed = config.physics.maxSpeed * 0.9;
    });
    const t0 = performance.now();
    s.frame();
    ctx.getImageData(0, 0, 1, 1); // force the raster to finish
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const over = times.filter((t) => t > 1000 / config.loop.updateHz).length;
  var out = `frames=${frames} avg=${avg.toFixed(2)}ms p95=${times[Math.floor(times.length * 0.95)].toFixed(2)}ms max=${times[times.length - 1].toFixed(2)}ms over-budget=${over} (${((100 * over) / frames).toFixed(2)}%) budget=16.67ms`;
}

// Screenshots of specific situations.
let crest = 0;
for (let i = 0; i < track.segments.length; i++) if (track.segments[i].p2.y > track.segments[crest].p2.y) crest = i;
const fast = config.physics.maxSpeed * 0.8;
type Scene = ReturnType<typeof makeScene>;
type Extra = { axes?: Partial<InputAxes>; debug?: boolean; fovKick?: number; setup?: (s: Scene) => void };

/** Scatter the rivals around the player: [distance ahead, x] for each. */
const scatter = (s: Scene, spots: [number, number][]) =>
  s.rivals.forEach((r, i) => {
    const [dz, x] = spots[i % spots.length];
    r.z = s.player.z + dz;
    r.x = x;
    r.speed = config.physics.maxSpeed * r.pace;
    r.lean = (x < 0 ? 1 : -1) * 0.2;
  });
const results = (s: Scene) => {
  s.race.phase = 'finished';
  s.race.finishTimes = { player: 66.4 };
  s.race.results = [
    { id: '2', name: 'Nitro Nick', isPlayer: false, time: 65.9 },
    { id: 'player', name: 'YOU', isPlayer: true, time: 66.4 },
    { id: '0', name: 'Razor', isPlayer: false, time: 66.8 },
    { id: '4', name: 'Ghost', isPlayer: false, time: 67.1 },
    { id: '6', name: 'Rocket', isPlayer: false, time: 67.9 },
    { id: '3', name: 'Blaze', isPlayer: false, time: 68.4 },
    { id: '5', name: 'Viper', isPlayer: false, time: null },
    { id: '1', name: 'Vixen', isPlayer: false, time: null },
  ];
  s.race.position = 2;
};

const spots: [string, number, Partial<Player>, Extra?][] = [
  ['grid: 3', 0, {}, { setup: (s) => (s.race.countdown = 2.7) }],
  ['grid: 1', 0, {}, { setup: (s) => (s.race.countdown = 0.7) }],
  ['GO!', 0, {}, { setup: (s) => { s.race.phase = 'racing'; s.race.sinceGo = 0.15; } }],
  ['mid-race pack', 120, { speed: fast }, { setup: (s) => { s.race.phase = 'racing'; s.race.sinceGo = 5; s.race.time = 23.4; s.race.position = 4; scatter(s, [[700, -0.5], [1100, 0.25], [1500, -0.25], [2100, 0.75], [2900, -0.75], [3900, 0.25], [-400, 0.5]]); } }],
  ['rival close ahead', 120, { speed: fast }, { setup: (s) => { s.race.phase = 'racing'; s.race.sinceGo = 5; s.race.position = 2; scatter(s, [[650, 0.1], [1900, -0.5], [2600, 0.5], [3300, -0.3], [4200, 0.2], [5200, -0.6], [-1500, 0.3]]); } }],
  ['bumping: rival alongside', 120, { speed: fast }, { setup: (s) => { s.race.phase = 'racing'; s.race.sinceGo = 5; s.race.position = 3; scatter(s, [[900, 0.12], [1700, -0.3], [2400, 0.5], [3000, -0.5], [4000, 0.3], [4800, 0, ], [-1200, 0.2]]); } }],
  ['just below the crest: pack beyond it', crest - 7, { speed: fast }, { setup: (s) => { s.race.phase = 'racing'; s.race.sinceGo = 5; s.race.position = 5; scatter(s, [[1500, -0.4], [2000, 0.3], [2600, -0.2], [3200, 0.5], [3800, -0.6], [4400, 0.1], [-600, 0.4]]); } }],
  ['finish screen', 200, { speed: 0 }, { setup: results }],
  ['rivals close, with scenery', 40, { speed: fast }, { setup: (s) => { s.race.phase = 'racing'; s.race.sinceGo = 5; s.race.position = 6; scatter(s, [[800, -0.75], [1300, 0.75], [1900, -0.25], [2500, 0.25], [3100, -0.75], [3700, 0.75], [4300, 0.25]]); } }],
];

document.body.innerHTML = '';
document.body.style.cssText = 'margin:0;background:#000;display:grid;grid-template-columns:repeat(3,960px);gap:2px';
for (const [, idx, state, extra] of spots) {
  const s = makeScene(mk());
  Object.assign(s.player, { z: idx * segLen + 60, ...state });
  if (extra?.axes) Object.assign(s.axes, extra.axes);
  s.debug = !!extra?.debug;
  extra?.setup?.(s);
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
