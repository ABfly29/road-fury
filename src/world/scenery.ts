import { config } from '../config';
import { mulberry32 } from '../core/random';
import type { Track } from './track';

export type SceneryType = keyof typeof config.scenery.types;

export interface SceneryItem {
  type: SceneryType;
  /** Lateral position in road half-widths from the centre (|offset| > 1.2: always off the road). */
  offset: number;
  /** Position along the segment, 0..1. */
  frac: number;
  /** Art variant (billboard design, chevron direction). */
  variant: number;
}

const RANDOM_TYPES = ['palm', 'tree', 'rock', 'billboard'] as const;

/** Fill every segment's `sprites`. Seeded, so the roadside is identical every run. */
export function populateScenery(track: Track): void {
  const s = config.scenery;
  const rand = mulberry32(s.seed);
  const n = track.segments.length;

  /** Closest allowed centre offset for a type: its inner edge must clear minOffset. */
  const innerOffset = (type: SceneryType) =>
    s.minOffset + s.types[type].width / 2 / config.road.roadWidth + s.edgeMargin;

  track.segments.forEach((seg, i) => {
    const zone = s.zones.find((z) => i / n >= z.from && i / n < z.to) ?? s.zones[s.zones.length - 1];

    if (i % s.postSpacing === 0) {
      for (const side of [-1, 1]) seg.sprites.push({ type: 'post', offset: side * s.postOffset, frac: 0, variant: 0 });
    }

    // Chevrons sit on the outside of hard curves and point the way the road turns.
    if (Math.abs(seg.curve) >= s.chevronMinCurve && i % s.chevronSpacing === 0) {
      const turnsRight = seg.curve > 0;
      seg.sprites.push({
        type: 'chevron',
        offset: (turnsRight ? -1 : 1) * s.chevronOffset,
        frac: 0,
        variant: turnsRight ? 0 : 1,
      });
    }

    for (const side of [-1, 1]) {
      const roll = rand();
      const frac = rand();
      const spread = rand();
      const variant = Math.floor(rand() * s.billboards.length);
      let acc = 0;
      for (const type of RANDOM_TYPES) {
        acc += zone.density[type];
        if (roll < acc) {
          // Squared so more items sit near the road edge, where you can actually hit them.
          const offset = innerOffset(type) + spread * spread * s.types[type].spread;
          seg.sprites.push({ type, offset: side * offset, frac, variant: type === 'billboard' ? variant : 0 });
          break;
        }
      }
    }
  });
}
