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
    width: 960,
    height: 540,
    backgroundColor: '#0a0a14',
    /** The HUD is laid out in a 640x360 space (config.hud.width/height) and scaled up by this to fill the canvas. */
    hudScale: 1.5,
  },
  hud: {
    /** Logical size of the HUD layout space (render size / hudScale). */
    width: 640,
    height: 360,
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
    healthWidth: 120,
    healthHeight: 10,
    healthRight: 16,
    healthTop: 24,
    healthBack: 'rgba(0, 0, 0, 0.55)',
    healthBorder: '#ffffff',
    healthGood: '#3ddc4a',
    healthWarn: '#ffd23f',
    healthLow: '#ff3b30',
    /** Health fractions below which the bar turns yellow / red. */
    healthWarnBelow: 0.5,
    healthLowBelow: 0.25,
    labelFont: 'bold 10px monospace',
    wipeoutText: 'WIPEOUT!',
    wipeoutFont: 'bold 56px monospace',
    wipeoutColor: '#ff2a2a',
    wipeoutOutline: '#000000',
    /** Wipeout text is at this fraction of the canvas height. */
    wipeoutY: 0.32,
    /** Seconds for the wipeout text to pop in. */
    wipeoutPop: 0.25,
    positionFont: 'bold 22px monospace',
    positionColor: '#ffffff',
    infoFont: 'bold 14px monospace',
    infoX: 12,
    infoBottom: 14,
    countdownFont: 'bold 96px monospace',
    countdownColors: ['#ff3b30', '#ffd23f', '#3ddc4a'],
    goColor: '#3ddc4a',
    resultsFont: 'bold 13px monospace',
    resultsTitleFont: 'bold 30px monospace',
    resultsBack: 'rgba(0, 0, 0, 0.72)',
    resultsPlayer: '#ffd23f',
    resultsText: '#ffffff',
    resultsDim: '#9aa4b0',
  },

  road: {
    /** World units per segment (z length). */
    segmentLength: SEGMENT_LENGTH,
    /** Half-width of the road: it spans -roadWidth..+roadWidth. */
    roadWidth: 2000,
    /** Segments per band: lane dashes and the grass tone alternate every band. */
    rumbleLength: 3,
    lanes: 4,
    /** White lane dashes: on for dashOn segments out of every dashPeriod (must divide the track length). */
    dashPeriod: 12,
    dashOn: 4,
    /** The road texture strip covers this many road half-widths either side of the centre (road + dirt shoulder). */
    textureSpan: 1.3,
  },

  camera: {
    /** Horizontal field of view in degrees. */
    fov: 100,
    /** Camera height above the road surface (world units). Low, so the road fills the lower half of the screen. */
    height: 700,
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
    /** Speed fraction at which lean reaches full strength (no lean when stopped). */
    leanSpeedRamp: 0.5,
  },

  /** Analog controls: smoothed axes, steering falloff, lean spring and camera response. */
  input: {
    /** Steer axis rise toward +-1 while a key is held (1/s). 4 = full in 0.25 s. */
    steerRise: 4,
    /** Steer axis return to 0 after release (1/s). 6 = 0.17 s. */
    steerFall: 6,
    /** Rate while crossing zero toward the opposite direction (1/s): faster than steerRise. */
    steerCross: 10,
    /** Throttle axis ramp in / out (1/s). 5 = full in 0.2 s. */
    throttleRise: 5,
    throttleFall: 8,
    /** Brake axis ramp in / out (1/s). */
    brakeRise: 5,
    brakeFall: 10,
    /** Steering effectiveness lost between standstill and top speed (0.35 = 35% weaker at top speed). */
    steerSpeedLoss: 0.35,

    /** Lean follows its target through a spring-damper. Natural frequency (rad/s) and damping ratio (<1 overshoots). */
    leanFrequency: 12,
    leanDamping: 0.6,
    /** Hard limit on lean, including overshoot (1 = the target's full lean). */
    leanMax: 1.3,

    /** Camera roll at full lean (degrees). */
    rollMaxDeg: 1.5,
    /** Camera x shift in road half-widths per unit of steer / lean (scaled by speed). */
    camXSteer: 0.06,
    camXLean: 0.04,
    /** Extra FOV (degrees) while accelerating hard, and how quickly it follows (1/s). */
    fovKick: 4,
    fovKickResponse: 3,

    debug: {
      x: 8,
      y: 26,
      width: 150,
      barHeight: 9,
      gap: 14,
      font: '10px monospace',
      back: 'rgba(0, 0, 0, 0.6)',
      border: '#ffffff',
      steer: '#4db8ff',
      throttle: '#3ddc4a',
      brake: '#ff5a4d',
      lean: '#ffd23f',
      text: '#ffffff',
    },
  },

  bike: {
    /** Handlebar span in world units; sets the sprite size at the player's distance. */
    width: 170,
    /** Pixels the bike sits above the bottom edge of the canvas (keeps tyre, shadow and a leaning bike fully on screen). */
    bottomMargin: 45,
    /** Lean angle at full lean (radians). */
    maxLeanAngle: 0.4,
    /** Bounce height in pixels at top speed. */
    bounceAmplitude: 3,
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

  scenery: {
    /** Seed for the layout; same seed = same roadside every run. */
    seed: 20241014,
    /** Nothing is placed closer to the road center than this (road half-widths); sprite edges included. */
    minOffset: 1.2,
    /** Extra gap between minOffset and a sprite's inner edge. */
    edgeMargin: 0.03,
    /** Sprites smaller than this many screen pixels tall are skipped. */
    minPixelHeight: 4,
    /** Resolution of the pre-rendered art (pixels per world unit). */
    artPxPerUnit: 0.22,
    postSpacing: 20,
    postOffset: 1.25,
    chevronSpacing: 6,
    /** Chevrons appear on segments whose |curve| is at least this. */
    chevronMinCurve: 4.5,
    chevronOffset: 1.45,
    /**
     * Zones as fractions of the lap. density = chance per side per segment of placing that type.
     * (At most one random item per side per segment.)
     */
    zones: [
      { name: 'beach', from: 0, to: 0.2, density: { palm: 0.16, tree: 0.01, rock: 0.015, billboard: 0.012 } },
      { name: 'forest', from: 0.2, to: 0.45, density: { palm: 0.01, tree: 0.22, rock: 0.03, billboard: 0.008 } },
      { name: 'rocky', from: 0.45, to: 0.65, density: { palm: 0.02, tree: 0.05, rock: 0.14, billboard: 0.01 } },
      { name: 'beach', from: 0.65, to: 0.85, density: { palm: 0.18, tree: 0.02, rock: 0.02, billboard: 0.012 } },
      { name: 'forest', from: 0.85, to: 1.01, density: { palm: 0.02, tree: 0.18, rock: 0.02, billboard: 0.01 } },
    ],
    /**
     * Per type: size in world units, collisionWidth in road half-widths (0 = harmless),
     * spread = how far beyond the minimum offset it can be placed.
     */
    types: {
      palm: { width: 900, height: 2200, collisionWidth: 0.14, spread: 2.6 },
      tree: { width: 1100, height: 1700, collisionWidth: 0.22, spread: 3.2 },
      rock: { width: 600, height: 380, collisionWidth: 0.26, spread: 2.2 },
      // Delineator posts break away harmlessly.
      post: { width: 90, height: 520, collisionWidth: 0, spread: 0 },
      billboard: { width: 1500, height: 1800, collisionWidth: 0.7, spread: 0.8 },
      chevron: { width: 700, height: 1100, collisionWidth: 0.08, spread: 0 },
      // Decoration only: you brush through bushes, scrub and fence posts.
      bush: { width: 520, height: 340, collisionWidth: 0, spread: 2.5 },
      scrub: { width: 380, height: 230, collisionWidth: 0, spread: 2.5 },
      fence: { width: 120, height: 380, collisionWidth: 0, spread: 0 },
    },
    /**
     * Visual-only dressing, drawn from its own seeded stream so the layout of everything you can hit is
     * exactly what it was before. Offsets are in road half-widths.
     */
    decor: {
      seed: 777,
      /** Chance per side per segment of a bush or scrub clump (scrubShare of them are scrub). */
      bushDensity: 0.5,
      scrubShare: 0.4,
      bushOffsetSpread: 2.6,
      /** Extra trees (and palms in beach zones) further out than you can ride, for depth. */
      farTreeDensity: 0.3,
      farTreeOffsetMin: 2.7,
      farTreeOffsetSpread: 5,
      /** Wooden fence posts along stretches: every fenceSpacing segments, for fenceLength out of every fencePeriod. */
      fenceSpacing: 4,
      fenceLength: 140,
      fencePeriod: 380,
      fenceOffset: 1.5,
      /**
     * Size variation (visual scale) for new decor, and for the trees, palms and rocks that are already there
     * (those are also capped so their inner edge never comes closer than minOffset).
     */
      scaleMin: 0.7,
      scaleMax: 1.45,
      existingScaleMin: 0.75,
      existingScaleMax: 1.35,
    },
    billboards: [
      { text: 'ROAD FURY', back: '#d62828', fore: '#ffffff' },
      { text: 'NITRO', back: '#1d4ed8', fore: '#ffd60a' },
      { text: 'FUEL UP', back: '#0f766e', fore: '#ffffff' },
    ],
  },

  collision: {
    /** Bike width in road half-widths. */
    bikeWidth: 0.12,
    /** Hits above this fraction of top speed crash the bike; at or below it the bike just stops. */
    crashSpeedFraction: 0.15,
    /** After a low-speed stop the bike is nudged this far (half-widths) clear of the object. */
    nudge: 0.02,
  },

  crash: {
    /** Seconds from impact to respawn. */
    duration: 2.4,
    maxHealth: 100,
    damage: 20,
    /** Respawn position in road half-widths (0 = centre). */
    respawnX: 0,
    invincibleTime: 3,
    invincibleFlashHz: 8,
    /** Camera shake in canvas pixels at impact; decays to 0 over the crash. */
    shakeAmplitude: 10,
    shakeFrequency: 55,
    /** Bike tumble: full turns before it settles on its side, and the time it takes (s). */
    spinTurns: 2.5,
    spinTime: 1.5,
    /** Bike hop height and slide (local bike units) scaled by impact speed. */
    hopHeight: 55,
    slideDistance: 60,
    /** Rider launch (local bike units per second) and gravity, scaled by impact speed. */
    riderVx: 160,
    riderVy: 430,
    riderGravity: 700,
    riderSpin: 7,
    /** Dust cloud lifetime (s). */
    dustTime: 1.2,
  },

  /** Race rules. */
  race: {
    laps: 2,
    /** Seconds of 3-2-1 before GO; bikes are locked until GO. */
    countdownSeconds: 3,
    /** Seconds the GO! message stays up. */
    goSeconds: 0.9,
    /** Brake axis the player's bike coasts down with after finishing. */
    finishBrake: 0.35,
    /** Finished AI riders cruise at this fraction of their pace. */
    finishCruise: 0.5,
  },

  /** AI rivals. They live in the same road space as the player: x in half-widths, z as total distance. */
  rivals: {
    seed: 4242,
    /** Personal pace range, as a fraction of top speed. */
    paceMin: 0.8,
    paceMax: 0.93,
    /** Starting grid ahead of the player: first row distance, spacing between rows, and the x of each side. */
    gridFirstRow: 500,
    gridRowSpacing: 500,
    gridX: 0.35,
    /** Lane centres (road half-widths) they wander between, and the furthest they will ever go (stay off the grass). */
    lanes: [-0.75, -0.25, 0.25, 0.75],
    maxX: 0.92,
    /** Seconds between lane changes (random in this range). */
    laneChangeMin: 3,
    laneChangeMax: 8,
    /** Lateral correction speed toward the target lane (1/s) and the most they move sideways (half-widths/s). */
    laneGain: 2.5,
    maxLateralSpeed: 0.9,
    /**
     * Scenery and traffic lookahead in world units: at least this far, and at least lookaheadTime seconds of travel
     * (1,400 units is only ~0.13 s at top speed, too late to sidestep). `alongside` is how far behind still counts as level.
     */
    lookahead: 1400,
    lookaheadTime: 0.8,
    alongside: 250,
    /** Seconds a rival allows itself to sidestep or brake for something in its path: caps how fast it closes on it. */
    dodgeTime: 0.5,
    /** Lateral half-width of an obstacle (riders), and extra clearance, in road half-widths. */
    obstacleHalfWidth: 0.14,
    clearance: 0.06,
    /**
     * Rivals ride under the player's own physics, so they must slow for curves too: they look this many
     * segments ahead, brake at brakeFraction of the player's brake so they arrive at each curve no faster
     * than curveMargin x the speed the bike can hold through it.
     */
    curveLookahead: 40,
    brakeFraction: 0.9,
    curveMargin: 0.97,
    /** Never faster than this fraction of top speed, whatever the rubber band says. */
    maxSpeedFraction: 1,
    /** Rubber band, as distance (world units) ahead of / behind the player, and the speed multiplier applied. */
    rubber: { distance: 3000, ahead: 0.9, behind: 1.12, ramp: 500 },
    names: ['Razor', 'Vixen', 'Nitro Nick', 'Blaze', 'Ghost', 'Viper', 'Rocket'],
    /** Colour schemes layered over config.bike.colors. */
    schemes: [
      { jacket: '#e8c600', sleeve: '#b89c00', body: '#222222', helmet: '#f2f2f2', helmetStripe: '#111111' },
      { jacket: '#1e9e4a', sleeve: '#14753a', body: '#e8e8e8', helmet: '#c8f5d4', helmetStripe: '#0d5c2a' },
      { jacket: '#ee7a14', sleeve: '#bb5a08', body: '#1d1d1d', helmet: '#ffffff', helmetStripe: '#ee7a14' },
      { jacket: '#7b3fc6', sleeve: '#5c2c98', body: '#f0f0f0', helmet: '#d9c8f5', helmetStripe: '#3d1d70' },
      { jacket: '#16a3a3', sleeve: '#0f7c7c', body: '#1b2a3a', helmet: '#eaffff', helmetStripe: '#0a5555' },
      { jacket: '#e0488c', sleeve: '#b3306d', body: '#222222', helmet: '#ffe0ef', helmetStripe: '#a01f5c' },
      { jacket: '#2b2b2b', sleeve: '#1a1a1a', body: '#d62828', helmet: '#444444', helmetStripe: '#ffffff' },
    ],
  },

  /** Rider-on-rider contact. */
  bump: {
    /** Riders overlap when closer than this along the road (world units) and across it (half-widths). */
    depth: 420,
    width: 0.16,
    /** How fast overlapping riders are pushed apart sideways (half-widths/s each). */
    pushSpeed: 0.8,
  },

  fog: {
    /** Exponential fog: factor = 1 / e^(t^2 * density), t = distance / drawDistance. */
    density: 5,
    color: '#c9d8e6',
  },

  /**
   * Pre-generated texture strips. The road and the terrain are drawn one screen row at a time from a strip
   * (a few variants, picked per segment), so detail costs one drawImage per row instead of many shapes.
   * Colours are [r, g, b]. Road x positions are in road half-widths (-1..1 = edge to edge).
   */
  textures: {
    seed: 1994,
    road: { width: 1024, rows: 64, variants: 8 },
    grass: { width: 512, rows: 64, variants: 6 },
    asphalt: {
      base: [94, 94, 98],
      /** Per-pixel grain and the larger soft blotches (+- RGB levels). */
      noise: 9,
      blotch: 6,
      /** Tyre-wear: darkening in the wheel tracks of each lane (offset from lane centre, width, strength). */
      wheelOffset: 0.068,
      wheelWidth: 0.07,
      wear: 22,
      /** Repair patches, cracks and oil stains per strip. */
      patches: 3,
      cracks: 3,
      stains: 2,
    },
    lines: {
      edgeX: 0.962,
      edgeWidth: 0.026,
      /** Each of the two yellow centre lines sits this far from the centre. */
      centerX: 0.026,
      centerWidth: 0.015,
      laneX: 0.5,
      laneWidth: 0.022,
      white: [236, 236, 230],
      yellow: [234, 186, 38],
      /** Chance a paint pixel is worn away. */
      worn: 0.16,
    },
    shoulder: {
      /** Dirt/gravel from just outside the edge line out to a ragged outer edge. */
      inner: 0.99,
      outer: 1.2,
      ragged: 0.06,
      base: [140, 108, 72],
      noise: 16,
      /** Chance of a pebble pixel. */
      pebbles: 0.07,
    },
    grassTones: {
      light: [98, 162, 64],
      dark: [70, 128, 48],
      noise: 12,
      blotch: 22,
    },
  },

  background: {
    skyTop: '#2f6fc8',
    skyHorizon: '#c9d8e6',
    /** Parallax mountain layers, far to near. speed = layer widths/s per unit curve at top speed. */
    layers: [
      { color: '#97b3a6', height: 165, points: 9, minPeak: 0.35, maxPeak: 1, speed: 0.015, seed: 11 },
      { color: '#5f8c63', height: 105, points: 13, minPeak: 0.3, maxPeak: 1, speed: 0.03, seed: 29 },
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
