// Dev-only: renders ONE fixed scene full size, chosen by the URL hash (#0, #1, ...), for before/after screenshots.
// Open /road-fury/bench/showcase.html#0 with `npm run dev`, or screenshot it headlessly.
import { config } from '../src/config';
import { createSampleTrack } from '../src/world/track';
import { ZERO_AXES } from '../src/core/input';
import { createCamera } from '../src/entities/camera';
import { createPlayer } from '../src/entities/player';
import { createRace } from '../src/entities/race';
import { createRivals } from '../src/entities/rival';
import { updateCamera } from '../src/systems/camera';
import { Background } from '../src/render/background';
import { BikeRenderer } from '../src/render/bikeRenderer';
import { drawHud } from '../src/render/hudLayer';
import { RoadRenderer } from '../src/render/roadRenderer';
import { SceneBuffer } from '../src/render/screenFx';

const track = createSampleTrack();
const segLen = config.road.segmentLength;
const fast = config.physics.maxSpeed * 0.85;

let crest = 0;
for (let i = 0; i < track.segments.length; i++) if (track.segments[i].p2.y > track.segments[crest].p2.y) crest = i;

/** [name, segment the player is on, speed, lean, countdown (grid shot), rivals as [distance ahead, x]] */
const scenes: [string, number, number, number, number | null, [number, number][]][] = [
  ['grid', 0, 0, 0, 2.7, []],
  ['beach straight', 120, fast, 0, null, [[700, -0.5], [1200, 0.25], [1800, -0.25], [2600, 0.75], [3500, -0.75], [4400, 0.25], [-500, 0.5]]],
  ['hard curve', 500, fast * 0.8, 0.5, null, [[900, -0.25], [1700, 0.25], [2500, -0.75], [3400, 0.5], [4400, -0.25], [5600, 0.25], [-700, 0.25]]],
  ['forest', 380, fast, 0, null, [[800, 0.25], [1500, -0.25], [2300, 0.75], [3000, -0.5], [3900, 0.25], [4800, -0.75], [-900, -0.25]]],
  ['rocky', 760, fast, 0, null, [[600, 0.1], [1400, -0.5], [2200, 0.5], [3100, -0.25], [4000, 0.75], [5000, -0.75], [-800, 0.4]]],
  ['crest ahead', crest - 7, fast, 0, null, [[1500, -0.4], [2000, 0.3], [2600, -0.2], [3200, 0.5], [3800, -0.6], [4400, 0.1], [-600, 0.4]]],
];

const index = Number(location.hash.slice(1) || '0');
const [, seg, speed, lean, countdown, rivalSpots] = scenes[index];

const canvas = document.createElement('canvas');
canvas.width = config.render.width;
canvas.height = config.render.height;
canvas.style.display = 'block';
document.body.style.margin = '0';
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d')!;

const player = createPlayer();
Object.assign(player, { z: seg * segLen + 60, speed, lean });
const rivals = createRivals();
rivalSpots.forEach(([dz, x], i) => {
  const r = rivals[i];
  r.z = player.z + dz;
  r.x = x;
  r.speed = config.physics.maxSpeed * r.pace;
  r.lean = (x < 0 ? 1 : -1) * 0.2;
});
const race = createRace(track.length, rivals.length + 1);
if (countdown === null) {
  race.phase = 'racing';
  race.sinceGo = 5;
  race.time = 23.4;
  race.position = 4;
} else {
  race.countdown = countdown;
}

const cam = createCamera();
const buffer = new SceneBuffer();
const bg = new Background(buffer.ctx);
const road = new RoadRenderer(buffer.ctx, track);
const sprites = [
  new BikeRenderer(player),
  ...rivals.map((r) => new BikeRenderer(r, { colors: r.colors, onRoad: true, lift: 0 })),
];

updateCamera(cam, player, track, ZERO_AXES, 0);
bg.draw(buffer.ctx, cam.parallax);
road.render(cam, sprites);
buffer.present(ctx, player, cam.roll);
drawHud(ctx, { player, race, camera: cam });
document.title = `ready ${index}`;
