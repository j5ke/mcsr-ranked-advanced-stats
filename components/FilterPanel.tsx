"use client";

import { useMemo } from "react";
import { MatchInfo } from "@/types/mcsr";
import { Filters } from "@/lib/stats";
import { parseVariations, humanizeBiome, humanizeStructure, typeLabel, humanizeVariation, getBastionTypeFromSeed, VARIATION_AUTO_LINKS } from "@/lib/format";

function uniqStrings(values: (string | null | undefined)[]) {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v)))).sort();
}
function uniqNumbers(values: number[]) {
  return Array.from(new Set(values)).sort((a, b) => a - b);
}

interface FilterPanelProps {
  matches: MatchInfo[];
  value: Filters;
  onChange: (filters: Filters) => void;
}

/**
 * Panel containing filter controls for seed parameters and match properties.  The
 * panel computes unique values from the provided matches and renders them
 * as toggle buttons.  Toggling buttons updates the corresponding set in
 * `filters`.  Additional checkboxes allow hiding forfeits/decays or
 * focusing on beginner matches only.
 */
export default function FilterPanel({ matches, value, onChange }: FilterPanelProps) {
  // Unique lists for each seed dimension
  // Match types (explicit list). Single-select: choose one type or All.
  const TYPE_OPTIONS: number[] = [1, 2, 3, 4];
  const typeLabels = (n: number) => typeLabel(n);

  function selectType(t?: number) {
    if (t == null) {
      onChange({ ...value, types: undefined });
      return;
    }
    const current = value.types ? Array.from(value.types)[0] : undefined;
    if (current === t) {
      onChange({ ...value, types: undefined });
    } else {
      // When switching match type, clear seed-derived filters so the
      // freshly-fetched matches for the selected type are shown
      // unfiltered. Keep global toggles (hideForfeits, hideDecayed,
      // beginnerOnly) intact.
        const next = {
          ...value,
          types: new Set([t]),
          overworld: undefined,
          bastion: undefined,
          variations: undefined,
          fortress: undefined,
          bastionBiome: undefined,
          structure: undefined,
          bastionType: undefined,
        };
      onChange(next);
    }
  }

  const overworlds = useMemo(() => uniqStrings(matches.map((m) => m.seed?.overworld)), [matches]);
  const bastions = useMemo(() => uniqStrings(matches.map((m) => (m as any).bastionType ?? m.seed?.bastion ?? m.seed?.nether)), [matches]);
  const variations = useMemo(() => {
    // Always populate variations from all matches (no "build from nothing"
    // gating). The list still respects blocking rules so unwanted keys are
    // filtered out.
    const result = new Set<string>();
    const BLOCKED_PREFIXES = ['biome:', 'end_spawn', 'end_tower', 'type:structure'];
    const BLOCKED_EXACT = new Set([
      'chest:structure:carrot',
      'chest:structure:obsidian',
      'bastion:triple:2',
      'bastion:triple:1',
      'bastion:single:1',
      'bastion:single:2',
      'bastion:small_single:1',
      'bastion:small_single:2',
      'bastion:triple:3',
    ]);
    for (const m of matches) {
      const seed = m.seed;
      const parsed = parseVariations(seed?.variations ?? []);
      const bastionVal = (m as any).bastionType ?? seed?.bastion ?? seed?.nether ?? null;
      for (const v of seed?.variations ?? []) {
        if (!v) continue;
        // Skip exact-blocked variations
        if (BLOCKED_EXACT.has(v)) continue;
        // Skip blocked variation types by prefix
        let skip = false;
        for (const p of BLOCKED_PREFIXES) {
          if (v.startsWith(p)) {
            skip = true;
            break;
          }
        }
        if (skip) continue;
        result.add(v);
      }
    }
    return uniqStrings(Array.from(result));
  }, [matches, JSON.stringify(Array.from(value.overworld ?? [])), JSON.stringify(Array.from(value.bastion ?? [])), JSON.stringify(Array.from(value.fortress ?? [])), JSON.stringify(Array.from(value.structure ?? [])), JSON.stringify(Array.from(value.bastionBiome ?? []))]);
  const fortressBiomes = useMemo(() => uniqStrings(matches.flatMap((m) => Array.from(parseVariations(m.seed?.variations ?? []).fortressBiomes))), [matches]);
  const bastionBiomes = useMemo(() => uniqStrings(matches.flatMap((m) => Array.from(parseVariations(m.seed?.variations ?? []).bastionBiomes))), [matches]);
  const structures = useMemo(() => uniqStrings(matches.flatMap((m) => Array.from(parseVariations(m.seed?.variations ?? []).structures))), [matches]);

  // Toggle helper: update a set on the filters object
  function toggleSet<K extends keyof Filters>(key: K, item: any) {
    const current = (value[key] as Set<any> | undefined) ?? new Set<any>();
    const next = new Set(current);
    if (next.has(item)) {
      next.delete(item);
    } else {
      next.add(item);
    }
    onChange({ ...value, [key]: next.size > 0 ? next : undefined });
  }

  // Special variation toggler: when adding the 'good_gap' variations,
  // also auto-select the STABLES bastion since they are tightly coupled.
  function toggleVariation(v: string) {
    const current = (value.variations as Set<string> | undefined) ?? new Set<string>();
    const nextVariations = new Set(current);
    const adding = !nextVariations.has(v);
    if (adding) nextVariations.add(v);
    else nextVariations.delete(v);

    const nextFilters: Filters = { ...value, variations: nextVariations.size > 0 ? nextVariations : undefined } as any;

    // Look up any auto-links for this variation (centralized mapping).
    const link = VARIATION_AUTO_LINKS[v];
    if (adding && link?.bastion) {
      const currentB = (value.bastion as Set<string> | undefined) ?? new Set<string>();
      const nextB = new Set(currentB);
      nextB.add(link.bastion);
      nextFilters.bastion = nextB.size > 0 ? nextB : undefined;
    }

    onChange(nextFilters);
  }

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 12 }}>Filters</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        {/* Match Type (single-select) */}
        <div>
          <div style={{ fontSize: 12, marginBottom: 6, color: '#666' }}>Match Type</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button
              key="all"
              onClick={() => selectType(undefined)}
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                border: !value.types ? '2px solid #0070f3' : '1px solid #ccc',
                backgroundColor: !value.types ? '#e6f4ff' : 'white',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              All
            </button>
            {TYPE_OPTIONS.map((t) => {
              const selected = value.types ? Array.from(value.types)[0] === t : false;
              return (
                <button
                  key={t}
                  onClick={() => selectType(t)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: selected ? '2px solid #0070f3' : '1px solid #ccc',
                    backgroundColor: selected ? '#e6f4ff' : 'white',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  {typeLabels(t)}
                </button>
              );
            })}
          </div>
        </div>
        {/* Overworld */}
        <div>
          <div style={{ fontSize: 12, marginBottom: 6, color: '#666' }}>Overworld</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {overworlds.map((o) => (
              <button
                key={o}
                onClick={() => toggleSet('overworld', o)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: value.overworld?.has(o) ? '2px solid #0070f3' : '1px solid #ccc',
                  backgroundColor: value.overworld?.has(o) ? '#e6f4ff' : 'white',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                {humanizeStructure(o)}
              </button>
            ))}
            {overworlds.length === 0 && <span style={{ fontSize: 12 }}>N/A</span>}
          </div>
        </div>
        {/* Bastion */}
        <div>
          <div style={{ fontSize: 12, marginBottom: 6, color: '#666' }}>Bastion</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {bastions.map((b) => (
              <button
                key={b}
                onClick={() => toggleSet('bastion', b)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: value.bastion?.has(b) ? '2px solid #0070f3' : '1px solid #ccc',
                  backgroundColor: value.bastion?.has(b) ? '#e6f4ff' : 'white',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                {humanizeStructure(b)}
              </button>
            ))}
            {bastions.length === 0 && <span style={{ fontSize: 12 }}>N/A</span>}
          </div>
        </div>
        {/* Variations */}
        <div>
          <div style={{ fontSize: 12, marginBottom: 6, color: '#666' }}>Variations</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
            {variations.map((v) => (
              <button
                key={v}
                onClick={() => toggleVariation(v)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: value.variations?.has(v) ? '2px solid #0070f3' : '1px solid #ccc',
                  backgroundColor: value.variations?.has(v) ? '#e6f4ff' : 'white',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                {humanizeVariation(v)}
              </button>
            ))}
            {variations.length === 0 && <span style={{ fontSize: 12 }}>N/A</span>}
          </div>
        </div>
        {/* End tower heights removed */}
      </div>
      {/* Derived variation categories */}
      <div style={{ height: 12 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div>
          <div style={{ fontSize: 12, marginBottom: 6, color: '#666' }}>Fortress biomes</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {fortressBiomes.map((b) => (
              <button key={b} onClick={() => toggleSet('fortress', b)} style={{ padding: '4px 8px', borderRadius: 6, border: value.fortress?.has(b) ? '2px solid #0070f3' : '1px solid #ccc', backgroundColor: value.fortress?.has(b) ? '#e6f4ff' : 'white', cursor: 'pointer', fontSize: 12 }}>{humanizeBiome(b)}</button>
            ))}
            {fortressBiomes.length === 0 && <span style={{ fontSize: 12 }}>N/A</span>}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, marginBottom: 6, color: '#666' }}>Bastion biomes</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {bastionBiomes.map((b) => (
              <button key={b} onClick={() => toggleSet('bastionBiome', b)} style={{ padding: '4px 8px', borderRadius: 6, border: value.bastionBiome?.has(b) ? '2px solid #0070f3' : '1px solid #ccc', backgroundColor: value.bastionBiome?.has(b) ? '#e6f4ff' : 'white', cursor: 'pointer', fontSize: 12 }}>{humanizeBiome(b)}</button>
            ))}
            {bastionBiomes.length === 0 && <span style={{ fontSize: 12 }}>N/A</span>}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, marginBottom: 6, color: '#666' }}>Overworld biomes</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {structures.map((s) => (
              <button key={s} onClick={() => toggleSet('structure', s)} style={{ padding: '4px 8px', borderRadius: 6, border: value.structure?.has(s) ? '2px solid #0070f3' : '1px solid #ccc', backgroundColor: value.structure?.has(s) ? '#e6f4ff' : 'white', cursor: 'pointer', fontSize: 12 }}>{humanizeStructure(s)}</button>
            ))}
            {structures.length === 0 && <span style={{ fontSize: 12 }}>N/A</span>}
          </div>
        </div>
        
        {/* End spawn buried filter removed */}
      </div>
      {/* Additional toggle checkboxes */}
      <div style={{ marginTop: 12, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 12 }}>
          <input
            type="checkbox"
            checked={!!value.hideForfeits}
            onChange={(e) => onChange({ ...value, hideForfeits: e.target.checked })}
            style={{ marginRight: 4 }}
          />
          Hide forfeits
        </label>
        <label style={{ fontSize: 12 }}>
          <input
            type="checkbox"
            checked={!!value.hideDecayed}
            onChange={(e) => onChange({ ...value, hideDecayed: e.target.checked })}
            style={{ marginRight: 4 }}
          />
          Hide decayed
        </label>
        <label style={{ fontSize: 12 }}>
          <input
            type="checkbox"
            checked={!!value.beginnerOnly}
            onChange={(e) => onChange({ ...value, beginnerOnly: e.target.checked })}
            style={{ marginRight: 4 }}
          />
          Beginner only
        </label>
      </div>
    </div>
  );
}