"use client";

import { useEffect, useMemo, useState } from "react";
import { applyFilters, computeOverview, breakdownByKey, timeSeries, Filters } from "@/lib/stats";
import { MatchInfo } from "@/types/mcsr";
import FilterPanel from "@/components/FilterPanel";
import StatCards from "@/components/StatCards";
import MatchTable from "@/components/MatchTable";
import TimeTrend from "@/components/charts/TimeTrend";
import TimeHistogram from "@/components/charts/TimeHistogram";
import BreakdownBar from "@/components/charts/BreakdownBar";

interface HubProps {
  identifier: string;
}

/**
 * Client component responsible for rendering the advanced stats hub.  It fetches
 * match data from the internal API route, allows the user to adjust filters
 * and computes various summary statistics and chart datasets on the client.
 */
export default function Hub({ identifier }: HubProps) {
  const [allMatches, setAllMatches] = useState<MatchInfo[]>([]);
  const [filters, setFilters] = useState<Filters>({ types: new Set([2]) });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all matches for the given identifier when it changes
  useEffect(() => {
    let cancelled = false;
    async function fetchMatches() {
      setLoading(true);
      setError(null);
      try {
        const types = Array.from(filters.types ?? [] as unknown as Set<number>);
        const typeQuery = types.map((t) => `type=${encodeURIComponent(String(t))}`).join('&');
        const url = `/api/mcsr/user-matches?identifier=${encodeURIComponent(identifier)}${typeQuery ? '&' + typeQuery : ''}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to fetch matches: ${res.statusText}`);
        }
        const data = await res.json();
        if (!cancelled) {
          const incoming = data.matches ?? [];
          // Helpful debug log to confirm what the server returned
          // and to verify the UI is receiving the fresh dataset.
          // Remove in production if noisy.
          // eslint-disable-next-line no-console
          console.log('Fetched matches (server):', incoming.length);
          setAllMatches(incoming);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchMatches();
    return () => {
      cancelled = true;
    };
  }, [identifier, JSON.stringify(Array.from(filters.types ?? []))]);

  // Compute filtered subset whenever matches or filters change
  const filteredMatches = useMemo(() => applyFilters(allMatches, filters), [allMatches, filters]);
  // derive user UUID from fetched matches when possible (match by uuid or nickname)
  const derivedUserUuid = useMemo(() => {
    for (const m of allMatches) {
      for (const p of m.players) {
        if (!p) continue;
        if (p.uuid && p.uuid === identifier) return p.uuid;
        if (p.nickname && p.nickname.toLowerCase() === identifier.toLowerCase()) return p.uuid;
      }
    }
    return undefined;
  }, [allMatches, identifier]);
  const overview = useMemo(() => computeOverview(filteredMatches, derivedUserUuid), [filteredMatches, derivedUserUuid]);
  const series = useMemo(() => timeSeries(filteredMatches), [filteredMatches]);
  const byOverworld = useMemo(() => breakdownByKey(filteredMatches, m => m.seed?.overworld ?? null), [filteredMatches]);
  

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Statistics for <b>{identifier}</b></h1>
      {loading && <div style={{ marginBottom: 16 }}>Loading matches…</div>}
      {error && <div style={{ marginBottom: 16, color: "red" }}>{error}</div>}
      <div style={{ marginBottom: 24 }}>
        <FilterPanel matches={allMatches} value={filters} onChange={setFilters} />
      </div>
      <StatCards overview={overview} />
      <div style={{ height: 24 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <TimeTrend data={series} />
        <TimeHistogram matches={filteredMatches} />
      </div>
      <div style={{ height: 24 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
        <BreakdownBar title="Overworld structures" data={byOverworld} />
      </div>
      <div style={{ height: 24 }} />
      <MatchTable matches={filteredMatches} user={identifier} />
    </div>
  );
}