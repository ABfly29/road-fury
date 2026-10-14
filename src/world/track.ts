import { config } from '../config';

export interface TrackPoint {
  y: number;
  z: number;
}

export interface Segment {
  /** Index within the loop (0..length-1). */
  index: number;
  p1: TrackPoint;
  p2: TrackPoint;
  curve: number;
}

export interface Track {
  segments: Segment[];
  segmentLength: number;
  /** Loop length in world units. Positions are total distance; wrap with this only to look up data. */
  length: number;
  /** Segment under a position given as total distance travelled (wraps; negative positions are fine). */
  segmentAt(position: number): Segment;
  /** Road surface height at a position, interpolated within its segment. */
  heightAt(position: number): number;
}

const easeIn = (a: number, b: number, p: number) => a + (b - a) * p * p;
const easeInOut = (a: number, b: number, p: number) => a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5);

class TrackBuilder {
  readonly segments: Segment[] = [];
  private readonly segLen = config.road.segmentLength;

  get lastY(): number {
    return this.segments.length === 0 ? 0 : this.segments[this.segments.length - 1].p2.y;
  }

  private addSegment(curve: number, y: number): void {
    const index = this.segments.length;
    this.segments.push({
      index,
      p1: { y: this.lastY, z: index * this.segLen },
      p2: { y, z: (index + 1) * this.segLen },
      curve,
    });
  }

  /**
   * Add enter+hold+leave segments. Curve eases in over `enter`, holds, eases out over `leave`.
   * `height` is the total rise in segment lengths (negative = descent), eased across all phases.
   */
  addRoad(enter: number, hold: number, leave: number, curve: number, height: number): void {
    const startY = this.lastY;
    const endY = startY + height * this.segLen;
    const total = enter + hold + leave;
    for (let n = 0; n < enter; n++) {
      this.addSegment(easeIn(0, curve, n / enter), easeInOut(startY, endY, n / total));
    }
    for (let n = 0; n < hold; n++) {
      this.addSegment(curve, easeInOut(startY, endY, (enter + n) / total));
    }
    for (let n = 0; n < leave; n++) {
      this.addSegment(easeInOut(curve, 0, n / leave), easeInOut(startY, endY, (enter + hold + n) / total));
    }
  }

  straight(num: number): void {
    this.addRoad(num, num, num, 0, 0);
  }

  hill(num: number, height: number): void {
    this.addRoad(num, num, num, 0, height);
  }

  curve(num: number, curve: number, height = 0): void {
    this.addRoad(num, num, num, curve, height);
  }

  rollingHills(num: number, height: number): void {
    this.addRoad(num, num, num, 0, height / 2);
    this.addRoad(num, num, num, 0, -height);
    this.addRoad(num, num, num, 0, height);
    this.addRoad(num, num, num, 0, 0);
    this.addRoad(num, num, num, 0, height / 2);
    this.addRoad(num, num, num, 0, 0);
  }

  /**
   * Return to height 0 and pad with straight road so the loop joins with no seam:
   * height 0 and curve 0 at both ends, and a segment count that keeps the
   * rumble color alternation continuous across the join.
   */
  close(): Track {
    const segLen = this.segLen;
    const returnNum = config.track.length.short;
    this.addRoad(returnNum, returnNum, returnNum, 0, -this.lastY / segLen);
    this.segments[this.segments.length - 1].p2.y = 0;

    const period = 2 * config.road.rumbleLength;
    while (this.segments.length % period !== 0) this.addSegment(0, 0);

    const segments = this.segments;
    return {
      segments,
      segmentLength: segLen,
      length: segments.length * segLen,
      segmentAt(position) {
        const n = segments.length;
        return segments[((Math.floor(position / segLen) % n) + n) % n];
      },
      heightAt(position) {
        const seg = this.segmentAt(position);
        const percent = (position - Math.floor(position / segLen) * segLen) / segLen;
        return seg.p1.y + (seg.p2.y - seg.p1.y) * percent;
      },
    };
  }
}

/** Sample loop of ~1,500 segments: straights, curves, S-bends, rolling hills and one big hill. */
export function createSampleTrack(): Track {
  const { length: L, curve: C, hill: H } = config.track;
  const t = new TrackBuilder();

  t.straight(20);
  t.curve(25, C.easy);
  t.straight(15);
  t.rollingHills(15, H.low);
  t.addRoad(25, 70, 25, -C.hard, 0);
  // S-bend
  t.curve(20, C.easy);
  t.curve(20, -C.medium);
  t.curve(20, C.medium);
  t.curve(20, -C.easy);
  t.straight(27);
  // The one big hill
  t.hill(L.medium - 10, H.high);
  t.hill(L.medium - 10, -H.high);
  t.curve(30, -C.medium, H.low);
  t.straight(20);
  t.addRoad(25, 70, 25, C.hard, 0);
  t.hill(15, H.medium);

  return t.close();
}
