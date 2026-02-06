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
  const [filters, setFilters] = useState<Filters>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all matches for the given identifier when it changes
  useEffect(() => {
    let cancelled = false;
    async function fetchMatches() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/mcsr/user-matches?identifier=${encodeURIComponent(identifier)}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch matches: ${res.statusText}`);
        }
        const data = await res.json();
        if (!cancelled) {
          setAllMatches(data.matches ?? []);
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
  }, [identifier]);

  // Compute filtered subset whenever matches or filters change
  const filteredMatches = useMemo(() => applyFilters(allMatches, filters), [allMatches, filters]);
  const overview = useMemo(() => computeOverview(filteredMatches, undefined), [filteredMatches]);
  const series = useMemo(() => timeSeries(filteredMatches), [filteredMatches]);
  const byOverworld = useMemo(() => breakdownByKey(filteredMatches, m => m.seed?.overworld ?? null), [filteredMatches]);
  const byBastion = useMemo(() => breakdownByKey(filteredMatches, m => m.seed?.bastion ?? null), [filteredMatches]);

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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <BreakdownBar title="Overworld structures" data={byOverworld} />
        <BreakdownBar title="Bastion types" data={byBastion} />
      </div>
      <div style={{ height: 24 }} />
      <MatchTable matches={filteredMatches} />
    </div>
  );
}