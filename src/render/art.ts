import { config } from '../config';
import type { SceneryType } from '../world/scenery';

/**
 * All scenery art lives here. Every sprite is pre-rendered once from canvas shapes into a bitmap;
 * the renderer only ever calls `get()` and scales the result. To use real sprite sheets later,
 * replace what `get()` returns (any CanvasImageSource) and leave the rest of the game alone.
 */
export class Art {
  private readonly images = new Map<string, HTMLCanvasElement>();

  /** Bitmap for a scenery type, anchored at its bottom centre. */
  get(type: SceneryType, variant = 0): CanvasImageSource {
    const key = `${type}:${variant}`;
    let img = this.images.get(key);
    if (!img) {
      img = this.render(type, variant);
      this.images.set(key, img);
    }
    return img;
  }

  private render(type: SceneryType, variant: number): HTMLCanvasElement {
    const t = config.scenery.types[type];
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(t.width * config.scenery.artPxPerUnit));
    canvas.height = Math.max(1, Math.round(t.height * config.scenery.artPxPerUnit));
    const ctx = canvas.getContext('2d')!;
    const draw: Record<SceneryType, (c: CanvasRenderingContext2D, w: number, h: number, v: number) => void> = {
      palm: drawPalm,
      tree: drawTree,
      rock: drawRock,
      post: drawPost,
      billboard: drawBillboard,
      chevron: drawChevron,
    };
    draw[type](ctx, canvas.width, canvas.height, variant);
    return canvas;
  }
}

function drawPalm(c: CanvasRenderingContext2D, w: number, h: number): void {
  const topX = w * 0.6;
  const topY = h * 0.2;

  // Curved trunk, tapering upward.
  c.fillStyle = '#7a5230';
  c.beginPath();
  c.moveTo(w * 0.44, h);
  c.quadraticCurveTo(w * 0.42, h * 0.55, topX - w * 0.035, topY);
  c.lineTo(topX + w * 0.035, topY);
  c.quadraticCurveTo(w * 0.54, h * 0.55, w * 0.56, h);
  c.closePath();
  c.fill();
  c.strokeStyle = '#5a3a20';
  c.lineWidth = Math.max(1, w * 0.012);
  for (let y = h * 0.3; y < h * 0.95; y += h * 0.07) {
    c.beginPath();
    c.moveTo(w * (0.43 + (y / h - 0.3) * 0.03), y);
    c.lineTo(w * (0.57 - (1 - y / h) * 0.04), y);
    c.stroke();
  }

  // Fronds: drooping curved leaves around the crown.
  const fronds = [-2.9, -2.3, -1.7, -0.9, -0.3, 0.2, 0.7];
  fronds.forEach((a, i) => {
    const len = w * (0.42 + (i % 2) * 0.06);
    const tipX = topX + Math.cos(a) * len;
    const tipY = topY + Math.sin(a) * len * 0.35 + len * 0.45;
    const ctrlX = topX + Math.cos(a) * len * 0.6;
    const ctrlY = topY - len * 0.32;
    c.fillStyle = i % 2 ? '#2aa83a' : '#1e8a2e';
    c.beginPath();
    c.moveTo(topX, topY);
    c.quadraticCurveTo(ctrlX, ctrlY - w * 0.04, tipX, tipY);
    c.quadraticCurveTo(ctrlX, ctrlY + w * 0.06, topX, topY);
    c.fill();
  });

  c.fillStyle = '#4a2d12';
  c.beginPath();
  c.arc(topX - w * 0.03, topY + h * 0.02, w * 0.03, 0, Math.PI * 2);
  c.arc(topX + w * 0.03, topY + h * 0.025, w * 0.03, 0, Math.PI * 2);
  c.fill();
}

function drawTree(c: CanvasRenderingContext2D, w: number, h: number): void {
  c.fillStyle = '#6b4423';
  c.fillRect(w * 0.45, h * 0.55, w * 0.1, h * 0.45);
  const blobs: [number, number, number, string][] = [
    [0.5, 0.42, 0.34, '#1f6b2a'],
    [0.3, 0.52, 0.24, '#25802f'],
    [0.7, 0.52, 0.24, '#25802f'],
    [0.5, 0.28, 0.26, '#2f9a3a'],
    [0.4, 0.4, 0.16, '#3bb34a'],
  ];
  for (const [x, y, r, color] of blobs) {
    c.fillStyle = color;
    c.beginPath();
    c.ellipse(w * x, h * y, w * r, h * r * 0.9, 0, 0, Math.PI * 2);
    c.fill();
  }
}

