"use client";

import { MatchInfo } from "@/types/mcsr";
import { typeLabel, formatDateSec, formatDurationMs, parseVariations, humanizeStructure, humanizeBiome, humanizeVariation } from "@/lib/format";
import { getMatchOutcome } from "@/lib/stats";

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
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f5f5' }}>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Result</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Time</th>
            <th style={thStyle}>Overworld</th>
            <th style={thStyle}>Bastion</th>
            <th style={thStyle}>Variations</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m) => {
            return (
              <tr key={m.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={tdStyle}>{formatDateSec(m.date)}</td>
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
                      return <td style={tdStyle}>{resultStr}</td>;
                  })()
                }
                <td style={tdStyle}>{typeLabel(m.type)}</td>
                <td style={tdStyle}>{m.forfeited ? 'Forfeit' : (m.result.time ? formatDurationMs(m.result.time) : '—')}</td>
                <td style={tdStyle}>{humanizeStructure(m.seed?.overworld ?? null)}</td>
                <td style={tdStyle}>{humanizeStructure(((m as any).bastionType ?? m.seed?.bastion ?? m.seed?.nether) ?? null)}</td>
                <td style={tdStyle}>{
                  (() => {
                    const parsed = parseVariations(m.seed?.variations ?? []);
                    const parts: string[] = [];
                    if (parsed.structures.size > 0) parts.push(...Array.from(parsed.structures).map(s => humanizeStructure(s)));
                    if (parsed.fortressBiomes.size > 0) parts.push(...Array.from(parsed.fortressBiomes).map(b => `Fortress: ${humanizeBiome(b)}`));
                    if (parsed.bastionBiomes.size > 0) parts.push(...Array.from(parsed.bastionBiomes).map(b => `Bastion: ${humanizeBiome(b)}`));
                    const raw = parsed.raw.filter(r => !r.startsWith('biome') && !r.startsWith('bastion') && !r.startsWith('end_spawn'));
                    if (raw.length > 0) parts.push(...raw.map(humanizeVariation));
                    return parts.join(', ') || '—';
                  })()
                }</td>
                
              </tr>
            );
          })}
          {matches.length === 0 && (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: '1rem', color: '#888' }}>
                No matches found for the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 600,
  borderBottom: '1px solid #ccc',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: 12,
  whiteSpace: 'nowrap',
};