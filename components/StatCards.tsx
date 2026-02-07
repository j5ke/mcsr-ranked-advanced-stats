import React from "react";

interface Overview {
  total: number;
  completions: number;
  forfeits: number;
  draws?: number;
  wins?: number | null;
  losses?: number | null;
  decays: number;
  avgTimeMs: number | null;
  winRate: number | null;
  userForfeits?: number;
  opponentForfeits?: number;
}

interface StatCardsProps {
  overview: Overview;
}

/**
 * Render a set of summary cards for the overview statistics.  Each card
 * displays a headline number or formatted value.  The component handles
 * cases where values may be null (e.g. average time or win rate).
 */
export default function StatCards({ overview }: StatCardsProps) {
  // Helper to format milliseconds to M:SS.xxx
  function formatTime(ms: number) {
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toFixed(3).padStart(6, '0');
    return `${minutes}:${seconds}`;
  }
  function formatPercent(p: number) {
    return (p * 100).toFixed(1) + '%';
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
      <div style={cardStyle}>
        <div style={labelStyle}>Matches</div>
        <div style={valueStyle}>{overview.total}</div>
      </div>
      <div style={cardStyle}>
        <div style={labelStyle}>Completions</div>
        <div style={valueStyle}>{overview.completions}</div>
      </div>
      <div style={cardStyle}>
        <div style={labelStyle}>Record (W / L / D)</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ ...valueStyle, color: 'green' }}>{overview.wins ?? 0}</div>
          <div style={{ ...valueStyle, color: 'red' }}>{overview.losses ?? 0}</div>
          <div style={{ ...valueStyle, color: 'blue' }}>{overview.draws ?? 0}</div>
        </div>
      </div>
      <div style={cardStyle}>
        <div style={labelStyle}>User Forfeits</div>
        <div style={valueStyle}>{overview.userForfeits ?? 0}</div>
      </div>
      <div style={cardStyle}>
        <div style={labelStyle}>Opponent Forfeits</div>
        <div style={valueStyle}>{overview.opponentForfeits ?? 0}</div>
      </div>
      
      <div style={cardStyle}>
        <div style={labelStyle}>Avg&nbsp;Time</div>
        <div style={valueStyle}>{overview.avgTimeMs != null ? formatTime(overview.avgTimeMs) : '—'}</div>
      </div>
      <div style={cardStyle}>
        <div style={labelStyle}>Win&nbsp;Rate</div>
        <div style={valueStyle}>{overview.winRate != null ? formatPercent(overview.winRate) : '—'}</div>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  border: '1px solid #eee',
  borderRadius: 12,
  padding: 12,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  justifyContent: 'center',
  backgroundColor: '#fafafa',
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#666',
  marginBottom: 4,
};

const valueStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
};