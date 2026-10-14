# Road Fury

Road Rash–style pseudo-3D motorbike racer on HTML5 Canvas. Vite + TypeScript. Deployed to GitHub Pages at `/road-fury/`.

Live: https://abfly29.github.io/road-fury/

## Commands
- `npm run dev` – dev server
- `npm run build` – typecheck + production build
- `npm run preview` – serve the built `dist/` at `/road-fury/`
- Never run `npm ci` while a dev/preview server is up: on Windows the server locks native binaries in `node_modules` and `npm ci` fails with EPERM. Stop the server first.

## Layout (`src/`)
`core/` loop, input, game wiring · `world/` road/track data · `entities/` bike, rivals, traffic · `systems/` per-tick logic · `render/` drawing · `audio/` sound · `config.ts` tuning

## Rules
1. **Keep update and render separate.** `update(dt)` advances state at a fixed 60 Hz; `render()` only reads state and draws. Never draw in update or mutate simulation state in render.
2. **All tuning goes in `config.ts`.** Speeds, colors, sizes, thresholds: no magic numbers in other files.
3. **Positions are total distance travelled.** Track/world positions (player, rivals, segments, objects) are a single scalar of cumulative distance along the road, not screen or per-lap coordinates. Wrap with modulo only when looking up track data.
4. **Asset paths must work under the `/road-fury/` base.** Never use root-absolute paths like `/img/a.png` in code. Import assets through Vite (`import url from './a.png'`) or use `import.meta.env.BASE_URL + 'a.png'` for files in `public/`. Don't change `base` in `vite.config.ts`.
5. **Keep the track loop seamless.** `world/track.ts` must end at height 0 and curve 0 (it starts there), and its segment count must be a multiple of `2 * rumbleLength` so the rumble/lane color alternation continues across the join. `TrackBuilder.close()` enforces both; any new track must go through it.
6. **The player is `playerZ` ahead of the camera.** `entities/camera.ts` derives it from the current FOV (`playerZForFov = camera.height * depthForFov(fov)`, so the bike stays at the bottom of the screen during the FOV kick); `systems/camera.ts` sets `camera.position = player.z - playerZ` and follows `player.x`. Anything drawn on the road (bike, later traffic and rivals) is a `RoadSprite` passed to `RoadRenderer.render()` so nearer hills can hide it. Handling feel lives in `config.physics` and `config.input`; bike look in `config.bike`.
7. **Scenery stays off the road and is seeded.** `world/scenery.ts` places every item with `|offset| - width/2 >= minOffset (1.2)` using a seeded PRNG, so the roadside is identical every run. Scenery art lives only in `render/art.ts` (pre-rendered canvas shapes; swap in sprite sheets there). Collision widths are per type in `config.scenery.types`; crash/respawn numbers are in `config.crash`.
8. **The simulation reads only smoothed input axes.** `core/input.ts` turns keys into `steer` (-1..1), `throttle` and `brake` (0..1) via `stepAxes()` once per fixed update; physics, camera and anything later must take an `InputAxes`, never raw key state. The scene is drawn flat into `SceneBuffer` and blitted with the crash shake and camera roll; do not rotate the main context (it makes every fill slow). F3 toggles the axis debug overlay.
9. **Rivals and the race.** `entities/rival.ts` riders live in the same road space as the player (x in half-widths, z as total distance, so the lap seam needs no special handling) and use the player's own `stepLateral`/`stepLean` physics: they must brake for curves like the player does, never get a gentler push. `systems/rivalAI.ts` is the only place that decides what a rival does (lane wander, curve braking, dodging, rubber band, all numbers in `config.rivals`); `systems/bumping.ts` is rider-on-rider contact; `systems/race.ts` owns countdown, laps, finish times, positions and the results table. Bikes are locked until GO. Rivals are `RoadSprite`s with an `x`, so hills hide them like everything else. Do not retune rivals by giving them cheaper physics; adjust `pace`, `curveMargin` or the rubber band instead.
10. **Graphics.** The canvas is 960x540; the HUD is laid out in a 640x360 space (`config.hud.width/height`) and scaled up by `render.hudScale` in `render/hudLayer.ts`, so HUD code never uses `render.width/height`. The road and terrain are drawn one screen row at a time from pre-generated strips in `render/textures.ts` (a `drawImage` per row); do not go back to several shapes per segment, and keep strips seeded. Lane dashes and grass bands repeat every `road.dashPeriod` / `2 * rumbleLength` segments, which `TrackBuilder.close()` makes divide the track length. Scenery dressing (bushes, scrub, far trees, fence posts, sizes, tree shapes) comes from its own seeded stream (`scenery.decor`), so changing it never moves an obstacle; anything with a collision width must still have its inner edge outside `minOffset` at its visual scale. Before/after shots live in `docs/graphics-pass-a/`.

## Tuned values — feel approved, don't change without asking
Handling values in `config.ts` (`physics`) as of phase-2. Later phases must not change these (or the code that uses them) without asking the user first.

| Key | Value | Meaning |
|---|---|---|
| `maxSpeed` | `segmentLength * 60` = 12000 | One segment per frame; 160 mph on the HUD |
| `accel` | `maxSpeed / 5` = 2400 | 0 → top speed in 5 s |
| `brake` | `maxSpeed` = 12000 | Top speed → 0 in 1 s |
| `coastDecel` | `maxSpeed / 5` = 2400 | No input: top speed → 0 in 5 s |
| `steerRate` | 2 | Half-widths/s at top speed; scales linearly with speed |
| `centrifugal` | 0.3 | Outward push = steer step × speed% × curve × 0.3 |
| `offRoadLimit` | 0.25 | Off-road (\|x\| > 1) speed cap, fraction of top speed |
| `offRoadDecel` | `maxSpeed / 2` = 6000 | Speed bleeds to the cap in ~1.5 s |
| `maxX` | 2 | Hard clamp on x |

Curve strengths (`track.curve` easy/medium/hard = 2/4/6) and the hard-curve lengths are part of this feel.

Phase 2.1 (analog input) added `input.steerSpeedLoss = 0.35` at the user's request: steering is 35% weaker at top speed than at a standstill. With that, the steady-state speeds that still hold a curve are 160 / 103 / 74 mph for easy / medium / hard (they were 160 / 133 / 89). The rows above are unchanged. Keys in `config.input` (steerRise/Fall/Cross, throttle/brake ramps, lean spring, camera roll/shift/FOV kick) are also feel values: ask before changing them.
