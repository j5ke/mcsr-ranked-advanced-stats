"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { MatchInfo } from "@/types/mcsr";
import { formatSecondsShort, formatSecondsCompact } from "@/lib/format";

interface TimeHistogramProps {
  matches: MatchInfo[];
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
export default function TimeHistogram({ matches }: TimeHistogramProps) {
  const data = useMemo(() => {
    const times = matches.filter((m) => !m.forfeited).map((m) => m.result.time / 1000);
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
  return (
    <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Time distribution</div>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 20, bottom: 40, left: 0 }}>
            <XAxis dataKey="label" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 15 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}