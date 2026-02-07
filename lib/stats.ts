import { MatchInfo } from "@/types/mcsr";
import { parseVariations } from "./format";

/**
 * Filters used to refine the list of matches on the client.  Each property
 * corresponds to a dimension the user can select in the FilterPanel.
 */
export interface Filters {
  types?: Set<number>;
  startDateSec?: number;
  endDateSec?: number;
  overworld?: Set<string>;
  bastion?: Set<string>;
  fortress?: Set<string>;
  bastionBiome?: Set<string>;
  structure?: Set<string>;
  variations?: Set<string>;
  bastionType?: Set<string>;
  hideDecayed?: boolean;
  hideForfeits?: boolean;
  beginnerOnly?: boolean;
}

/**
 * Apply the provided filters to an array of matches.  All checks are
 * performed lazily; filters are skipped when undefined.  Filtering on
 * variations and end tower heights checks if any value from the filter set
 * occurs in the match seed array.
 */
export function applyFilters(matches: MatchInfo[], f: Filters): MatchInfo[] {
  return matches.filter((m) => {
    // Match type is handled by the server when provided as a query
    // parameter; avoid client-side filtering on `types` so the
    // UI reflects exactly what the server returned.
    if (f.startDateSec && m.date < f.startDateSec) return false;
    if (f.endDateSec && m.date > f.endDateSec) return false;
    if (f.hideDecayed && m.decayed) return false;
    // Treat "hide forfeits" as hiding only non-draw forfeits. A draw is
    // represented by `forfeited === true` but no reported winner; keep
    // those visible when the user asks to hide forfeits.
    if (f.hideForfeits && m.forfeited && !!m.result?.uuid) return false;
    if (f.beginnerOnly && !m.beginner) return false;

    const seed = m.seed;
    if (f.overworld && f.overworld.size > 0) {
      if (!seed?.overworld || !f.overworld.has(seed.overworld)) return false;
    }
    if (f.bastion && f.bastion.size > 0) {
      const bastionVal = (m as any).bastionType ?? seed?.bastion ?? seed?.nether ?? null;
      if (!bastionVal || !f.bastion.has(bastionVal)) return false;
    }
    // parse variations into derived categories
    const parsed = parseVariations(seed?.variations ?? []);
    if (f.fortress && f.fortress.size > 0) {
      // match if any fortress biome in seed matches filter
      const biomes = Array.from(parsed.fortressBiomes);
      if (biomes.length === 0 || !biomes.some((b) => f.fortress!.has(b))) return false;
    }
    if (f.bastionBiome && f.bastionBiome.size > 0) {
      const biomes = Array.from(parsed.bastionBiomes);
      if (biomes.length === 0 || !biomes.some((b) => f.bastionBiome!.has(b))) return false;
    }
    if (f.structure && f.structure.size > 0) {
      const structures = Array.from(parsed.structures);
      if (structures.length === 0 || !structures.some((s) => f.structure!.has(s))) return false;
    }
    if (f.bastionType && f.bastionType.size > 0) {
      if (!parsed.bastionType || !f.bastionType.has(parsed.bastionType)) return false;
    }
    if (f.variations && f.variations.size > 0) {
      // Require that the match contains ALL selected variations (AND semantics)
      // so selecting multiple variations narrows to matches that include every
      // selected variation. This ensures the variations list and filters
      // represent co-occurrence rather than a loose OR match.
      const vars = new Set(seed?.variations ?? []);
      for (const sel of Array.from(f.variations)) {
        if (!vars.has(sel)) return false;
      }
    }
    // endSpawnBuried and endTowerHeights filters removed
    return true;
  });
}

/**
 * Compute a simple overview of match statistics for the user.  If
 * `userUuid` is provided the win rate will be computed relative to the
 * player's UUID; otherwise it will be omitted.
 */
