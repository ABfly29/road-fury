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
6. **The player is `playerZ` ahead of the camera.** `entities/camera.ts` derives `playerZ = camera.height * cameraDepth`; `systems/camera.ts` sets `camera.position = player.z - playerZ` and follows `player.x`. Anything drawn on the road (bike, later traffic and rivals) is a `RoadSprite` passed to `RoadRenderer.render()` so nearer hills can hide it. Handling feel lives in `config.physics`; bike look in `config.bike`.
