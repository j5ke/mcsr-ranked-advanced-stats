"use client";

import { useMemo } from "react";
import { MatchInfo } from "@/types/mcsr";
import { Filters } from "@/lib/stats";

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
  const overworlds = useMemo(() => uniqStrings(matches.map((m) => m.seed?.overworld)), [matches]);
  const bastions = useMemo(() => uniqStrings(matches.map((m) => m.seed?.bastion)), [matches]);
  const variations = useMemo(() => uniqStrings(matches.flatMap((m) => m.seed?.variations ?? [])), [matches]);
  const endHeights = useMemo(() => uniqNumbers(matches.flatMap((m) => m.seed?.endTowers ?? [])), [matches]);

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

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 12 }}>Filters</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
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
                {o}
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
                {b}
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
                onClick={() => toggleSet('variations', v)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: value.variations?.has(v) ? '2px solid #0070f3' : '1px solid #ccc',
                  backgroundColor: value.variations?.has(v) ? '#e6f4ff' : 'white',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                {v}
              </button>
            ))}
            {variations.length === 0 && <span style={{ fontSize: 12 }}>N/A</span>}
          </div>
        </div>
        {/* End tower heights */}
        <div>
          <div style={{ fontSize: 12, marginBottom: 6, color: '#666' }}>End tower heights</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
            {endHeights.map((h) => (
              <button
                key={h}
                onClick={() => toggleSet('endTowerHeights', h)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: value.endTowerHeights?.has(h) ? '2px solid #0070f3' : '1px solid #ccc',
                  backgroundColor: value.endTowerHeights?.has(h) ? '#e6f4ff' : 'white',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                {h}
              </button>
            ))}
            {endHeights.length === 0 && <span style={{ fontSize: 12 }}>N/A</span>}
          </div>
        </div>
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