function drawRock(c: CanvasRenderingContext2D, w: number, h: number): void {
  c.fillStyle = '#6f6f6f';
  c.beginPath();
  c.moveTo(0, h);
  c.lineTo(w * 0.08, h * 0.5);
  c.lineTo(w * 0.3, h * 0.12);
  c.lineTo(w * 0.62, h * 0.02);
  c.lineTo(w * 0.9, h * 0.4);
  c.lineTo(w, h);
  c.closePath();
  c.fill();
  c.fillStyle = '#929292';
  c.beginPath();
  c.moveTo(w * 0.3, h * 0.12);
  c.lineTo(w * 0.62, h * 0.02);
  c.lineTo(w * 0.9, h * 0.4);
  c.lineTo(w * 0.55, h * 0.45);
  c.closePath();
  c.fill();
  c.fillStyle = 'rgba(0, 0, 0, 0.18)';
  c.fillRect(w * 0.1, h * 0.8, w * 0.8, h * 0.2);
}

function drawPost(c: CanvasRenderingContext2D, w: number, h: number): void {
  c.fillStyle = '#f4f4f4';
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#d22222';
  c.fillRect(0, h * 0.12, w, h * 0.1);
  c.fillStyle = '#ffd400';
  c.fillRect(w * 0.2, h * 0.3, w * 0.6, h * 0.08);
}

function drawBillboard(c: CanvasRenderingContext2D, w: number, h: number, variant: number): void {
  const design = config.scenery.billboards[variant % config.scenery.billboards.length];
  c.fillStyle = '#555';
  c.fillRect(w * 0.18, h * 0.4, w * 0.05, h * 0.6);
  c.fillRect(w * 0.77, h * 0.4, w * 0.05, h * 0.6);
  const bx = 0;
  const by = 0;
  const bw = w;
  const bh = h * 0.5;
  c.fillStyle = '#e8e8e8';
  c.fillRect(bx, by, bw, bh);
  c.fillStyle = design.back;
  c.fillRect(bx + bw * 0.03, by + bh * 0.06, bw * 0.94, bh * 0.88);
  c.fillStyle = design.fore;
  c.fillRect(bx + bw * 0.03, by + bh * 0.72, bw * 0.94, bh * 0.07);
  // Shrink the text until it fits the board.
  let size = Math.round(bh * 0.4);
  c.font = `bold ${size}px sans-serif`;
  const textWidth = c.measureText(design.text).width;
  if (textWidth > bw * 0.86) {
    size = Math.floor((size * bw * 0.86) / textWidth);
    c.font = `bold ${size}px sans-serif`;
  }
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(design.text, bw / 2, by + bh * 0.4);
}

/** variant 0 points right (right-hand bend), variant 1 points left. */
function drawChevron(c: CanvasRenderingContext2D, w: number, h: number, variant: number): void {
  c.fillStyle = '#666';
  c.fillRect(w * 0.46, h * 0.5, w * 0.08, h * 0.5);
  c.fillStyle = '#111';
  c.fillRect(0, 0, w, h * 0.64);
  c.fillStyle = '#f5c400';
  c.fillRect(w * 0.04, h * 0.03, w * 0.92, h * 0.58);
  c.strokeStyle = '#111';
  c.lineWidth = w * 0.09;
  c.lineJoin = 'miter';
  const dir = variant === 0 ? 1 : -1;
  const cx = w / 2;
  const cy = h * 0.32;
  for (const dx of [-0.17, 0.07]) {
    c.beginPath();
    c.moveTo(cx + (dx - dir * 0.12) * w, cy - h * 0.2);
    c.lineTo(cx + (dx + dir * 0.12) * w, cy);
    c.lineTo(cx + (dx - dir * 0.12) * w, cy + h * 0.2);
    c.stroke();
  }
}
