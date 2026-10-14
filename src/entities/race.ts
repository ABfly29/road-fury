import { config } from '../config';

export type RacePhase = 'countdown' | 'racing' | 'finished';

export interface ResultRow {
  /** Rider id: 'player' or the rival's id as a string. */
  id: string;
  name: string;
  isPlayer: boolean;
  /** Finish time in seconds, or null while still racing. */
  time: number | null;
}

export interface RaceState {
  phase: RacePhase;
  /** Seconds of countdown left before GO. */
  countdown: number;
  /** Seconds since GO (the race clock). */
  time: number;
  /** Seconds since the race went green (for the GO! message). */
  sinceGo: number;
  /** Total race distance in world units (laps x track length). */
  distance: number;
  laps: number;
  /** Player's live position, 1-based, and the field size. */
  position: number;
  total: number;
  /** Finish times by rider id. */
  finishTimes: Record<string, number>;
  /** Everyone, best first; filled in as soon as the player has finished. */
  results: ResultRow[];
}

export function createRace(trackLength: number, riders: number): RaceState {
  return {
    phase: 'countdown',
    countdown: config.race.countdownSeconds,
    time: 0,
    sinceGo: 0,
    distance: config.race.laps * trackLength,
    laps: config.race.laps,
    position: riders,
    total: riders,
    finishTimes: {},
    results: [],
  };
}
