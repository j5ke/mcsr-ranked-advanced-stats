"use client";

import { MatchInfo } from "@/types/mcsr";
import { typeLabel, formatDateSec, formatDurationMs, parseVariations, humanizeStructure, humanizeBiome, humanizeVariation } from "@/lib/format";
import { format as dfFormat } from 'date-fns';
import { getMatchOutcome } from "@/lib/stats";
import { useState } from 'react';

interface MatchTableProps {
  matches: MatchInfo[];
  user: string;
}

/**
 * Render a simple table listing the filtered matches.  Displays basic
 * attributes along with seed details.  This component renders on the
 * client because the list can be large and may need interactive
 * functionality (paging, sorting) in the future.
 */
export default function MatchTable({ matches, user }: MatchTableProps) {
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; text: string } | null>(null);

  function handleDateEnter(e: React.MouseEvent, epochSec: number) {
    const text = new Date(epochSec * 1000).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' });
    setTooltip({ visible: true, x: e.clientX + 12, y: e.clientY + 12, text });
  }
  function handleDateMove(e: React.MouseEvent) {
    setTooltip((t) => t ? { ...t, x: e.clientX + 12, y: e.clientY + 12 } : t);
  }
  function handleDateLeave() {
    setTooltip(null);
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--panel-bg)' }}>
            <th style={{ ...thStyle, width: 36 }}></th>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Result</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Time</th>
            <th style={thStyle}>Overworld</th>
            <th style={thStyle}>Overworld Biome</th>
            <th style={thStyle}>Bastion</th>
            <th style={thStyle}>Bastion Biome</th>
            <th style={thStyle}>Fortress Biome</th>
            <th style={thStyle}>Additional Variations</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m) => {
            return (
              <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                {/* VOD icon/link */}
                <td style={{ padding: '6px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                  {((m as any).vod && (m as any).vod.length > 0 && (m as any).vod[0].url) ? (() => {
                    const vod = (m as any).vod[0];
                    let href = vod.url as string;
                    const startRaw = vod.startsAt;
                    const t = Number(startRaw);
                    if (!Number.isNaN(t)) {
                      href = href + (href.includes('?') ? `&t=${t}` : `?t=${t}`);
                    } else if (typeof startRaw === 'string' && startRaw) {
                      // Fallback: append as-is
                      href = href + (href.includes('?') ? `&t=${encodeURIComponent(startRaw)}` : `?t=${encodeURIComponent(startRaw)}`);
                    }
                    return (
                      <a href={href} target="_blank" rel="noopener noreferrer" title="Open VOD at match time" style={{ color: '#888', display: 'inline-block' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect>
                          <path d="M17 2l4 4"></path>
                          <path d="M7 2l-4 4"></path>
                        </svg>
                      </a>
                    );
                  })() : null}
                </td>
                <td
                  style={tdStyle}
                  onMouseEnter={(e) => handleDateEnter(e, m.date)}
                  onMouseMove={handleDateMove}
                  onMouseLeave={handleDateLeave}
                >
                  {formatDateSec(m.date)}
                </td>
                {
                  (() => {
                      const out = getMatchOutcome(m, user);
                      let resultStr = '—';
                      switch (out.outcome) {
                        case 'draw':
                          resultStr = 'Draw';
                          break;
                        case 'forfeit-win':
                          resultStr = 'Forfeit (Win)';
                          break;
                        case 'forfeit-loss':
                          resultStr = 'Forfeit (Loss)';
                          break;
                        case 'completion-win':
                          resultStr = 'Win';
                          break;
                        case 'completion-loss':
                          resultStr = 'Loss';
                          break;
                        default:
                          resultStr = m.forfeited ? 'Forfeit' : '—';
                      }
                      const resultStyle: React.CSSProperties = { ...tdStyle };
                      if (out.outcome === 'completion-win' || out.outcome === 'forfeit-win') {
                        resultStyle.color = 'green';
                        resultStyle.fontWeight = 700;
                      } else if (out.outcome === 'completion-loss' || out.outcome === 'forfeit-loss') {
                        resultStyle.color = 'red';
                        resultStyle.fontWeight = 700;
                      } else if (out.outcome === 'draw') {
                        resultStyle.color = 'blue';
                        resultStyle.fontWeight = 700;
                      }
                      return <td style={resultStyle}>{resultStr}</td>;
                  })()
                }
                <td style={tdStyle}>{typeLabel(m.type)}</td>
                <td style={tdStyle}>{m.forfeited ? 'Forfeit' : (m.result.time ? formatDurationMs(m.result.time) : '—')}</td>
                {
                  (() => {
                    const parsed = parseVariations(m.seed?.variations ?? []);
                    const overworld = humanizeStructure(m.seed?.overworld ?? null);
                    const overworldBiomes = Array.from(parsed.structures).map(s => humanizeBiome(s)).join(', ') || '—';
                    const bastion = humanizeStructure(((m as any).bastionType ?? m.seed?.bastion ?? m.seed?.nether) ?? null);
                    const bastionBiomes = Array.from(parsed.bastionBiomes).map(b => humanizeBiome(b)).join(', ') || '—';
                    const fortressBiomes = Array.from(parsed.fortressBiomes).map(b => humanizeBiome(b)).join(', ') || '—';
                    // Include bastion-* variations in the "Additional Variations" column.
                    // Previously bastion variations were excluded here; keep biome and end_spawn filtered.
                    const raw = parsed.raw.filter(r => !r.startsWith('biome') && !r.startsWith('end_spawn'));
                    const additional = raw.length > 0 ? raw.map(humanizeVariation).join(', ') : '—';
                    return (
                      <>
                        <td style={tdStyle}>{overworld}</td>
                        <td style={tdStyle}>{overworldBiomes}</td>
                        <td style={tdStyle}>{bastion}</td>
                        <td style={tdStyle}>{bastionBiomes}</td>
                        <td style={tdStyle}>{fortressBiomes}</td>
                        <td style={tdStyle}>{additional}</td>
                      </>
                    );
                  })()
                }
                
              </tr>
            );
          })}
          {matches.length === 0 && (
            <tr>
              <td colSpan={11} style={{ textAlign: 'center', padding: '1rem', color: 'var(--muted)' }}>
                No matches found for the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {tooltip && tooltip.visible && (
        <div style={{
          position: 'fixed',
          left: tooltip.x,
          top: tooltip.y,
          background: 'var(--card-bg)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          padding: '8px 10px',
          borderRadius: 8,
          boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
          zIndex: 99999,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          transition: 'transform 120ms ease, opacity 120ms ease',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{tooltip.text}</div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 600,
  borderBottom: '1px solid var(--border)',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: 12,
  whiteSpace: 'nowrap',
  color: 'var(--text)'
};