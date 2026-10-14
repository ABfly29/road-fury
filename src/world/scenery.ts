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
  /** Art variant (billboard design, chevron direction, tree and bush look). */
  variant: number;
  /** Visual size multiplier. Collision widths do not scale with it. */
  scale: number;
}

const RANDOM_TYPES = ['palm', 'tree', 'rock', 'billboard'] as const;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Fill every segment's `sprites`. Seeded, so the roadside is identical every run.
 *
 * Everything you can hit (palms, trees, rocks, billboards, chevrons, posts) comes from the first random
 * stream, exactly as before. The second stream, below, only varies how those look and adds harmless dressing
 * (bushes, scrub, far trees, fence posts), so adding or tuning dressing never moves a single obstacle.
 */
export function populateScenery(track: Track): void {
  const s = config.scenery;
  const rand = mulberry32(s.seed);
  const n = track.segments.length;

  /** Closest allowed centre offset for a type at a size: its inner edge must clear minOffset. */
  const innerOffset = (type: SceneryType, scale = 1) =>
    s.minOffset + (s.types[type].width * scale) / 2 / config.road.roadWidth + s.edgeMargin;

  track.segments.forEach((seg, i) => {
    const zone = s.zones.find((z) => i / n >= z.from && i / n < z.to) ?? s.zones[s.zones.length - 1];

    if (i % s.postSpacing === 0) {
      for (const side of [-1, 1]) {
        seg.sprites.push({ type: 'post', offset: side * s.postOffset, frac: 0, variant: 0, scale: 1 });
      }
    }

    // Chevrons sit on the outside of hard curves and point the way the road turns.
    if (Math.abs(seg.curve) >= s.chevronMinCurve && i % s.chevronSpacing === 0) {
      const turnsRight = seg.curve > 0;
      seg.sprites.push({
        type: 'chevron',
        offset: (turnsRight ? -1 : 1) * s.chevronOffset,
        frac: 0,
        variant: turnsRight ? 0 : 1,
        scale: 1,
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
          seg.sprites.push({ type, offset: side * offset, frac, variant: type === 'billboard' ? variant : 0, scale: 1 });
          break;
        }
      }
    }
  });

  dress(track, innerOffset);
}

/** Visual variety and harmless dressing, from a second seeded stream. */
function dress(track: Track, innerOffset: (type: SceneryType, scale?: number) => number): void {
  const s = config.scenery;
  const d = s.decor;
  const rand = mulberry32(d.seed);
  const n = track.segments.length;

  track.segments.forEach((seg, i) => {
    // Vary the look of what is already there (size and tree shape only; collision stays as it was).
    for (const item of seg.sprites) {
      const r1 = rand();
      const r2 = rand();
      if (item.type === 'tree' || item.type === 'palm' || item.type === 'rock') {
        // Only as big as still keeps the item's inner edge outside minOffset: near the road they stay at
        // normal size (their placement was made for it), further out they can grow.
        const halfWidth = s.types[item.type].width / 2 / config.road.roadWidth;
        const fits = (Math.abs(item.offset) - s.minOffset - s.edgeMargin) / halfWidth;
        const cap = Math.max(d.existingScaleMin, Math.min(d.existingScaleMax, fits));
        item.scale = lerp(d.existingScaleMin, cap, r1);
        if (item.type === 'tree' || item.type === 'rock') item.variant = Math.floor(r2 * 3);
      }
    }

    const beach = (seg.index / n < 0.2) || (seg.index / n >= 0.65 && seg.index / n < 0.85);

    for (const side of [-1, 1]) {
      // Dense bushes and scrub, hugging the shoulder.
      const bushRoll = rand();
      const kindRoll = rand();
      const offRoll = rand();
      const fracRoll = rand();
      const scaleRoll = rand();
      const variantRoll = rand();
      if (bushRoll < d.bushDensity) {
        const type: SceneryType = kindRoll < d.scrubShare ? 'scrub' : 'bush';
        const scale = lerp(d.scaleMin, d.scaleMax, scaleRoll);
        const offset = innerOffset(type, scale) + offRoll ** 1.5 * d.bushOffsetSpread;
        seg.sprites.push({ type, offset: side * offset, frac: fracRoll, variant: Math.floor(variantRoll * 3), scale });
      }

      // Extra trees further out than you can ride: depth, not hazards.
      const treeRoll = rand();
      const treeKind = rand();
      const treeOff = rand();
      const treeFrac = rand();
      const treeScale = rand();
      const treeVariant = rand();
      if (treeRoll < d.farTreeDensity) {
        const type: SceneryType = beach && treeKind < 0.55 ? 'palm' : 'tree';
        seg.sprites.push({
          type,
          offset: side * (d.farTreeOffsetMin + treeOff * d.farTreeOffsetSpread),
          frac: treeFrac,
          variant: Math.floor(treeVariant * 3),
          scale: lerp(0.85, type === 'palm' ? 1.25 : 1.7, treeScale),
        });
      }
    }

    // Wooden fence posts along some stretches.
    if (i % d.fencePeriod < d.fenceLength && i % d.fenceSpacing === 0) {
      for (const side of [-1, 1]) {
        const jitter = rand();
        seg.sprites.push({ type: 'fence', offset: side * d.fenceOffset, frac: 0, variant: 0, scale: lerp(0.9, 1.15, jitter) });
      }
    }
  });
}
