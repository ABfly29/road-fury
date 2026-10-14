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
      bush: drawBush,
      scrub: drawScrub,
      fence: drawFence,
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

/** Variant 0: bright oak, 1: dark oak, 2: pine. */
function drawTree(c: CanvasRenderingContext2D, w: number, h: number, variant: number): void {
  if (variant === 2) {
    // Pine: trunk and stacked, slightly ragged cones.
    c.fillStyle = '#5a3a20';
    c.fillRect(w * 0.45, h * 0.78, w * 0.1, h * 0.22);
    const tiers: [number, number, number, string][] = [
      [0.86, 0.5, 0.46, '#1d5a2c'],
      [0.64, 0.4, 0.4, '#236b33'],
      [0.44, 0.3, 0.33, '#2a7c3b'],
      [0.26, 0.2, 0.26, '#33904a'],
    ];
    for (const [base, spread, height, color] of tiers) {
      c.fillStyle = color;
      c.beginPath();
      c.moveTo(w * (0.5 - spread), h * base);
      c.lineTo(w * 0.5, h * (base - height));
      c.lineTo(w * (0.5 + spread), h * base);
      c.closePath();
      c.fill();
    }
    return;
  }
  const dark = variant === 1;
  c.fillStyle = '#6b4423';
  c.fillRect(w * 0.45, h * 0.55, w * 0.1, h * 0.45);
  c.fillStyle = '#5a381c';
  c.fillRect(w * 0.5, h * 0.55, w * 0.05, h * 0.45);
  const blobs: [number, number, number, string][] = dark
    ? [
        [0.5, 0.42, 0.34, '#17502a'],
        [0.3, 0.52, 0.24, '#1d6232'],
        [0.7, 0.52, 0.24, '#1d6232'],
        [0.5, 0.28, 0.26, '#26773c'],
        [0.4, 0.4, 0.16, '#318a48'],
      ]
    : [
        [0.5, 0.42, 0.34, '#2c7c35'],
        [0.3, 0.52, 0.24, '#33903d'],
        [0.7, 0.52, 0.24, '#33903d'],
        [0.5, 0.28, 0.26, '#40a84a'],
        [0.4, 0.4, 0.16, '#58c25f'],
      ];
  for (const [x, y, r, color] of blobs) {
    c.fillStyle = color;
    c.beginPath();
    c.ellipse(w * x, h * y, w * r, h * r * 0.9, 0, 0, Math.PI * 2);
    c.fill();
  }
}

