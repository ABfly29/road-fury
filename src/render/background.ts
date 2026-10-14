import { config } from '../config';
import { mulberry32 } from '../core/random';
import type { CameraState } from '../entities/camera';
import { rgba } from './color';

const { width: W, height: H } = config.render;
const HORIZON = Math.round(H / 2);
const bg = config.background;
const LAYER_W = W * bg.layerWidthScale;

type Rand = () => number;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function make(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return [canvas, canvas.getContext('2d')!];
}

/** Soft round dab: opaque-ish centre fading to nothing. */
function dab(g: CanvasRenderingContext2D, x: number, y: number, r: number, inner: string, outer: string): void {
  const grad = g.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

/** Blue gradient, painted mottling and brush streaks, and the sun's glow. Static: made once. */
function buildSky(): HTMLCanvasElement {
  const [canvas, g] = make(W, HORIZON);
  const rand: Rand = mulberry32(bg.clouds.seed + 1);

  const grad = g.createLinearGradient(0, 0, 0, HORIZON);
  for (const [at, color] of bg.sky.stops) grad.addColorStop(at, color);
  g.fillStyle = grad;
  g.fillRect(0, 0, W, HORIZON);

  // Painted look: big soft blotches of lighter and deeper blue, then short horizontal brush strokes.
  const { blotches, streaks, strength } = bg.sky.mottle;
  for (let i = 0; i < blotches; i++) {
    const a = strength * (0.35 + rand() * 0.65);
    const light = rand() < 0.5;
    dab(g, rand() * W, rand() * HORIZON, 40 + rand() * 130, light ? `rgba(255, 255, 255, ${a})` : `rgba(14, 50, 130, ${a})`, 'rgba(0, 0, 0, 0)');
  }
  g.lineCap = 'round';
  for (let i = 0; i < streaks; i++) {
    const y = rand() * HORIZON;
    const x = rand() * W;
    g.lineWidth = 1 + rand() * 2.5;
    g.strokeStyle = rand() < 0.55 ? `rgba(255, 255, 255, ${strength * 0.9})` : `rgba(20, 70, 150, ${strength * 0.7})`;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 50 + rand() * 220, y + (rand() - 0.5) * 6);
    g.stroke();
  }

  // Sun: a wide warm glow added to the sky, and a small bright core.
  const sun = bg.sun;
  const sx = sun.x * W;
  const sy = HORIZON - sun.above;
  const [r, gr, b] = sun.color;
  g.globalCompositeOperation = 'lighter';
  const glow = g.createRadialGradient(sx, sy, 0, sx, sy, sun.glowRadius);
  glow.addColorStop(0, `rgba(${r}, ${gr}, ${b}, ${sun.glow})`);
  glow.addColorStop(0.2, `rgba(${r}, ${gr}, ${b}, ${sun.glow * 0.45})`);
  glow.addColorStop(0.55, `rgba(${r}, ${gr}, ${b}, ${sun.glow * 0.12})`);
  glow.addColorStop(1, `rgba(${r}, ${gr}, ${b}, 0)`);
  g.fillStyle = glow;
  g.fillRect(0, 0, W, HORIZON);
  g.globalCompositeOperation = 'source-over';
  dab(g, sx, sy, sun.core * 2.2, 'rgba(255, 252, 240, 1)', `rgba(${r}, ${gr}, ${b}, 0)`);
  dab(g, sx, sy, sun.core, 'rgba(255, 255, 250, 1)', 'rgba(255, 250, 235, 0)');
  return canvas;
}

/**
 * One soft cumulus cloud on its own canvas: shaded puffs underneath, lit puffs offset toward the sun, a
 * flattened soft base, and a few painted dabs. Returns the canvas and how far the base sits above its bottom.
 */
