import { config } from '../config';
import { cameraDepth, playerZ, type CameraState } from '../entities/camera';
import type { Track } from '../world/track';

const { width: W, height: H } = config.render;
const { segmentLength, roadWidth, rumbleLength, lanes, rumbleWidth, laneMarkerWidth } = config.road;
const { drawDistance } = config.camera;
const POINTS = drawDistance + 1;

/** Something drawn on the road in the same pass as the segments, so nearer hills can hide it. */
export interface RoadSprite {
  /** Total distance travelled along the road. */
  readonly position: number;
  /** Draw with its ground contact point at (x, y); scale is screen pixels per world unit. */
  draw(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void;
}

/** Pseudo-3D road: projects segments, draws near to far, hills occlude what is behind them. */
export class RoadRenderer {
  // Projected points, reused every frame. Point i is p1 of segment i (and p2 of segment i-1).
  private readonly sx = new Float64Array(POINTS);
  private readonly sy = new Float64Array(POINTS);
  private readonly sw = new Float64Array(POINTS);
  private readonly cz = new Float64Array(POINTS);
  /** Per segment: the screen row at and below which nearer terrain already covers the view. */
  private readonly clip = new Float64Array(POINTS);
  private camY = 0;

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly track: Track,
  ) {}

  render(cam: CameraState, sprites: readonly RoadSprite[] = []): void {
    this.project(cam);
    this.draw(cam);
    this.drawSprites(cam, sprites);
  }

  private project(cam: CameraState): void {
    const { sx, sy, sw, cz } = this;
    const segs = this.track.segments;
    const n = segs.length;
    const baseIndex = Math.floor(cam.position / segmentLength);
    const base = segs[((baseIndex % n) + n) % n];
    const percent = (cam.position - baseIndex * segmentLength) / segmentLength;
    // The camera rides at a fixed height above the road under the player, so the bike stays put on hills.
    const camY = (this.camY = config.camera.height + this.track.heightAt(cam.position + playerZ));
    const camX = cam.x * roadWidth;

    // Accumulated curve offset (x) and its rate of change (dx).
    let x = 0;
    let dx = -(base.curve * percent);

    for (let i = 0; i < POINTS; i++) {
      const absIndex = baseIndex + i;
      const seg = segs[((absIndex % n) + n) % n];
      const z = absIndex * segmentLength - cam.position;
      const scale = cameraDepth / z;
      cz[i] = z;
      sx[i] = Math.round(W / 2 + scale * (x - camX) * (W / 2));
      sy[i] = Math.round(H / 2 - scale * (seg.p1.y - camY) * (H / 2));
      sw[i] = Math.round(scale * roadWidth * (W / 2));
      x += dx;
      dx += seg.curve;
    }
  }

  private draw(cam: CameraState): void {
    const { ctx, sx, sy, sw, cz, clip } = this;
    const segs = this.track.segments;
    const n = segs.length;
    const baseIndex = Math.floor(cam.position / segmentLength);

    let maxY: number = H; // top of everything drawn so far; farther road must be above it

    for (let i = 0; i < POINTS - 1; i++) {
      clip[i] = maxY;

      // Behind the camera, facing away (past a crest) or hidden behind a nearer hill.
      if (cz[i] <= cameraDepth || sy[i + 1] >= sy[i] || sy[i + 1] >= maxY) continue;

      let x1 = sx[i];
      let w1 = sw[i];
      let y1 = sy[i];
      const x2 = sx[i + 1];
      const w2 = sw[i + 1];
      const y2 = sy[i + 1];

      // Partly hidden by a nearer segment: clip the bottom edge to maxY.
      if (y1 > maxY) {
        const t = (y1 - maxY) / (y1 - y2);
        x1 += (x2 - x1) * t;
        w1 += (w2 - w1) * t;
        y1 = maxY;
      }

      const seg = segs[(((baseIndex + i) % n) + n) % n];
      const colors = Math.floor(seg.index / rumbleLength) % 2 === 0 ? config.colors.light : config.colors.dark;

      ctx.fillStyle = colors.grass;
      ctx.fillRect(0, y2, W, y1 - y2);

      // Wide rumble first, road on top, so the shared edge has no seam.
      const r1 = w1 * rumbleWidth;
      const r2 = w2 * rumbleWidth;
      this.quad(x1 - w1 - r1, y1, x1 + w1 + r1, y1, x2 + w2 + r2, y2, x2 - w2 - r2, y2, colors.rumble);
      this.quad(x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, colors.road);

      if (colors.lane) {
        const l1 = w1 * laneMarkerWidth;
        const l2 = w2 * laneMarkerWidth;
        const laneW1 = (w1 * 2) / lanes;
        const laneW2 = (w2 * 2) / lanes;
        let lx1 = x1 - w1;
        let lx2 = x2 - w2;
        ctx.fillStyle = colors.lane;
        for (let lane = 1; lane < lanes; lane++) {
          lx1 += laneW1;
          lx2 += laneW2;
          ctx.beginPath();
          ctx.moveTo(lx1 - l1 / 2, y1);
          ctx.lineTo(lx1 + l1 / 2, y1);
          ctx.lineTo(lx2 + l2 / 2, y2);
          ctx.lineTo(lx2 - l2 / 2, y2);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Exponential distance fog.
      const d = i / drawDistance;
      const fogAlpha = 1 - 1 / Math.exp(d * d * config.fog.density);
      if (fogAlpha > 0.005) {
        ctx.globalAlpha = fogAlpha;
        ctx.fillStyle = config.fog.color;
        ctx.fillRect(0, y2, W, y1 - y2);
        ctx.globalAlpha = 1;
      }

      maxY = y2;
    }
  }

  /** Sprites are drawn after the road, clipped by whatever nearer terrain covers them. */
  private drawSprites(cam: CameraState, sprites: readonly RoadSprite[]): void {
    const { ctx, clip } = this;
    const baseIndex = Math.floor(cam.position / segmentLength);

    for (const sprite of sprites) {
      const i = Math.floor(sprite.position / segmentLength) - baseIndex;
      if (i < 0 || i >= POINTS - 1) continue;
      const z = sprite.position - cam.position;
      if (z <= cameraDepth) continue;

      const scale = cameraDepth / z;
      const x = W / 2; // the camera follows the player's x, so the bike stays centred
      const y = H / 2 - scale * (this.track.heightAt(sprite.position) - this.camY) * (H / 2);

      if (clip[i] >= H) {
        // Nothing nearer covers the screen here: skip the (costly) clip.
        sprite.draw(ctx, x, y, scale * (W / 2));
        continue;
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, clip[i]);
      ctx.clip();
      sprite.draw(ctx, x, y, scale * (W / 2));
      ctx.restore();
    }
  }

  private quad(
    x1: number, y1: number, x2: number, y2: number,
    x3: number, y3: number, x4: number, y4: number,
    color: string,
  ): void {
    const { ctx } = this;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.fill();
  }
}
