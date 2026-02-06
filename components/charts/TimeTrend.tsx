"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

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
  // Filter out null time values and convert ms to seconds.  Also build a
  // human‑readable date label for tooltips.
  const chartData = data.map((d) => {
    return {
      date: format(new Date(d.dateSec * 1000), 'yyyy-MM-dd'),
      timeSec: d.timeMs != null ? d.timeMs / 1000 : null,
    };
  });
  return (
    <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Completion time trend</div>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
            <XAxis dataKey="date" hide={true} />
            <YAxis allowDecimals={false} unit="s" />
            <Tooltip formatter={(value) => (value != null ? `${value.toFixed(2)}s` : 'Forfeit')} />
            <Line type="monotone" dataKey="timeSec" dot={false} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}