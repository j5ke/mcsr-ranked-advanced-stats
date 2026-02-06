/**
 * Type definitions matching the MCSR Ranked API.  These definitions are
 * intentionally minimal; they capture only the fields used in this application.
 */

/** The type of match: 1 = ranked, 2 = casual, etc. */
export type MatchType = 1 | 2 | 3 | 4;

/** Information about a player returned in the context of a match list. */
export interface UserProfile {
  uuid: string;
  nickname: string;
  roleType: number;
  eloRate: number | null;
  eloRank: number | null;
  country: string | null;
}

/** Seed details describing structures present in a run. */
export interface MatchSeed {
  id: string | null;
  overworld: string | null;
  bastion: string | null;
  endTowers: number[];
  variations: string[];
}

/** A minimal representation of a match returned by the user matches endpoint. */
export interface MatchInfo {
  id: string;
  type: MatchType;
  season: number;
  category: string | null;
  date: number; // epoch seconds
  players: UserProfile[];
  spectators: UserProfile[];
  seed: MatchSeed | null;
  result: { uuid: string | null; time: number };
  forfeited: boolean;
  decayed: boolean;
  rank?: { season: number | null; allTime: number | null };
  changes?: { uuid: string; change: number | null; eloRate: number | null }[];
  tag: string | null;
  beginner: boolean;
  completions?: { uuid: string; time: number }[];
  timelines?: { uuid: string; time: number; type: string }[];
  replayExist?: boolean;
}