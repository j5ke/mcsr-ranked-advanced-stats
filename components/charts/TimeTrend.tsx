"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { PALETTE } from '@/lib/theme';
import { format } from "date-fns";
import { formatSecondsShort, formatSecondsCompact } from "@/lib/format";

interface DataPoint {
  dateSec: number;
  timeMs: number | null;
  type: number;
}

interface TimeTrendProps {
  data: DataPoint[];
}

/**
 * A line chart plotting completion time (in seconds) over chronological order.
 * For forfeited runs, the time is omitted, causing the line to break.  This
 * component uses Recharts and automatically resizes to fill its container.
 */
export default function TimeTrend({ data }: TimeTrendProps) {
  // Only include completed runs (non-null times), convert ms to seconds,
  // and build a human-readable date label for tooltips.
  const chartData = data
    .filter((d) => d.timeMs != null)
    .map((d) => ({ date: format(new Date(d.dateSec * 1000), 'yyyy-MM-dd'), timeSec: d.timeMs! / 1000 }));
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, background: 'var(--card-bg)' }}>
      <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>Completion time trend</div>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 20, left: 40 }}>
            <XAxis dataKey="date" hide={true} />
            <YAxis allowDecimals={false} tickFormatter={(v) => formatSecondsCompact(Number(v))} />
            <Tooltip
              formatter={(value) => (value != null ? formatSecondsShort(Number(value)) : 'Forfeit')}
              contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
              labelStyle={{ color: 'var(--muted)' }}
              itemStyle={{ color: 'var(--text)' }}
            />
            <Line type="monotone" dataKey="timeSec" dot={false} connectNulls={false} stroke={PALETTE.primaryDark} strokeWidth={2.5} strokeLinecap="round" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}