/** Variant 0: grey, 1: sandstone, 2: dark granite. */
function drawRock(c: CanvasRenderingContext2D, w: number, h: number, variant: number): void {
  const tones = [
    ['#6f6f6f', '#929292'],
    ['#8a7358', '#b09a78'],
    ['#4d4f55', '#72757d'],
  ][variant % 3];
  c.fillStyle = tones[0];
  c.beginPath();
  c.moveTo(0, h);
  c.lineTo(w * 0.08, h * 0.5);
  c.lineTo(w * 0.3, h * 0.12);
  c.lineTo(w * 0.62, h * 0.02);
  c.lineTo(w * 0.9, h * 0.4);
  c.lineTo(w, h);
  c.closePath();
  c.fill();
  c.fillStyle = tones[1];
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

/** Round bush from overlapping blobs. Variant 0: green, 1: olive, 2: green with flowers. */
function drawBush(c: CanvasRenderingContext2D, w: number, h: number, variant: number): void {
  const palette = [
    ['#235f2a', '#2f7a36', '#42a04a'],
    ['#4a5a22', '#62772c', '#82a03a'],
    ['#235f2a', '#2f7a36', '#42a04a'],
  ][variant % 3];
  const blobs: [number, number, number][] = [
    [0.22, 0.68, 0.22],
    [0.5, 0.58, 0.3],
    [0.78, 0.68, 0.22],
    [0.36, 0.4, 0.2],
    [0.62, 0.38, 0.22],
  ];
  c.fillStyle = 'rgba(0, 0, 0, 0.22)';
  c.fillRect(w * 0.1, h * 0.88, w * 0.8, h * 0.12);
  for (const [i, tone] of [0, 1, 2].entries()) {
    c.fillStyle = palette[tone];
    for (const [x, y, r] of blobs) {
      c.beginPath();
      c.ellipse(w * x, h * (y + 0.1) - i * h * 0.04, w * r * (1 - i * 0.18), h * r * 0.95 * (1 - i * 0.18), 0, 0, Math.PI * 2);
      c.fill();
    }
  }
  if (variant % 3 === 2) {
    const flowers: [number, number, string][] = [
      [0.3, 0.45, '#ffd84a'], [0.55, 0.3, '#ffffff'], [0.7, 0.5, '#ffd84a'], [0.45, 0.6, '#ff7a7a'], [0.2, 0.62, '#ffffff'],
    ];
    for (const [x, y, color] of flowers) {
      c.fillStyle = color;
      c.fillRect(w * x, h * y, Math.max(1, w * 0.045), Math.max(1, w * 0.045));
    }
  }
}

/** Dry scrub: a low bush with tufts of straw-coloured grass. Variant 0: straw, 1: olive, 2: rust. */
function drawScrub(c: CanvasRenderingContext2D, w: number, h: number, variant: number): void {
  const palette = [
    ['#8a7a3c', '#b8a55a', '#d4c47a'],
    ['#5c6a2e', '#7f9140', '#a3b55a'],
    ['#8a5a30', '#b07a44', '#cf9a62'],
  ][variant % 3];
  c.fillStyle = 'rgba(0, 0, 0, 0.18)';
  c.fillRect(w * 0.12, h * 0.9, w * 0.76, h * 0.1);
  c.fillStyle = palette[0];
  c.beginPath();
  c.ellipse(w * 0.5, h * 0.74, w * 0.32, h * 0.22, 0, 0, Math.PI * 2);
  c.fill();
  c.lineWidth = Math.max(1, w * 0.03);
  c.lineCap = 'round';
  for (let i = 0; i < 16; i++) {
    const t = i / 15;
    const x = w * (0.12 + t * 0.76);
    const lean = (t - 0.5) * 0.5;
    c.strokeStyle = palette[1 + (i % 2)];
    c.beginPath();
    c.moveTo(x, h * 0.92);
    c.quadraticCurveTo(x + w * lean * 0.3, h * 0.55, x + w * lean, h * (0.14 + 0.2 * Math.abs(t - 0.5) + 0.1 * (i % 3)));
    c.stroke();
  }
}

/** Weathered wooden fence post with a couple of strands of wire. */
function drawFence(c: CanvasRenderingContext2D, w: number, h: number): void {
  c.strokeStyle = 'rgba(70, 70, 74, 0.8)';
  c.lineWidth = Math.max(1, w * 0.04);
  for (const y of [0.3, 0.55]) {
    c.beginPath();
    c.moveTo(0, h * y);
    c.lineTo(w, h * (y + 0.03));
    c.stroke();
  }
  c.fillStyle = '#7b5a3a';
  c.beginPath();
  c.moveTo(w * 0.3, h);
  c.lineTo(w * 0.3, h * 0.06);
  c.lineTo(w * 0.5, 0);
  c.lineTo(w * 0.7, h * 0.06);
  c.lineTo(w * 0.7, h);
  c.closePath();
  c.fill();
  c.fillStyle = '#9a7a56';
  c.fillRect(w * 0.3, h * 0.06, w * 0.14, h * 0.94);
  c.fillStyle = 'rgba(40, 25, 12, 0.45)';
  c.fillRect(w * 0.56, h * 0.15, Math.max(1, w * 0.04), h * 0.3);
  c.fillRect(w * 0.46, h * 0.55, Math.max(1, w * 0.04), h * 0.25);
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
