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

type Option<T extends string | number> = { value: T; label: string };

interface MultiSelectProps<T extends string | number> {
  label: string;
  options: Option<T>[];
  selected?: Set<T>;
  onToggle: (value: T) => void;
  onClear?: () => void;
  placeholder?: string;
  emptyLabel?: string;
}

function MultiSelect<T extends string | number>({
  label,
  options,
  selected,
  onToggle,
  onClear,
  placeholder = "Type to filter…",
  emptyLabel = "N/A",
}: MultiSelectProps<T>) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const normalized = query.trim().toLowerCase();
  const filtered = normalized
    ? options.filter((o) => o.label.toLowerCase().includes(normalized))
    : options;
  const selectedList = options.filter((o) => selected?.has(o.value));

  return (
    <div
      className={styles.multiSelect}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setOpen(false);
        }
      }}
    >
      {label ? (
        <div className={styles.sectionTitleRow}>
          <div className={styles.sectionTitle}>{label}</div>
          {selected && selected.size > 0 && onClear && (
            <button type="button" className={styles.clearButton} onClick={onClear}>
              Clear
            </button>
          )}
        </div>
      ) : null}
      <div className={styles.multiSelectBox}>
        <div className={styles.chipsRow}>
          {selectedList.length > 0 ? (
            selectedList.map((o) => (
              <button
                key={`${String(o.value)}-chip`}
                type="button"
                className={styles.chip}
                onClick={() => onToggle(o.value)}
              >
                {o.label}
                <span aria-hidden className={styles.chipX}>×</span>
              </button>
            ))
          ) : (
            <span className={styles.mutedSmall}>All</span>
          )}
          <input
            className={styles.multiSelectInput}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            aria-label={`${label || 'Filter'} filter`}
          />
        </div>
        {open && (
          <div className={styles.multiSelectMenu}>
            {filtered.length > 0 ? (
              filtered.map((o) => (
                <div
                  key={String(o.value)}
                  className={styles.multiSelectOption}
                  role="button"
                  tabIndex={0}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onToggle(o.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onToggle(o.value);
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!selected?.has(o.value)}
                    readOnly
                  />
                  <span>{o.label}</span>
                </div>
              ))
            ) : (
              <span className={styles.mutedSmall}>{emptyLabel}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
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
  // Match types (explicit list). Multi-select with All when empty.
  const TYPE_OPTIONS: number[] = [1, 2, 3, 4];
  const typeLabels = (n: number) => typeLabel(n);

  function setTypes(nextTypes?: Set<number>) {
    const next = {
      ...value,
      types: nextTypes && nextTypes.size > 0 ? nextTypes : undefined,
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

  function toggleType(t: number) {
    const current = (value.types as Set<number> | undefined) ?? new Set<number>();
    const next = new Set(current);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    setTypes(next);
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
          <div className={styles.mutedSmall}>How does filtering work?</div>
        </div>
      </div>
      {/* Slider moved to StatCards; keep space for future small controls */}
      <div className={styles.grid}>
        {/* Match Type (single-select) */}
        <MultiSelect
          label="Match Type"
          options={TYPE_OPTIONS.map((t) => ({ value: t, label: typeLabels(t) }))}
          selected={value.types as Set<number> | undefined}
          onToggle={toggleType}
          onClear={() => setTypes(undefined)}
          placeholder="Filter match types…"
        />
        {/* Overworld */}
        <MultiSelect
          label="Overworld"
          options={overworlds.map((o) => ({ value: o, label: humanizeStructure(o) }))}
          selected={value.overworld as Set<string> | undefined}
          onToggle={(o) => toggleSet('overworld', o)}
          onClear={() => onChange({ ...value, overworld: undefined })}
          placeholder="Filter overworlds…"
        />
        {/* Bastion */}
        <MultiSelect
          label="Bastion"
          options={bastions.map((b) => ({ value: b, label: humanizeStructure(b) }))}
          selected={value.bastion as Set<string> | undefined}
          onToggle={(b) => toggleSet('bastion', b)}
          onClear={() => onChange({ ...value, bastion: undefined })}
          placeholder="Filter bastions…"
        />
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
          <MultiSelect
            label=""
            options={variations.map((v) => ({ value: v, label: humanizeVariation(v) }))}
            selected={value.variations as Set<string> | undefined}
            onToggle={toggleVariation}
            onClear={() => onChange({ ...value, variations: undefined })}
            placeholder="Filter variations…"
          />
        </div>
        {/* End tower heights removed */}
      </div>
      {/* Derived variation categories */}
      <div className={styles.rowGap} />
      <div className={styles.grid}>
        <MultiSelect
          label="Fortress biomes"
          options={fortressBiomes.map((b) => ({ value: b, label: humanizeBiome(b) }))}
          selected={value.fortress as Set<string> | undefined}
          onToggle={(b) => toggleSet('fortress', b)}
          onClear={() => onChange({ ...value, fortress: undefined })}
          placeholder="Filter fortress biomes…"
        />
        <MultiSelect
          label="Bastion biomes"
          options={bastionBiomes.map((b) => ({ value: b, label: humanizeBiome(b) }))}
          selected={value.bastionBiome as Set<string> | undefined}
          onToggle={(b) => toggleSet('bastionBiome', b)}
          onClear={() => onChange({ ...value, bastionBiome: undefined })}
          placeholder="Filter bastion biomes…"
        />
        <MultiSelect
          label="Overworld biomes"
          options={structures.map((s) => ({ value: s, label: humanizeStructure(s) }))}
          selected={value.structure as Set<string> | undefined}
          onToggle={(s) => toggleSet('structure', s)}
          onClear={() => onChange({ ...value, structure: undefined })}
          placeholder="Filter overworld biomes…"
        />
        
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