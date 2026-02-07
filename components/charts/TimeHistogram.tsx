"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getColor } from '@/lib/theme';
import { MatchInfo } from "@/types/mcsr";
import { formatSecondsShort, formatSecondsCompact } from "@/lib/format";
import { getMatchOutcome } from '@/lib/stats';

interface TimeHistogramProps {
  matches: MatchInfo[];
  user?: string;
}

/**
 * Bucketize an array of time values (seconds) into fixed width buckets and return
 * objects with a label and count.  The bucket label is displayed as
 * "start–end" seconds.
 */
function bucketize(times: number[], bucketSize: number) {
  const buckets: Map<number, number> = new Map();
  for (const t of times) {
    const bucketStart = Math.floor(t / bucketSize) * bucketSize;
    buckets.set(bucketStart, (buckets.get(bucketStart) ?? 0) + 1);
  }
  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([start, count]) => ({ label: `${start}–${start + bucketSize}`, count }));
}

/**
 * Histogram of completion times.  Uses a bar chart to show the number of runs
 * within each one‑minute bucket.  Forfeited runs are excluded.
 */
export default function TimeHistogram({ matches, user }: TimeHistogramProps) {
  const data = useMemo(() => {
    // Only include completed wins (non-forfeit wins) for the requested user.
    const times = matches
      .filter((m) => {
        const out = getMatchOutcome(m, user);
        return out.outcome === 'completion-win' && m.result?.time != null;
      })
      .map((m) => m.result.time / 1000);
    if (times.length === 0) return [];
    // Determine a bucket size automatically based on the spread of times
    const min = Math.min(...times);
    const max = Math.max(...times);
    const range = max - min;
    const targetBuckets = 10;
    let bucketSize = Math.ceil(range / targetBuckets);
    // Round bucket size up to nearest 10 seconds for nicer labels
    const step = 10;
    bucketSize = Math.max(step, Math.ceil(bucketSize / step) * step);
    const buckets = bucketize(times, bucketSize);
    // convert numeric second ranges into compact human-friendly labels
    return buckets.map((b: any) => {
      const parts = b.label.split('–').map((s: string) => Number(s));
      return { label: `${formatSecondsCompact(parts[0])}–${formatSecondsCompact(parts[1])}`, count: b.count };
    });
  }, [matches]);
  const totalCount = data.reduce((s, d) => s + (d.count ?? 0), 0);

  // Custom tooltip to show compact label, count and percentage
  function TooltipContent({ active, payload, label }: any) {
    if (!active || !payload || payload.length === 0) return null;
    const count = payload[0].value ?? 0;
    const pct = totalCount > 0 ? Math.round((count / totalCount) * 1000) / 10 : 0;
    return (
      <div style={{ background: 'var(--card-bg)', padding: 8, border: '1px solid var(--border)', color: 'var(--text)', boxShadow: 'var(--box-shadow)' }}>
        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{label}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>{count} wins · {pct}%</div>
      </div>
    );
  }
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, background: 'var(--card-bg)' }}>
      <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>Time distribution</div>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 20, bottom: 40, left: 0 }}>
            <XAxis dataKey="label" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip content={<TooltipContent />} />
            <Bar dataKey="count">
              {data.map((_, i) => (
                <Cell key={`cell-${i}`} fill={getColor(i)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}