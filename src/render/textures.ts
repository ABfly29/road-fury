import { config } from '../config';
import { mulberry32 } from '../core/random';

type RGB = readonly [number, number, number];

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Soft low-frequency noise on a coarse lattice, sampled bilinearly; returns -1..1. */
function lattice(rand: () => number, w: number, h: number, cell: number): (x: number, y: number) => number {
  const cols = Math.ceil(w / cell) + 2;
  const rows = Math.ceil(h / cell) + 2;
  const v = new Float32Array(cols * rows);
  for (let i = 0; i < v.length; i++) v[i] = rand() * 2 - 1;
  return (x, y) => {
    const fx = x / cell;
    const fy = y / cell;
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const tx = smooth(fx - ix);
    const ty = smooth(fy - iy);
    const a = v[iy * cols + ix];
    const b = v[iy * cols + ix + 1];
    const c = v[(iy + 1) * cols + ix];
    const d = v[(iy + 1) * cols + ix + 1];
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  };
}

function newCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return [canvas, canvas.getContext('2d', { willReadFrequently: true })!];
}

/**
 * Pre-generated road and terrain strips. Everything is made once at start-up from a seeded generator, so the
 * look is the same every run. The renderer draws one screen row at a time from a strip (see RoadRenderer).
 */
export class Textures {
  /** [variant][dash: 0 = no lane dash, 1 = dash]. Road, shoulder and painted lines; transparent outside the shoulder. */
  private readonly road: HTMLCanvasElement[][] = [];
  /** [variant][tone: 0 = light band, 1 = dark band]. */
  private readonly grass: HTMLCanvasElement[][] = [];

  constructor() {
    const t = config.textures;
    for (let v = 0; v < t.road.variants; v++) {
      const base = this.buildAsphalt(v);
      this.road.push([this.paintLines(base, v, false), this.paintLines(base, v, true)]);
    }
    for (let v = 0; v < t.grass.variants; v++) {
      this.grass.push([this.buildGrass(v, 0), this.buildGrass(v, 1)]);
    }
  }

  /** Cheap deterministic hash so neighbouring segments get unrelated variants. */
  private static hash(n: number): number {
    return Math.imul(n + 0x9e3779b9, 0x85ebca6b) >>> 0;
  }

  roadStrip(segmentIndex: number): HTMLCanvasElement[] {
    return this.road[Textures.hash(segmentIndex) % this.road.length];
  }

  grassStrip(segmentIndex: number): HTMLCanvasElement[] {
    return this.grass[Textures.hash(segmentIndex * 7 + 3) % this.grass.length];
  }