export function computeOverview(matches: MatchInfo[], userUuid?: string) {
  const total = matches.length;
  let forfeits = 0;
  const decays = matches.filter((m) => m.decayed).length;
  let completions = 0; // counts completion-wins by the user
  const times: number[] = [];
  const avgTimeMs = () => (times.length ? times.reduce((a, b) => a + b, 0) / times.length : null);
  let wins: number | null = userUuid ? 0 : null;
  let draws = 0;
  let userForfeits = 0;
  let opponentForfeits = 0;

  for (const m of matches) {
    const outcome = getMatchOutcome(m, userUuid);

    // Draws: per new rule, forfeited=true and no winner -> draw
    if (outcome.outcome === 'draw') {
      draws += 1;
      continue;
    }

    // Completion wins count toward completions and average time
    if (outcome.outcome === 'completion-win') {
      if (wins != null) wins += 1;
      completions += 1;
      if (m.result.time != null) times.push(m.result.time);
      continue;
    }

    // Completion losses: just count as loss implicitly
    if (outcome.outcome === 'completion-loss') {
      // nothing to increment beyond losses computed later
      continue;
    }

    // Forfeits (non-draw) attribution
    if ((outcome.outcome === 'forfeit-win' || outcome.outcome === 'forfeit-loss')) {
      // count as a forfeited match (exclude draws handled above)
      forfeits += 1;
      if (outcome.outcome === 'forfeit-loss') {
        // searched user forfeited
        userForfeits += 1;
      } else if (outcome.outcome === 'forfeit-win') {
        // opponent forfeited
        opponentForfeits += 1;
      }
      // If the forfeit resulted in a win for the user, count that as a win
      if (outcome.outcome === 'forfeit-win' && wins != null) {
        wins += 1;
      }
      continue;
    }

    // Unknown outcome: skip
  }

  const losses = (() => {
    if (wins == null) return null;
    return total - draws - wins;
  })();

  return {
    total,
    completions,
    wins: wins ?? null,
    losses,
    forfeits,
    draws,
    userForfeits,
    opponentForfeits,
    decays,
    avgTimeMs: avgTimeMs(),
    winRate: wins != null && (total - draws) > 0 ? wins / (total - draws) : null,
  };
}

/**
 * Determine the match outcome relative to a user identifier. The
 * `userIdentifier` may be a UUID or a nickname; the function will attempt
 * to resolve it against the match players. Returns an outcome of
 * 'win' | 'loss' | 'draw' | 'unknown' and a flag indicating if the match
 * was forfeited.
 */
export type MatchOutcome =
  | 'draw'
  | 'forfeit-win'
  | 'forfeit-loss'
  | 'completion-win'
  | 'completion-loss'
  | 'unknown';

export function getMatchOutcome(m: MatchInfo, userIdentifier?: string): { outcome: MatchOutcome; forfeited: boolean } {
  // Resolve searched player's UUID by nickname (preferred) or by UUID
  let searchedUuid: string | undefined;
  if (userIdentifier) {
    const lower = userIdentifier.toLowerCase();
    for (const p of m.players) {
      if (!p) continue;
      if (p.nickname && p.nickname.toLowerCase() === lower) {
        searchedUuid = p.uuid ?? undefined;
        break;
      }
    }
    if (!searchedUuid) {
      // maybe the identifier is a UUID
      for (const p of m.players) {
        if (!p) continue;
        if (p.uuid && p.uuid === userIdentifier) {
          searchedUuid = p.uuid;
          break;
        }
      }
    }
  }

  const winner = m.result?.uuid ?? null;
  const forfeited = !!m.forfeited;

  // Draw: forfeited = true and no winner reported
  if (forfeited && !winner) return { outcome: 'draw', forfeited };

  // Forfeits with a reported winner
  if (forfeited && winner) {
    if (searchedUuid && winner === searchedUuid) return { outcome: 'forfeit-win', forfeited };
    if (searchedUuid) return { outcome: 'forfeit-loss', forfeited };
    return { outcome: 'unknown', forfeited };
  }

  // Completions (non-forfeit)
  if (!forfeited && winner) {
    if (searchedUuid && winner === searchedUuid) return { outcome: 'completion-win', forfeited };
    if (searchedUuid) return { outcome: 'completion-loss', forfeited };
    return { outcome: 'unknown', forfeited };
  }

  return { outcome: 'unknown', forfeited };
}

/**
 * Produce a breakdown of matches grouped by an arbitrary key function.  The
 * results are sorted descending by count and returned as an array of
 * objects with `name` and `count` properties.  `null` keys are ignored.
 */
export function breakdownByKey<T extends string>(matches: MatchInfo[], keyFn: (m: MatchInfo) => T | null) {
  const map = new Map<string, number>();
  for (const m of matches) {
    const key = keyFn(m);
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Convert matches into a time series suitable for a line chart.  The date
 * property of each match is used as the x-axis and the result time (or null
 * for forfeits) is used as the y-axis.  The series is sorted by date.
 */
export function timeSeries(matches: MatchInfo[]) {
  const sorted = [...matches].sort((a, b) => a.date - b.date);
  return sorted.map((m) => ({
    dateSec: m.date,
    timeMs: m.forfeited ? null : m.result.time,
    type: m.type,
  }));
}