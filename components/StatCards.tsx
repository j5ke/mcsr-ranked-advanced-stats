import React from "react";

interface Overview {
  total: number;
  completions: number;
  forfeits: number;
  decays: number;
  avgTimeMs: number | null;
  winRate: number | null;
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
        <div style={labelStyle}>Forfeits</div>
        <div style={valueStyle}>{overview.forfeits}</div>
      </div>
      <div style={cardStyle}>
        <div style={labelStyle}>Decayed</div>
        <div style={valueStyle}>{overview.decays}</div>
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