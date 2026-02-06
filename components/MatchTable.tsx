"use client";

import { MatchInfo } from "@/types/mcsr";
import { format } from "date-fns";

interface MatchTableProps {
  matches: MatchInfo[];
}

const TYPE_LABELS: Record<number, string> = {
  1: "Ranked",
  2: "Casual",
  3: "Set seed",
  4: "Unknown",
};

/**
 * Render a simple table listing the filtered matches.  Displays basic
 * attributes along with seed details.  This component renders on the
 * client because the list can be large and may need interactive
 * functionality (paging, sorting) in the future.
 */
export default function MatchTable({ matches }: MatchTableProps) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f5f5' }}>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Time</th>
            <th style={thStyle}>Overworld</th>
            <th style={thStyle}>Bastion</th>
            <th style={thStyle}>Variations</th>
            <th style={thStyle}>End towers</th>
            <th style={thStyle}>Result</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m) => {
            const date = new Date(m.date * 1000);
            const typeLabel = TYPE_LABELS[m.type] ?? String(m.type);
            const timeDisplay = m.forfeited
              ? 'Forfeit'
              : m.result.time
              ? `${(m.result.time / 1000).toFixed(2)}s`
              : '—';
            return (
              <tr key={m.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={tdStyle}>{format(date, 'yyyy-MM-dd')}</td>
                <td style={tdStyle}>{typeLabel}</td>
                <td style={tdStyle}>{timeDisplay}</td>
                <td style={tdStyle}>{m.seed?.overworld ?? '—'}</td>
                <td style={tdStyle}>{m.seed?.bastion ?? '—'}</td>
                <td style={tdStyle}>{(m.seed?.variations ?? []).join(', ') || '—'}</td>
                <td style={tdStyle}>{(m.seed?.endTowers ?? []).join(', ') || '—'}</td>
                <td style={tdStyle}>{m.forfeited ? 'Forfeit' : m.result.uuid ? (m.result.uuid === m.players[0]?.uuid ? 'Win' : 'Loss') : '—'}</td>
              </tr>
            );
          })}
          {matches.length === 0 && (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', padding: '1rem', color: '#888' }}>
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