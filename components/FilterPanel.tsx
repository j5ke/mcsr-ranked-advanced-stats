"use client";

import { useMemo, useState } from "react";
import { MatchInfo } from "@/types/mcsr";
import { Filters, applyFilters } from "@/lib/stats";
import { parseVariations, humanizeBiome, humanizeStructure, typeLabel, humanizeVariation, getBastionTypeFromSeed, VARIATION_AUTO_LINKS } from "@/lib/format";
import styles from './FilterPanel.module.css';

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
  const [showCount, setShowCount] = useState(false);
  const [showVariationsInfo, setShowVariationsInfo] = useState(false);
  const count = 100;
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
  // Build a dependency key representing all non-variation filters so the
  // variations list recomputes whenever other filters change.
  const variationsFilterKey = JSON.stringify({
    types: Array.from(value.types ?? []),
    startDateSec: value.startDateSec ?? null,
    endDateSec: value.endDateSec ?? null,
    overworld: Array.from(value.overworld ?? []),
    bastion: Array.from(value.bastion ?? []),
    fortress: Array.from(value.fortress ?? []),
    bastionBiome: Array.from(value.bastionBiome ?? []),
    structure: Array.from(value.structure ?? []),
    bastionType: Array.from(value.bastionType ?? []),
    // Include currently-selected variations so the variations list
    // recomputes when the user toggles a variation (narrowing the set).
    variations: Array.from(value.variations ?? []),
    hideDecayed: !!value.hideDecayed,
    hideForfeits: !!value.hideForfeits,
    beginnerOnly: !!value.beginnerOnly,
  });

  const variations = useMemo(() => {
    const result = new Set<string>();
    const BLOCKED_PREFIXES = ['biome:', 'end_spawn', 'end_tower', 'type:structure'];
    const BLOCKED_EXACT = new Set([
      'chest:structure:carrot',
      'chest:structure:golden_carrot',
      'chest:structure:obsidian'
    ]);

    // Compute variations from the matches that remain after applying
    // the current filters (including any selected variations). This
    // means selecting a variation will narrow the list to variations
    // that co-occur with the selection.
    const baseMatches = applyFilters(matches, value);
    for (const m of baseMatches) {
      const seed = m.seed;
      for (const v of seed?.variations ?? []) {
        if (!v) continue;
        if (BLOCKED_EXACT.has(v)) continue;
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
  }, [matches, variationsFilterKey]);
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
    <div className={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className={styles.header}>Filters</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className={styles.mutedSmall}>Matches (view controls in Stats)</div>
        </div>
      </div>
      {/* Slider moved to StatCards; keep space for future small controls */}
      <div className={styles.grid}>
        {/* Match Type (single-select) */}
        <div>
          <div className={styles.sectionTitle}>Match Type</div>
          <div className={styles.btnGroup}>
            <button
              key="all"
              onClick={() => selectType(undefined)}
              className={`${styles.btn} ${!value.types ? styles.selected : ''}`}
            >
              All
            </button>
            {TYPE_OPTIONS.map((t) => {
              const selected = value.types ? Array.from(value.types)[0] === t : false;
              return (
                <button
                  key={t}
                  onClick={() => selectType(t)}
                  className={`${styles.btn} ${selected ? styles.selected : ''}`}
                >
                  {typeLabels(t)}
                </button>
              );
            })}
          </div>
        </div>
        {/* Overworld */}
        <div>
          <div className={styles.sectionTitle}>Overworld</div>
          <div className={styles.btnGroup}>
            {overworlds.map((o) => (
              <button key={o} onClick={() => toggleSet('overworld', o)} className={`${styles.btn} ${value.overworld?.has(o) ? styles.selected : ''}`}>
                {humanizeStructure(o)}
              </button>
            ))}
            {overworlds.length === 0 && <span className={styles.mutedSmall}>N/A</span>}
          </div>
        </div>
        {/* Bastion */}
        <div>
          <div className={styles.sectionTitle}>Bastion</div>
          <div className={styles.btnGroup}>
            {bastions.map((b) => (
              <button key={b} onClick={() => toggleSet('bastion', b)} className={`${styles.btn} ${value.bastion?.has(b) ? styles.selected : ''}`}>
                {humanizeStructure(b)}
              </button>
            ))}
            {bastions.length === 0 && <span className={styles.mutedSmall}>N/A</span>}
          </div>
        </div>
        {/* Variations */}
        <div>
          <div className={styles.sectionTitleWrap}>
            <div className={styles.sectionTitle}>Variations</div>
            <button
              aria-label="Variations info"
              onMouseEnter={() => setShowVariationsInfo(true)}
              onFocus={() => setShowVariationsInfo(true)}
              onMouseLeave={() => setShowVariationsInfo(false)}
              onBlur={() => setShowVariationsInfo(false)}
              className={styles.infoButton}
              title="Explain variations"
            >
              i
            </button>
            {showVariationsInfo && (
              <div className={styles.infoTooltip} role="status">
                Variations are details about the seed. 1 Small Single refers to Stables single chest. Singles refer to singles, unless Stables, where they are doubles.
              </div>
            )}
          </div>
          <div className={`${styles.btnGroup} ${styles.variationsScroll}`}>
            {variations.map((v) => (
              <button key={v} onClick={() => toggleVariation(v)} className={`${styles.btn} ${value.variations?.has(v) ? styles.selected : ''}`}>
                {humanizeVariation(v)}
              </button>
            ))}
            {variations.length === 0 && <span className={styles.mutedSmall}>N/A</span>}
          </div>
        </div>
        {/* End tower heights removed */}
      </div>
      {/* Derived variation categories */}
      <div className={styles.rowGap} />
      <div className={styles.grid}>
        <div>
          <div className={styles.sectionTitle}>Fortress biomes</div>
          <div className={styles.btnGroup}>
            {fortressBiomes.map((b) => (
              <button key={b} onClick={() => toggleSet('fortress', b)} className={`${styles.btn} ${value.fortress?.has(b) ? styles.selected : ''}`}>{humanizeBiome(b)}</button>
            ))}
            {fortressBiomes.length === 0 && <span className={styles.mutedSmall}>N/A</span>}
          </div>
        </div>
        <div>
          <div className={styles.sectionTitle}>Bastion biomes</div>
          <div className={styles.btnGroup}>
            {bastionBiomes.map((b) => (
              <button key={b} onClick={() => toggleSet('bastionBiome', b)} className={`${styles.btn} ${value.bastionBiome?.has(b) ? styles.selected : ''}`}>{humanizeBiome(b)}</button>
            ))}
            {bastionBiomes.length === 0 && <span className={styles.mutedSmall}>N/A</span>}
          </div>
        </div>
        <div>
          <div className={styles.sectionTitle}>Overworld biomes</div>
          <div className={styles.btnGroup}>
            {structures.map((s) => (
              <button key={s} onClick={() => toggleSet('structure', s)} className={`${styles.btn} ${value.structure?.has(s) ? styles.selected : ''}`}>{humanizeStructure(s)}</button>
            ))}
            {structures.length === 0 && <span className={styles.mutedSmall}>N/A</span>}
          </div>
        </div>
        
        {/* End spawn buried filter removed */}
      </div>
      {/* Additional toggle checkboxes */}
      <div className={styles.checkboxRow}>
        <label className={styles.labelCheckbox}>
          <input type="checkbox" checked={!!value.hideForfeits} onChange={(e) => onChange({ ...value, hideForfeits: e.target.checked })} />
          Hide forfeits
        </label>
        <label className={styles.labelCheckbox}>
          <input type="checkbox" checked={!!value.hideDecayed} onChange={(e) => onChange({ ...value, hideDecayed: e.target.checked })} />
          Hide decayed
        </label>
        <label className={styles.labelCheckbox}>
          <input type="checkbox" checked={!!value.beginnerOnly} onChange={(e) => onChange({ ...value, beginnerOnly: e.target.checked })} />
          Beginner only
        </label>
      </div>
    </div>
  );
}