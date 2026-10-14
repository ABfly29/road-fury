import { config } from '../config';
import { mulberry32 } from '../core/random';
import type { BikeColors } from '../render/bikeRenderer';

/** An AI rider. Same road space as the player: x in road half-widths, z as total distance travelled. */
export interface Rival {
  id: number;
  name: string;
  /** Colour overrides layered over config.bike.colors. */
  colors: Partial<BikeColors>;
  /** Personal pace as a fraction of top speed. */
  pace: number;
  z: number;
  x: number;
  speed: number;
  lean: number;
  leanVel: number;
  /** Index into config.rivals.lanes of the lane this rival is heading for. */
  lane: number;
  /** Seconds until the next lane change. */
  laneTimer: number;
}

/** Seeded Fisher-Yates shuffle. */
function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * The field on its starting grid ahead of the player, two bikes per row. Paces are spread evenly over
 * the pace range and dealt out to grid slots by a seeded shuffle, so the pole is not always the slowest.
 */
export function createRivals(): Rival[] {
  const r = config.rivals;
  const rand = mulberry32(r.seed);
  const n = r.names.length;
  const paces = shuffle(
    Array.from({ length: n }, (_, i) => r.paceMin + ((r.paceMax - r.paceMin) * i) / (n - 1)),
    rand,
  );

  return r.names.map((name, i) => {
    const row = Math.floor(i / 2);
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * r.gridX;
    const lane = r.lanes.reduce((best, c, k) => (Math.abs(c - x) < Math.abs(r.lanes[best] - x) ? k : best), 0);
    return {
      id: i,
      name,
      colors: r.schemes[i % r.schemes.length],
      pace: paces[i],
      z: r.gridFirstRow + row * r.gridRowSpacing,
      x,
      speed: 0,
      lean: 0,
      leanVel: 0,
      lane,
      laneTimer: r.laneChangeMin + rand() * (r.laneChangeMax - r.laneChangeMin),
    };
  });
}
