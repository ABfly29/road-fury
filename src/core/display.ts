import { config } from '../config';

const { width: W, height: H } = config.render;

/**
 * Size the canvas to the largest 16:10 (render aspect) box that fits the window,
 * centred by CSS with black bars around it. Uses whole-number scale multiples in
 * device pixels when the window can fit at least 1x; below 1x it shrinks smoothly.
 */
export function fitCanvas(canvas: HTMLCanvasElement): void {
  const apply = () => {
    const dpr = window.devicePixelRatio || 1;
    const fit = Math.min(window.innerWidth / W, window.innerHeight / H);
    const deviceScale = fit * dpr;
    const scale = (deviceScale >= 1 ? Math.floor(deviceScale) : deviceScale) / dpr;
    canvas.style.width = `${Math.floor(W * scale * dpr) / dpr}px`;
    canvas.style.height = `${Math.floor(H * scale * dpr) / dpr}px`;
  };
  window.addEventListener('resize', apply);
  apply();
}
