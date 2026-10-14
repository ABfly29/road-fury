import { config } from '../config';
import type { Player } from '../entities/player';
import type { RaceState, ResultRow } from '../entities/race';
import type { Rival } from '../entities/rival';

interface Entry {
  id: string;
  name: string;
  isPlayer: boolean;
  z: number;
  speed: number;
}

/** True while the bikes are locked on the grid (3-2-1). */
export const isLocked = (race: RaceState) => race.phase === 'countdown';

/** Tick the 3-2-1; returns true on the frame the race goes green. */
export function updateCountdown(race: RaceState, dt: number): boolean {
  if (race.phase !== 'countdown') return false;
  race.countdown -= dt;
  if (race.countdown > 0) return false;
  race.phase = 'racing';
  race.time = 0;
  race.sinceGo = 0;
  return true;
}

/** Race clock, finish detection, live position and (once the player is home) the results table. */
export function updateRace(race: RaceState, player: Player, rivals: readonly Rival[], dt: number): void {
  if (race.phase === 'countdown') return;
  race.time += dt;
  race.sinceGo += dt;

  const entries: Entry[] = [
    { id: 'player', name: 'YOU', isPlayer: true, z: player.z, speed: player.speed },
    ...rivals.map((r) => ({ id: String(r.id), name: r.name, isPlayer: false, z: r.z, speed: r.speed })),
  ];

  // Crossing the line: interpolate back to the exact time within this step.
  for (const e of entries) {
    if (e.z >= race.distance && race.finishTimes[e.id] === undefined) {
      race.finishTimes[e.id] = Math.max(0, race.time - (e.z - race.distance) / Math.max(e.speed, 1));
    }
  }
  if (race.phase === 'racing' && race.finishTimes.player !== undefined) race.phase = 'finished';

  // Finishers by time, then everyone still racing by distance covered.
  entries.sort((a, b) => {
    const ta = race.finishTimes[a.id];
    const tb = race.finishTimes[b.id];
    if (ta !== undefined && tb !== undefined) return ta - tb;
    if (ta !== undefined) return -1;
    if (tb !== undefined) return 1;
    return b.z - a.z;
  });
  race.position = entries.findIndex((e) => e.isPlayer) + 1;
  race.total = entries.length;

  if (race.phase === 'finished') {
    race.results = entries.map(
      (e): ResultRow => ({ id: e.id, name: e.name, isPlayer: e.isPlayer, time: race.finishTimes[e.id] ?? null }),
    );
  }
}

/** Neutral controls the player's bike coasts down on after finishing: eases back to the centre and brakes gently. */
export function finishedAxes(player: Player): { steer: number; throttle: number; brake: number } {
  return { steer: Math.min(Math.max(-player.x * 3, -1), 1), throttle: 0, brake: config.race.finishBrake };
}
