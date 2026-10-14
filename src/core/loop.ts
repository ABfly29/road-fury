import { config } from '../config';

export interface LoopHandlers {
  /** Advance simulation by exactly one fixed step (seconds). */
  update(dt: number): void;
  /** Draw current state. alpha = 0..1 progress between updates. */
  render(alpha: number): void;
}

/** Fixed-timestep loop: update at config.loop.updateHz, render once per rAF. */
export function startLoop({ update, render }: LoopHandlers): () => void {
  const step = 1 / config.loop.updateHz;
  let acc = 0;
  let last = performance.now();
  let raf = 0;

  const frame = (now: number) => {
    const frameTime = Math.min((now - last) / 1000, config.loop.maxFrameTime);
    last = now;
    acc += frameTime;
    while (acc >= step) {
      update(step);
      acc -= step;
    }
    render(acc / step);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