  /** Asphalt, tyre wear, patches, cracks, stains and the dirt shoulder; no painted lines yet. */
  private buildAsphalt(variant: number): HTMLCanvasElement {
    const t = config.textures;
    const { width: W, rows: H } = t.road;
    const a = t.asphalt;
    const s = t.shoulder;
    const span = config.road.textureSpan;
    const rand = mulberry32(t.seed + variant * 101);
    const [canvas, ctx] = newCanvas(W, H);
    const img = ctx.createImageData(W, H);
    const d = img.data;

    const blotch = lattice(rand, W, H, 40);
    const fine = lattice(rand, W, H, 9);
    const dirtBlotch = lattice(rand, W, H, 24);

    // Ragged outer edge of the shoulder, per row and per side.
    const edgeNoise = lattice(rand, 1, H, 5);
    const edgeNoiseR = lattice(rand, 1, H, 5);
    const laneCentres = [-0.75, -0.25, 0.25, 0.75];

    for (let y = 0; y < H; y++) {
      const leftEdge = s.outer + s.ragged * edgeNoise(0.5, y);
      const rightEdge = s.outer + s.ragged * edgeNoiseR(0.5, y);
      for (let px = 0; px < W; px++) {
        const x = ((px + 0.5) / W) * 2 * span - span;
        const ax = Math.abs(x);
        const i = (y * W + px) * 4;

        if (ax > (x < 0 ? leftEdge : rightEdge)) continue; // transparent: the grass shows through

        let r: number, g: number, b: number;
        if (ax > s.inner) {
          // Dirt / gravel shoulder: lighter and dustier further from the asphalt, darker where tyres throw debris.
          const out = Math.min(1, (ax - s.inner) / (s.outer - s.inner));
          const shade = (rand() * 2 - 1) * s.noise + dirtBlotch(px, y) * 10 + out * 10 - (1 - out) * 6;
          r = s.base[0] + shade;
          g = s.base[1] + shade * 0.9;
          b = s.base[2] + shade * 0.8;
          if (rand() < s.pebbles) {
            const pebble = rand() < 0.5 ? 38 : -34;
            r += pebble;
            g += pebble;
            b += pebble;
          }
        } else {
          // Asphalt: grain, soft blotches, and darker wheel tracks in every lane.
          let shade = (rand() * 2 - 1) * a.noise + blotch(px, y) * a.blotch + fine(px, y) * 3;
          for (const c of laneCentres) {
            for (const side of [-1, 1]) {
              const dist = (x - (c + side * a.wheelOffset)) / (a.wheelWidth / 2);
              shade -= a.wear * Math.exp(-dist * dist);
            }
          }
          r = a.base[0] + shade;
          g = a.base[1] + shade;
          b = a.base[2] + shade * 1.05;
        }
        d[i] = clamp255(r);
        d[i + 1] = clamp255(g);
        d[i + 2] = clamp255(b);
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    // Repair patches, cracks and oil stains, only on the asphalt (inside the edge lines).
    const roadPx = (x: number) => ((x + span) / (2 * span)) * W;
    ctx.save();
    ctx.beginPath();
    ctx.rect(roadPx(-0.94), 0, roadPx(0.94) - roadPx(-0.94), H);
    ctx.clip();
    for (let i = 0; i < a.patches; i++) {
      const w = roadPx(0.12 + rand() * 0.35) - roadPx(0);
      const h = 8 + rand() * 18;
      const px = roadPx(-0.9 + rand() * 1.5);
      const py = rand() * (H - h);
      ctx.fillStyle = rand() < 0.6 ? 'rgba(18, 18, 22, 0.16)' : 'rgba(210, 210, 215, 0.07)';
      ctx.fillRect(px, py, w, h);
      ctx.strokeStyle = 'rgba(15, 15, 18, 0.35)';
      ctx.strokeRect(px + 0.5, py + 0.5, w - 1, h - 1);
    }
    ctx.strokeStyle = 'rgba(18, 18, 20, 0.55)';
    ctx.lineWidth = 1;
    for (let i = 0; i < a.cracks; i++) {
      let cx = roadPx(-0.9 + rand() * 1.8);
      let cy = rand() * H;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let k = 0; k < 6; k++) {
        cx += (rand() - 0.5) * 38;
        cy += (rand() - 0.3) * 10;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
    for (let i = 0; i < a.stains; i++) {
      const lane = laneCentres[Math.floor(rand() * laneCentres.length)];
      ctx.fillStyle = 'rgba(14, 14, 18, 0.2)';
      ctx.beginPath();
      ctx.ellipse(roadPx(lane + (rand() - 0.5) * 0.12), rand() * H, 5 + rand() * 9, 2 + rand() * 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return canvas;
  }

  /** Copy of the asphalt strip with the edge lines, double yellow centre line and (optionally) white lane dashes. */
  private paintLines(base: HTMLCanvasElement, variant: number, dash: boolean): HTMLCanvasElement {
    const L = config.textures.lines;
    const span = config.road.textureSpan;
    const { width: W, rows: H } = config.textures.road;
    const rand = mulberry32(config.textures.seed + 5000 + variant * 31 + (dash ? 1 : 0));
    const [canvas, ctx] = newCanvas(W, H);
    ctx.drawImage(base, 0, 0);
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;

    const lines: { x: number; w: number; color: RGB; dashed: boolean }[] = [
      { x: -L.edgeX, w: L.edgeWidth, color: L.white, dashed: false },
      { x: L.edgeX, w: L.edgeWidth, color: L.white, dashed: false },
      { x: -L.centerX, w: L.centerWidth, color: L.yellow, dashed: false },
      { x: L.centerX, w: L.centerWidth, color: L.yellow, dashed: false },
      { x: -L.laneX, w: L.laneWidth, color: L.white, dashed: true },
      { x: L.laneX, w: L.laneWidth, color: L.white, dashed: true },
    ];

    for (let y = 0; y < H; y++) {
      for (let px = 0; px < W; px++) {
        const x = ((px + 0.5) / W) * 2 * span - span;
        for (const line of lines) {
          if (Math.abs(x - line.x) > line.w / 2) continue;
          if (line.dashed && !dash) continue;
          if (rand() < L.worn) continue; // worn-away paint
          const i = (y * W + px) * 4;
          const fade = 0.88 + rand() * 0.12;
          d[i] = clamp255(line.color[0] * fade);
          d[i + 1] = clamp255(line.color[1] * fade);
          d[i + 2] = clamp255(line.color[2] * fade);
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  }

  /** Green terrain with tonal variation: soft light/dark blotches, grain, blade streaks and the odd speck. */
  private buildGrass(variant: number, tone: 0 | 1): HTMLCanvasElement {
    const g = config.textures.grassTones;
    const { width: W, rows: H } = config.textures.grass;
    const rand = mulberry32(config.textures.seed + 9000 + variant * 977);
    const base = tone === 0 ? g.light : g.dark;
    const tint = (variant % 3) - 1; // slight hue drift between variants
    const [canvas, ctx] = newCanvas(W, H);
    const img = ctx.createImageData(W, H);
    const d = img.data;
    const big = lattice(rand, W, H, 64);
    const mid = lattice(rand, W, H, 18);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const shade = big(x, y) * g.blotch + mid(x, y) * g.blotch * 0.5 + (rand() * 2 - 1) * g.noise;
        const i = (y * W + x) * 4;
        d[i] = clamp255(base[0] + shade * 0.8 + tint * 3);
        d[i + 1] = clamp255(base[1] + shade);
        d[i + 2] = clamp255(base[2] + shade * 0.6 - tint * 2);
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    // Blade streaks (short vertical strokes) and a few dry / flower specks.
    for (let i = 0; i < 220; i++) {
      const x = rand() * W;
      const y = rand() * H;
      ctx.fillStyle = rand() < 0.5 ? 'rgba(40, 90, 30, 0.35)' : 'rgba(150, 200, 90, 0.28)';
      ctx.fillRect(x, y, 1, 2 + rand() * 4);
    }
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = rand() < 0.6 ? 'rgba(205, 190, 110, 0.5)' : 'rgba(235, 235, 220, 0.5)';
      ctx.fillRect(rand() * W, rand() * H, 1, 1);
    }
    return canvas;
  }
}
