"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from 'next/navigation';
import { applyFilters, computeOverview, breakdownByKey, timeSeries, Filters } from "@/lib/stats";
import { MatchInfo } from "@/types/mcsr";
import { formatDurationMs } from "@/lib/format";
import FilterPanel from "@/components/FilterPanel";
import StatCards from "@/components/StatCards";
import MatchTable from "@/components/MatchTable";
import TimeTrend from "@/components/charts/TimeTrend";
import TimeHistogram from "@/components/charts/TimeHistogram";
import BreakdownBar from "@/components/charts/BreakdownBar";
import OverworldBastionDonut from "@/components/charts/OverworldBastionDonut";

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
  const [detailLoading, setDetailLoading] = useState(false);
  const [matchDetails, setMatchDetails] = useState<Record<string, MatchInfo>>({});
  const router = useRouter();
  const [searchValue, setSearchValue] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('Match');
  const detailFetchKeyRef = useRef<string | null>(null);

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
  const selectedOverworld = useMemo(() => {
    const set = filters.overworld ?? new Set();
    if (set.size === 1) return Array.from(set)[0] ?? null;
    return null;
  }, [filters.overworld ? Array.from(filters.overworld).join('|') : '']);

  const tabs = [
    'Match',
    'Overworld',
    'Terrain to Bastion',
    'Bastion',
    'Fortress',
    'Blind',
    'Stronghold Nav',
    'End Fight',
  ];

  const detailFetchKey = useMemo(() => {
    return JSON.stringify({
      identifier,
      types: Array.from(filters.types ?? []),
    });
  }, [identifier, JSON.stringify(Array.from(filters.types ?? []))]);

  useEffect(() => {
    if (activeTab === 'Match') return;
    if (!allMatches.length) return;
    if (detailFetchKeyRef.current === detailFetchKey) return;
    detailFetchKeyRef.current = detailFetchKey;

    const ids = allMatches.map((m) => String(m.id));
    let cancelled = false;
    async function fetchDetails() {
      setDetailLoading(true);
      try {
        const res = await fetch('/api/mcsr/matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });
        if (!res.ok) throw new Error(`Failed to fetch match details: ${res.statusText}`);
        const data = await res.json();
        if (!cancelled) {
          setMatchDetails(data.matches ?? {});
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? String(e));
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    }
    fetchDetails();
    return () => {
      cancelled = true;
    };
  }, [allMatches, detailFetchKey, activeTab]);

  const timelineSections = useMemo(() => {
    function resolveUserUuid(m: MatchInfo) {
      if (derivedUserUuid) return derivedUserUuid;
      const lower = identifier.toLowerCase();
      for (const p of m.players) {
        if (!p) continue;
        if (p.nickname && p.nickname.toLowerCase() === lower) return p.uuid ?? undefined;
        if (p.uuid && p.uuid === identifier) return p.uuid;
      }
      return undefined;
    }

    function getTimeFor(types: string[], events: any[]) {
      let best: number | null = null;
      for (const t of types) {
        const match = events.filter((e) => e.type === t);
        for (const e of match) {
          if (typeof e.time === 'number') {
            if (best == null || e.time < best) best = e.time;
          }
        }
      }
      return best;
    }

    const sections: Record<string, { timesMs: number[]; series: { dateSec: number; timeMs: number; type: number }[] }> = {
      overworld: { timesMs: [], series: [] },
      terrainToBastion: { timesMs: [], series: [] },
      bastion: { timesMs: [], series: [] },
      fortress: { timesMs: [], series: [] },
      blind: { timesMs: [], series: [] },
      strongholdNav: { timesMs: [], series: [] },
      endFight: { timesMs: [], series: [] },
    };

    for (const m of shownMatches) {
      const detail = matchDetails[String(m.id)];
      if (!detail) continue;
      const uuid = resolveUserUuid(m);
      if (!uuid) continue;
      const events = (detail as any).timelines?.filter((e: any) => e.uuid === uuid) ?? [];
      if (!events.length) continue;

      const start = 0;
      const enterNether = getTimeFor(['story.enter_the_nether'], events);
      const findBastion = getTimeFor(['nether.find_bastion'], events);
      const findFortress = getTimeFor(['nether.find_fortress'], events);
      const blindTravel = getTimeFor(['projectelo.timeline.blind_travel'], events);
      const followEye = getTimeFor(['story.follow_ender_eye'], events);
      const enterEnd = getTimeFor(['story.enter_the_end', 'end.root'], events);
      const dragonDeath = getTimeFor(['projectelo.timeline.dragon_death'], events);

      const pushIf = (key: keyof typeof sections, a: number | null, b: number | null) => {
        if (a == null || b == null) return;
        if (b < a) return;
        const delta = b - a;
        sections[key].timesMs.push(delta);
        sections[key].series.push({ dateSec: m.date, timeMs: delta, type: m.type });
      };

      pushIf('overworld', start, enterNether);
      pushIf('terrainToBastion', enterNether, findBastion);
      pushIf('bastion', findBastion, findFortress);
      pushIf('fortress', findFortress, blindTravel);
      pushIf('blind', blindTravel, followEye);
      pushIf('strongholdNav', followEye, enterEnd);
      pushIf('endFight', enterEnd, dragonDeath);
    }

    for (const key of Object.keys(sections)) {
      sections[key as keyof typeof sections].series.sort((a, b) => a.dateSec - b.dateSec);
    }
    return sections;
  }, [shownMatches, matchDetails, derivedUserUuid, identifier]);

  const tabKeyByLabel: Record<string, keyof typeof timelineSections | null> = {
    'Match': null,
    'Overworld': 'overworld',
    'Terrain to Bastion': 'terrainToBastion',
    'Bastion': 'bastion',
    'Fortress': 'fortress',
    'Blind': 'blind',
    'Terrain to Coords': null,
    'Stronghold Nav': 'strongholdNav',
    'End Fight': 'endFight',
  };

  const activeSectionKey = tabKeyByLabel[activeTab] ?? null;
  const activeSection = activeSectionKey ? timelineSections[activeSectionKey] : null;
  const avgMs = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const activeAvgMs = activeTab === 'Match'
    ? overview.avgTimeMs
    : (activeSection ? avgMs(activeSection.timesMs) : null);
  

  function submitSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const v = searchValue.trim();
    if (!v) return;
    router.push(`/u/${encodeURIComponent(v)}`);
  }

  function handleSelectOverworld(overworld: string | null) {
    if (!overworld) {
      setFilters({ ...filters, overworld: undefined });
      return;
    }
    setFilters({ ...filters, overworld: new Set([overworld]) });
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
      <div style={{ display: 'flex', gap: 16, alignItems: 'stretch', marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 520px', minWidth: 320, minHeight: 360 }}>
          <FilterPanel matches={allMatches} value={filters} onChange={setFilters} />
        </div>
        <div style={{ flex: '0 0 380px', minWidth: 320 }}>
          <OverworldBastionDonut
            matches={shownMatches}
            selectedOverworld={selectedOverworld}
            onSelectOverworld={handleSelectOverworld}
          />
        </div>
      </div>
      <StatCards overview={overview} matchesCount={matchesCount} setMatchesCount={setMatchesCount} />
      <div style={{ height: 24 }} />

      {/* Tabbed graph section */}
      <div style={{ border: '1px solid var(--border)', background: 'var(--panel-bg)', borderRadius: 12, padding: 12, boxShadow: 'var(--box-shadow)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {tabs.map((tab) => {
              const selected = tab === activeTab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 9999,
                    border: selected ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: selected ? 'var(--accent-opaque)' : 'transparent',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 10 }}>
            {detailLoading && activeTab !== 'Match' && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: 9999, background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }} />
                Loading timelines…
              </span>
            )}
            Avg: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{activeAvgMs ? formatDurationMs(activeAvgMs) : '—'}</span>
          </div>
        </div>

        {activeTab === 'Match' ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <TimeTrend data={series} />
              <TimeHistogram matches={shownMatches} user={derivedUserUuid ?? identifier} />
            </div>
            <div style={{ height: 24 }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
              <BreakdownBar title="Overworld structures" data={byOverworld} />
            </div>
          </>
        ) : detailLoading ? (
          <div style={{ color: 'var(--muted)', fontSize: 13, padding: '12px 4px' }}>
            Loading timelines…
          </div>
        ) : activeSection ? (
          activeSection.timesMs.length > 0 ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <TimeTrend data={activeSection.series} />
                <TimeHistogram matches={[]} timesMs={activeSection.timesMs} />
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--muted)', fontSize: 13, padding: '12px 4px' }}>
              No timeline segments yet for this section.
            </div>
          )
        ) : (
          <div style={{ color: 'var(--muted)', fontSize: 13, padding: '12px 4px' }}>
            Charts for this section will appear here.
          </div>
        )}
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