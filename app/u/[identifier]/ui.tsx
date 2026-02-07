"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from 'next/navigation';
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
  const [matchesCount, setMatchesCount] = useState<number>(100);
  const [filters, setFilters] = useState<Filters>({ types: new Set([2]) });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [searchValue, setSearchValue] = useState('');
  const [darkMode, setDarkMode] = useState(false);

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
    };
    fetchMatches();
    return () => {
      cancelled = true;
    };
  }, [identifier, JSON.stringify(Array.from(filters.types ?? []))]);

  // Compute filtered subset whenever matches or filters change
  const filteredMatches = useMemo(() => applyFilters(allMatches, filters), [allMatches, filters]);
  // Slice to the last N matches for local view control (client-side only)
  const shownMatches = useMemo(() => {
    if (!filteredMatches) return [] as MatchInfo[];
    return filteredMatches.slice(0, matchesCount);
  }, [filteredMatches, matchesCount]);
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
  const overview = useMemo(() => computeOverview(shownMatches, derivedUserUuid), [shownMatches, derivedUserUuid]);
  const series = useMemo(() => timeSeries(shownMatches), [shownMatches]);
  const byOverworld = useMemo(() => breakdownByKey(shownMatches, m => m.seed?.overworld ?? null), [shownMatches]);
  

  function submitSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const v = searchValue.trim();
    if (!v) return;
    router.push(`/u/${encodeURIComponent(v)}`);
  }

  // Dark mode initialization and toggle
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mcsr:darkMode');
      // Default to dark when no saved preference exists
      const initial = saved === '1' || (saved === null ? true : false);
      setDarkMode(!!initial);
      if (initial) document.documentElement.setAttribute('data-theme', 'dark');
      else document.documentElement.removeAttribute('data-theme');
    } catch (e) {
      // ignore
    }
  }, []);

  function toggleDark() {
    const next = !darkMode;
    setDarkMode(next);
    try {
      localStorage.setItem('mcsr:darkMode', next ? '1' : '0');
    } catch (e) {}
    if (next) document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>Statistics for <b>{identifier}</b></h1>
        <form onSubmit={submitSearch} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            aria-label="Search player"
            placeholder="Search player"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel-bg)', color: 'var(--text)', width: 220, transition: 'background-color 220ms ease, color 220ms ease, border-color 220ms ease' }}
          />
          <button type="submit" style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--btn-bg)', color: 'var(--text)' }}>
            Go
          </button>
        </form>
      </div>
      {loading && <div style={{ marginBottom: 16 }}>Loading matches…</div>}
      {error && <div style={{ marginBottom: 16, color: "red" }}>{error}</div>}
      <div style={{ marginBottom: 24 }}>
        <FilterPanel matches={allMatches} value={filters} onChange={setFilters} />
      </div>
      <StatCards overview={overview} matchesCount={matchesCount} setMatchesCount={setMatchesCount} />
      <div style={{ height: 24 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <TimeTrend data={series} />
        <TimeHistogram matches={shownMatches} user={derivedUserUuid ?? identifier} />
      </div>
      <div style={{ height: 24 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
        <BreakdownBar title="Overworld structures" data={byOverworld} />
      </div>
      <div style={{ height: 24 }} />
      <MatchTable matches={shownMatches} user={identifier} />

      {/* Floating dark mode toggle (bottom-right, small circle) */}
      <button
        aria-label="Toggle dark mode"
        onClick={toggleDark}
        title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        style={{
          position: 'fixed',
          right: 16,
          bottom: 16,
          width: 40,
          height: 40,
          borderRadius: 9999,
          border: '1px solid var(--border)',
          background: 'var(--btn-bg)',
          color: 'var(--text)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--box-shadow)',
          cursor: 'pointer',
          zIndex: 9999,
        }}
      >
        {darkMode ? (
          // Sun icon (light)
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="4"></circle>
            <path d="M12 2v2"></path>
            <path d="M12 20v2"></path>
            <path d="M4.93 4.93l1.41 1.41"></path>
            <path d="M18.66 18.66l1.41 1.41"></path>
            <path d="M2 12h2"></path>
            <path d="M20 12h2"></path>
            <path d="M4.93 19.07l1.41-1.41"></path>
            <path d="M18.66 5.34l1.41-1.41"></path>
          </svg>
        ) : (
          // Moon icon (dark)
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        )}
      </button>
    </div>
  );
}