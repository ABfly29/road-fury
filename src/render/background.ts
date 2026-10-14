import { config } from '../config';
import { mulberry32 } from '../core/random';

type LayerConfig = (typeof config.background.layers)[number];

/** Pre-render one tileable mountain silhouette (first and last peak match, so it wraps). */
function createMountainLayer(layer: LayerConfig, width: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = layer.height;
  const ctx = canvas.getContext('2d')!;
  const rand = mulberry32(layer.seed);
  const peaks = Array.from({ length: layer.points }, () => layer.minPeak + rand() * (layer.maxPeak - layer.minPeak));

  ctx.fillStyle = layer.color;
  ctx.beginPath();
  ctx.moveTo(0, layer.height);
  for (let i = 0; i <= layer.points; i++) {
    ctx.lineTo((i * width) / layer.points, layer.height * (1 - peaks[i % layer.points]));
  }
  ctx.lineTo(width, layer.height);
  ctx.closePath();
  ctx.fill();
  return canvas;
}

/** Sky gradient, ground haze and parallax mountains. Reads state only. */
export class Background {
  private readonly layers: HTMLCanvasElement[];
  private readonly sky: CanvasGradient;
  private readonly horizon = Math.round(config.render.height / 2);

  constructor(ctx: CanvasRenderingContext2D) {
    const width = config.render.width * config.background.layerWidthScale;
    this.layers = config.background.layers.map((l) => createMountainLayer(l, width));
    this.sky = ctx.createLinearGradient(0, 0, 0, this.horizon);
    this.sky.addColorStop(0, config.background.skyTop);
    this.sky.addColorStop(1, config.background.skyHorizon);
  }

  draw(ctx: CanvasRenderingContext2D, parallax: readonly number[]): void {
    const { width, height } = config.render;
    ctx.fillStyle = this.sky;
    ctx.fillRect(0, 0, width, this.horizon);
    // Ground beyond the draw distance fades into the fog color.
    ctx.fillStyle = config.fog.color;
    ctx.fillRect(0, this.horizon, width, height - this.horizon);

    this.layers.forEach((layer, i) => {
      const frac = ((parallax[i] % 1) + 1) % 1;
      const x = -Math.round(frac * layer.width);
      const y = this.horizon - layer.height;
      ctx.drawImage(layer, x, y);
      ctx.drawImage(layer, x + layer.width, y);
    });
  }
}
