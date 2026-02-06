import { MatchInfo } from "@/types/mcsr";

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
  variations?: Set<string>;
  endTowerHeights?: Set<number>;
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
    if (f.types && !f.types.has(m.type)) return false;
    if (f.startDateSec && m.date < f.startDateSec) return false;
    if (f.endDateSec && m.date > f.endDateSec) return false;
    if (f.hideDecayed && m.decayed) return false;
    if (f.hideForfeits && m.forfeited) return false;
    if (f.beginnerOnly && !m.beginner) return false;

    const seed = m.seed;
    if (f.overworld && f.overworld.size > 0) {
      if (!seed?.overworld || !f.overworld.has(seed.overworld)) return false;
    }
    if (f.bastion && f.bastion.size > 0) {
      if (!seed?.bastion || !f.bastion.has(seed.bastion)) return false;
    }
    if (f.variations && f.variations.size > 0) {
      const vars = seed?.variations ?? [];
      let ok = false;
      for (const v of vars) {
        if (f.variations.has(v)) {
          ok = true;
          break;
        }
      }
      if (!ok) return false;
    }
    if (f.endTowerHeights && f.endTowerHeights.size > 0) {
      const towers = seed?.endTowers ?? [];
      let ok = false;
      for (const h of towers) {
        if (f.endTowerHeights.has(h)) {
          ok = true;
          break;
        }
      }
      if (!ok) return false;
    }
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
  const forfeits = matches.filter((m) => m.forfeited).length;
  const decays = matches.filter((m) => m.decayed).length;
  const completions = matches.filter((m) => !m.forfeited).length;
  const times = matches.filter((m) => !m.forfeited).map((m) => m.result.time);
  const avgTimeMs = times.length ? times.reduce((a, b) => a + b, 0) / times.length : null;
  const wins = userUuid ? matches.filter((m) => m.result.uuid === userUuid).length : null;
  return {
    total,
    completions,
    forfeits,
    decays,
    avgTimeMs,
    winRate: wins != null && total > 0 ? wins / total : null,
  };
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