function buildCloud(rand: Rand, width: number): HTMLCanvasElement {
  const c = bg.clouds;
  const height = width * 0.4;
  const pad = width * 0.22;
  const [canvas, g] = make(Math.ceil(width + pad * 2), Math.ceil(height + pad * 2));
  const baseY = pad + height;
  const puffs = Math.round(lerp(c.puffs[0], c.puffs[1], rand()));

  const positions: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < puffs; i++) {
    const px = pad + width * (0.08 + 0.84 * rand());
    const edge = Math.abs((2 * (px - pad)) / width - 1);
    const dome = 1 - edge ** 1.7; // taller in the middle
    const r = height * (0.13 + 0.24 * rand() * (0.45 + dome));
    positions.push({ x: px, y: baseY - r * (0.45 + 0.9 * rand() * dome) - height * 0.08 * dome, r });
  }

  for (const p of positions) dab(g, p.x, p.y + p.r * 0.14, p.r * 1.05, rgba(c.shade, 0.5), rgba(c.shade, 0));
  for (const p of positions) {
    const lit = g.createRadialGradient(p.x + p.r * 0.16, p.y - p.r * 0.22, 0, p.x + p.r * 0.1, p.y - p.r * 0.12, p.r);
    lit.addColorStop(0, rgba(c.light, 1));
    lit.addColorStop(0.62, rgba(c.light, 0.9));
    lit.addColorStop(1, rgba(c.light, 0));
    g.fillStyle = lit;
    g.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
  }

  // Flatten the base with a soft edge.
  g.globalCompositeOperation = 'destination-out';
  const fade = g.createLinearGradient(0, baseY - height * 0.22, 0, baseY + height * 0.04);
  fade.addColorStop(0, 'rgba(0, 0, 0, 0)');
  fade.addColorStop(1, 'rgba(0, 0, 0, 1)');
  g.fillStyle = fade;
  g.fillRect(0, baseY - height * 0.22, canvas.width, canvas.height);

  // Painted dabs, only where the cloud already is.
  g.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 40; i++) {
    const x = pad + rand() * width;
    const y = baseY - rand() * height * 0.9;
    const light = rand() < 0.55;
    dab(g, x, y, 6 + rand() * 14, light ? 'rgba(255, 255, 250, 0.12)' : rgba(c.shade, 0.1), 'rgba(0, 0, 0, 0)');
  }
  g.globalCompositeOperation = 'source-over';
  return canvas;
}

/** A wide strip of cumulus clouds that wraps horizontally, so it can drift forever. Bigger and higher = closer. */
function buildClouds(): HTMLCanvasElement {
  const c = bg.clouds;
  const [canvas, g] = make(LAYER_W, HORIZON);
  const rand: Rand = mulberry32(c.seed);

  for (let i = 0; i < c.count; i++) {
    const t = rand(); // 0 = high in the sky, 1 = near the horizon
    const yFrac = lerp(c.baseY[0], c.baseY[1], t);
    const width = lerp(c.width[1], c.width[0], t) * (0.8 + 0.4 * rand());
    const cloud = buildCloud(rand, width);
    const x = ((i + rand() * 0.7) / c.count) * LAYER_W;
    const y = yFrac * HORIZON - (cloud.height - cloud.width * 0.22);
    g.globalAlpha = lerp(1, 0.82, t);
    for (const wrap of [-LAYER_W, 0, LAYER_W]) g.drawImage(cloud, x - cloud.width / 2 + wrap, y);
  }
  g.globalAlpha = 1;
  return canvas;
}

type LayerConfig = (typeof bg.layers)[number];

/**
 * A jagged ridgeline that wraps seamlessly (midpoint displacement with the first and last point equal), filled
 * with a gradient that fades into the haze at the foot, with a faint sunlit rim along the crest.
 */
