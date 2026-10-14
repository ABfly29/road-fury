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
    /** Speed readout: what top speed displays as, in mph. */
    topSpeedMph: 160,
    speedFont: 'bold 28px monospace',
    speedColor: '#ffffff',
    speedShadow: '#000000',
    speedRight: 16,
    speedBottom: 14,
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
  },

  /** Bike handling. Speeds are world units per second; x is in road half-widths (+-1 = road edges). */
  physics: {
    /** One segment per fixed update. */
    maxSpeed: SEGMENT_LENGTH * UPDATE_HZ,
    /** 0 -> top speed in 5 s. */
    accel: (SEGMENT_LENGTH * UPDATE_HZ) / 5,
    /** Top speed -> 0 in 1 s. */
    brake: SEGMENT_LENGTH * UPDATE_HZ,
    /** Speed lost with no input: top speed -> 0 in 5 s. */
    coastDecel: (SEGMENT_LENGTH * UPDATE_HZ) / 5,
    /** Steering in road half-widths per second at top speed; scales linearly with speed. */
    steerRate: 2,
    /** Outward push on curves = steerStep * speedPercent * curve * centrifugal. */
    centrifugal: 0.3,
    /** Off-road (|x| > 1) speed cap as a fraction of top speed. */
    offRoadLimit: 0.25,
    /** How fast speed drops to the off-road cap (top speed -> cap in 1.5 s). */
    offRoadDecel: (SEGMENT_LENGTH * UPDATE_HZ) / 2,
    /** Hard clamp on x. */
    maxX: 2,
    /** Lean target from steering input (0..1 of full lean). */
    leanSteer: 0.7,
    /** Lean target per unit of curve, scaled by speed (curve 6 at top speed = 0.9). */
    leanCurve: 0.15,
    /** How quickly lean follows its target (1/s). */
    leanResponse: 8,
    /** Speed fraction at which lean reaches full strength (no lean when stopped). */
    leanSpeedRamp: 0.5,
  },

  bike: {
    /** Handlebar span in world units; sets the sprite size at the player's distance. */
    width: 230,
    /** Pixels the bike sits above the bottom edge of the canvas. */
    bottomMargin: 8,
    /** Lean angle at full lean (radians). */
    maxLeanAngle: 0.4,
    /** Bounce height in pixels at top speed. */
    bounceAmplitude: 2,
    /** Distance travelled per bounce cycle (world units). */
    bounceWavelength: 900,
    colors: {
      tyre: '#151515',
      tread: '#2e2e2e',
      body: '#c7231f',
      tailLight: '#ff5a4d',
      pants: '#1d2230',
      boots: '#0e0e0e',
      jacket: '#1f4fbf',
      jacketStripe: '#e9e9e9',
      sleeve: '#1a3fa0',
      bars: '#222222',
      grips: '#111111',
      exhaust: '#9a9a9a',
      helmet: '#f2f2f2',
      helmetStripe: '#d22222',
      shadow: 'rgba(0, 0, 0, 0.35)',
    },
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
