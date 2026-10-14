/** All tuning values live here. No magic numbers elsewhere. */
export const config = {
  loop: {
    /** Fixed simulation rate (Hz). */
    updateHz: 60,
    /** Max frame time (s) accepted, avoids spiral of death after tab stalls. */
    maxFrameTime: 0.25,
  },
  render: {
    width: 640,
    height: 400,
    backgroundColor: '#0a0a14',
  },
  hud: {
    fpsFont: '12px monospace',
    fpsColor: '#0f0',
    fpsX: 8,
    fpsY: 16,
    /** Seconds over which FPS is averaged. */
    fpsSampleWindow: 0.5,
  },
} as const;
