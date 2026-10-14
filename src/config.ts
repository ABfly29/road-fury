/** All tuning values live here. No magic numbers elsewhere. */

const SEGMENT_LENGTH = 200;
const UPDATE_HZ = 60;

export const config = {
  loop: {
    /** Fixed simulation rate (Hz). */
    updateHz: UPDATE_HZ,
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

  road: {
    /** World units per segment (z length). */
    segmentLength: SEGMENT_LENGTH,
    /** Half-width of the road: it spans -roadWidth..+roadWidth. */
    roadWidth: 2000,
    /** Segments per rumble/dash band; colors alternate every band. */
    rumbleLength: 3,
    lanes: 4,
    /** Rumble strip width as a fraction of the road half-width. */
    rumbleWidth: 1 / 8,
    /** Lane marking width as a fraction of the road half-width. */
    laneMarkerWidth: 1 / 32,
  },

  camera: {
    /** Horizontal field of view in degrees. */
    fov: 100,
    /** Camera height above the road surface (world units). */
    height: 1000,
    /** Number of segments drawn ahead of the camera. */
    drawDistance: 300,
    /** Top speed: one segment per fixed update. */
    maxSpeed: SEGMENT_LENGTH * UPDATE_HZ,
    accel: (SEGMENT_LENGTH * UPDATE_HZ) / 5,
    brake: SEGMENT_LENGTH * UPDATE_HZ,
    /** Speed lost per second with no key held (0 = cruise at current speed). */
    coastDecel: 0,
    /** Sideways speed in road half-widths per second (temporary test control). */
    lateralSpeed: 1.5,
    /** Max sideways offset in road half-widths. */
    maxOffset: 2,
  },

  fog: {
    /** Exponential fog: factor = 1 / e^(t^2 * density), t = distance / drawDistance. */
    density: 5,
    color: '#c9d8e6',
  },

  colors: {
    light: { road: '#6b6b6b', grass: '#10aa10', rumble: '#cc2222', lane: '#cccccc' },
    dark: { road: '#696969', grass: '#009a00', rumble: '#eeeeee', lane: '' },
  },

  background: {
    skyTop: '#2f6fc8',
    skyHorizon: '#c9d8e6',
    /** Parallax mountain layers, far to near. speed = layer widths/s per unit curve at top speed. */
    layers: [
      { color: '#8da3bf', height: 110, points: 9, minPeak: 0.35, maxPeak: 1, speed: 0.015, seed: 11 },
      { color: '#5d7896', height: 70, points: 13, minPeak: 0.3, maxPeak: 1, speed: 0.03, seed: 29 },
    ],
    /** Layer canvas width as a multiple of the screen width (must be >= 1). */
    layerWidthScale: 2,
  },

  track: {
    length: { short: 25, medium: 50, long: 100 },
    curve: { easy: 2, medium: 4, hard: 6 },
    /** Hill heights in segment lengths. */
    hill: { low: 20, medium: 40, high: 60 },
  },
} as const;