function buildMountains(layer: LayerConfig): HTMLCanvasElement {
  const [canvas, g] = make(LAYER_W, layer.height);
  const rand: Rand = mulberry32(layer.seed);

  const N = 512; // points around the loop (a power of two for the subdivision)
  const h = new Float32Array(N + 1);
  h[0] = h[N] = rand();
  let amp = 1;
  for (let step = N; step > 1; step >>= 1) {
    for (let i = 0; i < N; i += step) {
      h[i + step / 2] = (h[i] + h[i + step]) / 2 + (rand() - 0.5) * amp;
    }
    amp *= 0.5 ** layer.roughness;
  }
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of h) {
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  const ridgeY = (i: number) => layer.height * (1 - (0.14 + 0.86 * ((h[i] - lo) / (hi - lo)) ** layer.sharpen));

  const grad = g.createLinearGradient(0, 0, 0, layer.height);
  grad.addColorStop(0, layer.top);
  grad.addColorStop(1, layer.bottom);
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(0, layer.height);
  for (let i = 0; i <= N; i++) g.lineTo((i / N) * LAYER_W, ridgeY(i));
  g.lineTo(LAYER_W, layer.height);
  g.closePath();
  g.fill();

  g.strokeStyle = `rgba(255, 246, 226, ${layer.rim})`;
  g.lineWidth = 1.4;
  g.beginPath();
  for (let i = 0; i <= N; i++) {
    if (i === 0) g.moveTo(0, ridgeY(0));
    else g.lineTo((i / N) * LAYER_W, ridgeY(i));
  }
  g.stroke();
  return canvas;
}

/** Haze lying on the horizon: transparent above, nearly opaque at the horizon line. */
function buildHaze(): HTMLCanvasElement {
  const [canvas, g] = make(W, bg.haze.height);
  const grad = g.createLinearGradient(0, 0, 0, bg.haze.height);
  grad.addColorStop(0, rgba(config.fog.color, 0));
  grad.addColorStop(0.6, rgba(config.fog.color, bg.haze.strength * 0.5));
  grad.addColorStop(1, rgba(config.fog.color, bg.haze.strength));
  g.fillStyle = grad;
  g.fillRect(0, 0, W, bg.haze.height);
  return canvas;
}

/**
 * Draw a wrapping strip so that it fills the screen width starting `offset` pixels into the strip: only the
 * visible columns are copied (one blit, or two across the wrap).
 */
function blitWrapped(ctx: CanvasRenderingContext2D, strip: HTMLCanvasElement, offset: number, y: number): void {
  const x = ((offset % LAYER_W) + LAYER_W) % LAYER_W;
  const h = strip.height;
  if (x + W <= LAYER_W) {
    ctx.drawImage(strip, x, 0, W, h, 0, y, W, h);
  } else {
    const first = LAYER_W - x;
    ctx.drawImage(strip, x, 0, first, h, 0, y, first, h);
    ctx.drawImage(strip, 0, 0, W - first, h, first, y, W - first, h);
  }
}

/** Sky, clouds, mountains and haze. Reads state only; everything is pre-rendered, so drawing is a few blits. */
export class Background {
  private readonly sky = buildSky();
  private readonly clouds = buildClouds();
  private readonly mountains = bg.layers.map(buildMountains);
  private readonly haze = buildHaze();

  draw(ctx: CanvasRenderingContext2D, cam: Pick<CameraState, 'parallax' | 'cloudOffset'>): void {
    // The sky is copied 1:1; the clouds drift slowly, so they get sub-pixel smoothing; the mountains move in whole pixels.
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.sky, 0, 0);

    ctx.imageSmoothingEnabled = true;
    blitWrapped(ctx, this.clouds, cam.cloudOffset * LAYER_W, 0);
    ctx.imageSmoothingEnabled = false;

    // Ground beyond the draw distance is the haze colour; the road fogs into it.
    ctx.fillStyle = config.fog.color;
    ctx.fillRect(0, HORIZON, W, H - HORIZON);

    this.mountains.forEach((layer, i) => {
      blitWrapped(ctx, layer, Math.round(cam.parallax[i] * LAYER_W), HORIZON - layer.height);
    });

    ctx.drawImage(this.haze, 0, HORIZON - bg.haze.height);
  }
}
