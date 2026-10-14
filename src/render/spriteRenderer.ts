import { config } from '../config';
import type { Track } from '../world/track';
import { Art } from './art';

const { width: W, height: H } = config.render;
const { segmentLength, roadWidth } = config.road;
const { drawDistance } = config.camera;

/** Something drawn on the road in the same pass as the scenery, so nearer hills can hide it (the bike). */
export interface RoadSprite {
  /** Total distance travelled along the road. */
  readonly position: number;
  /** Draw with its ground contact point at (x, y); scale is screen pixels per world unit. */
  draw(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void;
}

/** The road renderer's projected points for this frame (point i = start of the segment baseIndex + i). */
export interface RoadProjection {
  baseIndex: number;
  camY: number;
  /** Distance from the eye to the projection plane this frame (depends on the FOV). */
  depth: number;
  sx: Float64Array;
  sy: Float64Array;
  sw: Float64Array;
  cz: Float64Array;
  /** Per segment: the screen row at and below which nearer terrain already covers the view. */
  clip: Float64Array;
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Draws scenery and road sprites, farthest first, with the road's own projection and hill clipping. */
export class SpriteRenderer {
  private readonly art = new Art();

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly track: Track,
  ) {}

  draw(cam: { position: number }, proj: RoadProjection, roadSprites: readonly RoadSprite[]): void {
    const { ctx, track } = this;
    const segs = track.segments;
    const { baseIndex, depth, sx, sy, sw, cz, clip } = proj;

    // Bucket road sprites by segment so they are drawn at the right depth among the scenery.
    const placed = roadSprites
      .map((sprite) => ({ sprite, i: Math.floor(sprite.position / segmentLength) - baseIndex }))
      .filter((p) => p.i >= 0 && p.i < drawDistance)
      .sort((a, b) => b.i - a.i);
    let next = 0;

    ctx.imageSmoothingEnabled = false;

    for (let i = drawDistance - 1; i >= 0; i--) {
      const behind = cz[i] <= depth;

      if (!behind) {
        const seg = segs[mod(baseIndex + i, segs.length)];
        // Fog fades distant sprites into the haze, same curve as the road.
        const d = i / drawDistance;
        const fog = 1 / Math.exp(d * d * config.fog.density);

        for (const item of seg.sprites) {
          const t = config.scenery.types[item.type];
          const halfW = sw[i] + (sw[i + 1] - sw[i]) * item.frac;
          const pxPerUnit = halfW / roadWidth;
          const h = t.height * pxPerUnit;
          if (h < config.scenery.minPixelHeight) continue;

          const w = t.width * pxPerUnit;
          const x = sx[i] + (sx[i + 1] - sx[i]) * item.frac + item.offset * halfW;
          const y = sy[i] + (sy[i + 1] - sy[i]) * item.frac;
          if (x + w / 2 < 0 || x - w / 2 > W) continue;
          if (y - h >= clip[i]) continue; // entirely hidden behind nearer terrain

          this.drawClipped(clip[i], () => {
            if (fog < 0.99) ctx.globalAlpha = fog;
            ctx.drawImage(this.art.get(item.type, item.variant), x - w / 2, y - h, w, h);
            ctx.globalAlpha = 1;
          });
        }
      }

      while (next < placed.length && placed[next].i === i) {
        this.drawRoadSprite(cam, proj, placed[next].sprite, clip[i]);
        next++;
      }
    }
  }

  private drawRoadSprite(cam: { position: number }, proj: RoadProjection, sprite: RoadSprite, clipY: number): void {
    const z = sprite.position - cam.position;
    if (z <= proj.depth) return;
    const scale = proj.depth / z;
    const y = H / 2 - scale * (this.track.heightAt(sprite.position) - proj.camY) * (H / 2);
    // The camera follows the player's x, so the bike stays centred.
    this.drawClipped(clipY, () => sprite.draw(this.ctx, W / 2, y, scale * (W / 2)));
  }

  /** Run `fn`, clipping away everything at and below clipY (where nearer terrain covers the view). */
  private drawClipped(clipY: number, fn: () => void): void {
    const { ctx } = this;
    if (clipY >= H) {
      fn(); // nothing nearer covers the screen here: skip the costly clip
      return;
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, clipY);
    ctx.clip();
    fn();
    ctx.restore();
  }
}
