import { config } from '../config';
import { depthForFov, playerZForFov, type CameraState } from '../entities/camera';
import type { Track } from '../world/track';
import { SpriteRenderer, type RoadProjection, type RoadSprite } from './spriteRenderer';
import { Textures } from './textures';

export type { RoadSprite };

const { width: W, height: H } = config.render;
const { segmentLength, roadWidth, rumbleLength, textureSpan, dashPeriod, dashOn } = config.road;
const { drawDistance } = config.camera;
const POINTS = drawDistance + 1;

/** Pseudo-3D road: projects segments, draws near to far, hills occlude what is behind them. */
export class RoadRenderer {
  // Projected points, reused every frame. Point i is p1 of segment i (and p2 of segment i-1).
  private readonly sx = new Float64Array(POINTS);
  private readonly sy = new Float64Array(POINTS);
  private readonly sw = new Float64Array(POINTS);
  private readonly cz = new Float64Array(POINTS);
  /** Per segment: the screen row at and below which nearer terrain already covers the view. */
  private readonly clip = new Float64Array(POINTS);
  private readonly proj: RoadProjection = {
    baseIndex: 0,
    camY: 0,
    depth: 0,
    sx: this.sx,
    sy: this.sy,
    sw: this.sw,
    cz: this.cz,
    clip: this.clip,
  };
  private readonly spriteRenderer: SpriteRenderer;
  private readonly textures = new Textures();

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly track: Track,
  ) {
    this.spriteRenderer = new SpriteRenderer(ctx, track);
  }

  render(cam: CameraState, sprites: readonly RoadSprite[] = []): void {
    this.project(cam);
    this.draw(cam);
    this.spriteRenderer.draw(cam, this.proj, sprites);
  }

  private project(cam: CameraState): void {
    const { sx, sy, sw, cz } = this;
    const segs = this.track.segments;
    const n = segs.length;
    const baseIndex = Math.floor(cam.position / segmentLength);
    const base = segs[((baseIndex % n) + n) % n];
    const percent = (cam.position - baseIndex * segmentLength) / segmentLength;
    // The camera rides at a fixed height above the road under the player, so the bike stays put on hills.
    const depth = depthForFov(cam.fov);
    const camY = config.camera.height + this.track.heightAt(cam.position + playerZForFov(cam.fov));
    this.proj.baseIndex = baseIndex;
    this.proj.camY = camY;
    this.proj.depth = depth;
    const camX = cam.x * roadWidth;

    // Accumulated curve offset (x) and its rate of change (dx).
    let x = 0;
    let dx = -(base.curve * percent);

    for (let i = 0; i < POINTS; i++) {
      const absIndex = baseIndex + i;
      const seg = segs[((absIndex % n) + n) % n];
      const z = absIndex * segmentLength - cam.position;
      const scale = depth / z;
      cz[i] = z;
      sx[i] = W / 2 + scale * (x - camX) * (W / 2);
      sy[i] = Math.round(H / 2 - scale * (seg.p1.y - camY) * (H / 2));
      sw[i] = scale * roadWidth * (W / 2);
      x += dx;
      dx += seg.curve;
    }
  }

  private draw(cam: CameraState): void {
    const { ctx, sx, sy, sw, cz, clip, textures } = this;
    const depth = this.proj.depth;
    const segs = this.track.segments;
    const n = segs.length;
    const baseIndex = Math.floor(cam.position / segmentLength);
    const { rows: roadRows, width: roadTexW } = config.textures.road;
    const { rows: grassRows, width: grassTexW } = config.textures.grass;

    // Texture rows are copied 1:1 vertically; crisp, no bleeding between rows.
    ctx.imageSmoothingEnabled = false;

    let maxY: number = H; // top of everything drawn so far; farther road must be above it

    for (let i = 0; i < POINTS - 1; i++) {
      clip[i] = maxY;

      // Behind the camera, facing away (past a crest) or hidden behind a nearer hill.
      if (cz[i] <= depth || sy[i + 1] >= sy[i] || sy[i + 1] >= maxY) continue;

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
      const band = Math.floor(seg.index / rumbleLength) % 2; // alternates the grass tone
      const dash = seg.index % dashPeriod < dashOn ? 1 : 0; // white lane dashes
      const grass = textures.grassStrip(seg.index)[band];
      const road = textures.roadStrip(seg.index)[dash];

      // One screen row at a time: terrain across the whole width, then the road strip (asphalt, lines,
      // dirt shoulder) scaled to this row's width. Width and centre are exactly linear in screen y.
      const height = y1 - y2;
      for (let y = y2; y < y1; y++) {
        const u = (y - y2 + 0.5) / height; // 0 at the far edge of the segment, 1 at the near edge
        const halfWidth = w2 + (w1 - w2) * u;
        const centre = x2 + (x1 - x2) * u;
        ctx.drawImage(grass, 0, Math.min(grassRows - 1, Math.floor(u * grassRows)), grassTexW, 1, 0, y, W, 1);
        ctx.drawImage(
          road, 0, Math.min(roadRows - 1, Math.floor(u * roadRows)), roadTexW, 1,
          centre - textureSpan * halfWidth, y, 2 * textureSpan * halfWidth, 1,
        );
      }

      // Exponential distance fog.
      const d = i / drawDistance;
      const fogAlpha = 1 - 1 / Math.exp(d * d * config.fog.density);
      if (fogAlpha > 0.005) {
        ctx.globalAlpha = fogAlpha;
        ctx.fillStyle = config.fog.color;
        ctx.fillRect(0, y2, W, height);
        ctx.globalAlpha = 1;
      }

      maxY = y2;
    }
  }
}
