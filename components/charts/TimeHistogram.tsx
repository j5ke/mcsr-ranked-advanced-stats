"use client";

import { ParentSize } from "@visx/responsive";
import { scaleBand, scaleLinear } from "@visx/scale";
import { AxisLeft, AxisBottom } from "@visx/axis";
import { GridRows } from "@visx/grid";
import { useTooltip, useTooltipInPortal, defaultStyles } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import { useEffect, useMemo, useState } from "react";
import { getColor } from '@/lib/theme';
import { MatchInfo } from "@/types/mcsr";
import { formatSecondsCompact } from "@/lib/format";
import { getMatchOutcome } from '@/lib/stats';

interface TimeHistogramProps {
  matches: MatchInfo[];
  user?: string;
  timesMs?: number[];
}

interface TimeHistogramInnerProps {
  width: number;
  height: number;
  data: { label: string; count: number }[];
  labelWord: string;
  totalCount: number;
}

function TimeHistogramInner({ width, height, data, labelWord, totalCount }: TimeHistogramInnerProps) {
  const margin = { top: 12, right: 16, bottom: 64, left: 44 };
  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);
  if (innerWidth <= 0 || innerHeight <= 0) return null;
  if (data.length === 0) {
    return (
      <svg width={width} height={height}>
        <text x={width / 2} y={height / 2} textAnchor="middle" fill="var(--muted)" fontSize={12}>
          No completion data
        </text>
      </svg>
    );
  }

  const xScale = scaleBand({
    domain: data.map((d) => d.label),
    range: [0, innerWidth],
    padding: 0.2,
  });
  const yMax = Math.max(...data.map((d) => d.count));
  const yScale = scaleLinear({
    domain: [0, yMax],
    range: [innerHeight, 0],
    nice: true,
  });

  const { tooltipData, tooltipLeft, tooltipTop, showTooltip, hideTooltip } = useTooltip<typeof data[number]>();
  const { containerRef, TooltipInPortal } = useTooltipInPortal({ scroll: true });
  const [animate, setAnimate] = useState(false);
  const animKey = useMemo(() => data.map((d) => `${d.label}:${d.count}`).join('|'), [data]);

  useEffect(() => {
    setAnimate(false);
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, [animKey]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width, height }}>
      <svg width={width} height={height} style={{ transition: 'opacity 320ms ease', opacity: animate ? 1 : 0.6 }}>
        <g transform={`translate(${margin.left},${margin.top})`}>
          <GridRows scale={yScale} width={innerWidth} stroke="var(--border)" strokeOpacity={0.4} />
          {data.map((d, i) => {
            const x = xScale(d.label) ?? 0;
            const barWidth = xScale.bandwidth();
            const barHeight = innerHeight - (yScale(d.count) ?? 0);
            const y = yScale(d.count) ?? 0;
            return (
              <rect
                key={d.label}
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={getColor(i)}
                rx={6}
                style={{ transition: 'height 320ms ease, y 320ms ease' }}
                onMouseMove={(event) => {
                  const point = localPoint(event);
                  if (!point) return;
                  showTooltip({
                    tooltipData: d,
                    tooltipLeft: point.x,
                    tooltipTop: point.y,
                  });
                }}
                onMouseLeave={() => hideTooltip()}
              />
            );
          })}
          <AxisLeft
            scale={yScale}
            stroke="var(--border)"
            tickStroke="var(--border)"
            tickLabelProps={() => ({ fill: 'var(--muted)', fontSize: 11, textAnchor: 'end', dx: -6, dy: 3 })}
          />
          <AxisBottom
            top={innerHeight}
            scale={xScale}
            stroke="var(--border)"
            tickStroke="var(--border)"
            tickLabelProps={() => ({ fill: 'var(--muted)', fontSize: 10, textAnchor: 'end', dy: 10, dx: -4, angle: -35 })}
            tickFormat={(v) => String(v)}
          />
        </g>
      </svg>
      {tooltipData && tooltipLeft != null && tooltipTop != null && (
        <TooltipInPortal
          top={tooltipTop - 10}
          left={tooltipLeft}
          style={{
            ...defaultStyles,
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            boxShadow: 'var(--box-shadow)',
          }}
        >
          <div style={{ fontWeight: 600 }}>{tooltipData.label}</div>
          <div style={{ color: 'var(--muted)', fontSize: 12 }}>
            {tooltipData.count} {labelWord} · {totalCount > 0 ? Math.round((tooltipData.count / totalCount) * 1000) / 10 : 0}%
          </div>
        </TooltipInPortal>
      )}
    </div>
  );
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
export default function TimeHistogram({ matches, user, timesMs }: TimeHistogramProps) {
  const data = useMemo(() => {
    const times = (timesMs && timesMs.length > 0)
      ? timesMs.map((ms) => ms / 1000)
      : matches
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
  const labelWord = (timesMs && timesMs.length > 0) ? 'segments' : 'wins';
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, background: 'var(--card-bg)' }}>
      <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>Time distribution</div>
      <div style={{ width: '100%', height: 300 }}>
        <ParentSize>
          {({ width, height }) => {
            return (
              <TimeHistogramInner
                width={width}
                height={height}
                data={data}
                labelWord={labelWord}
                totalCount={totalCount}
              />
            );
          }}
        </ParentSize>
      </div>
    </div>
  );
}