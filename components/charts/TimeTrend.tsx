"use client";

import { ParentSize } from "@visx/responsive";
import { scaleLinear, scaleTime } from "@visx/scale";
import { LinePath } from "@visx/shape";
import { AxisLeft, AxisBottom } from "@visx/axis";
import { GridRows } from "@visx/grid";
import { useTooltip, useTooltipInPortal, defaultStyles } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import { curveMonotoneX } from "@visx/curve";
import { format } from "date-fns";
import { formatSecondsShort, formatSecondsCompact } from "@/lib/format";
import { PALETTE } from '@/lib/theme';
import { useEffect, useMemo, useState } from "react";

interface DataPoint {
  dateSec: number;
  timeMs: number | null;
  type: number;
}

interface TimeTrendProps {
  data: DataPoint[];
}

interface TimeTrendInnerProps {
  width: number;
  height: number;
  points: { index: number; date: Date; dateSec: number; timeSec: number }[];
}

function TimeTrendInner({ width, height, points }: TimeTrendInnerProps) {
  const margin = { top: 12, right: 18, bottom: 36, left: 60 };
  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);

  if (innerWidth <= 0 || innerHeight <= 0) return null;
  if (points.length === 0) {
    return (
      <svg width={width} height={height}>
        <text x={width / 2} y={height / 2} textAnchor="middle" fill="var(--muted)" fontSize={12}>
          No completion data
        </text>
      </svg>
    );
  }

  const maxTime = points.reduce((max, p) => Math.max(max, p.timeSec), 0);
  const xScale = scaleLinear({
    domain: [0, Math.max(0, points.length - 1)],
    range: [0, innerWidth],
    nice: true,
  });
  const yScale = scaleLinear({
    domain: [0, maxTime],
    range: [innerHeight, 0],
    nice: true,
  });

  const { tooltipData, tooltipLeft, tooltipTop, showTooltip, hideTooltip } = useTooltip<typeof points[number]>();
  const { containerRef, TooltipInPortal } = useTooltipInPortal({ scroll: true });
  const [animate, setAnimate] = useState(false);
  const animKey = useMemo(() => points.map((p) => p.timeSec).join('|'), [points]);

  useEffect(() => {
    setAnimate(false);
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, [animKey]);

  function getClosest(x: number) {
    const idx = xScale.invert(x);
    const clamped = Math.max(0, Math.min(points.length - 1, Math.round(idx)));
    return points[clamped] ?? points[0];
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width, height }}>
      <svg width={width} height={height} style={{ transition: 'opacity 320ms ease', opacity: animate ? 1 : 0.6 }}>
        <g transform={`translate(${margin.left},${margin.top})`}>
          <GridRows scale={yScale} width={innerWidth} stroke="var(--border)" strokeOpacity={0.4} />
          <AxisLeft
            scale={yScale}
            tickFormat={(v) => formatSecondsCompact(Number(v))}
            stroke="var(--border)"
            tickStroke="var(--border)"
            tickLabelProps={() => ({ fill: 'var(--muted)', fontSize: 11, textAnchor: 'end', dx: -6, dy: 3 })}
          />
          <AxisBottom
            top={innerHeight}
            scale={xScale}
            stroke="var(--border)"
            tickStroke="var(--border)"
            tickLabelProps={() => ({ fill: 'var(--muted)', fontSize: 10, textAnchor: 'middle', dy: 6 })}
            tickFormat={(v) => String(Math.round(Number(v)) + 1)}
          />
          <LinePath
            data={points}
            x={(d) => xScale(d.index) ?? 0}
            y={(d) => yScale(d.timeSec) ?? 0}
            stroke={PALETTE.primaryDark}
            strokeWidth={2.5}
            curve={curveMonotoneX}
          />
          {tooltipData && tooltipLeft != null && tooltipTop != null && (
            <circle
              cx={tooltipLeft}
              cy={tooltipTop}
              r={4}
              fill={PALETTE.primaryDark}
              stroke="var(--card-bg)"
              strokeWidth={2}
            />
          )}
          <rect
            width={innerWidth}
            height={innerHeight}
            fill="transparent"
            onMouseMove={(event) => {
              const point = localPoint(event);
              if (!point) return;
              const x = Math.max(0, Math.min(innerWidth, point.x));
              const closest = getClosest(x);
              showTooltip({
                tooltipData: closest,
                tooltipLeft: xScale(closest.index),
                tooltipTop: yScale(closest.timeSec),
              });
            }}
            onMouseLeave={() => hideTooltip()}
          />
        </g>
      </svg>
      {tooltipData && tooltipLeft != null && tooltipTop != null && (
        <TooltipInPortal
          top={tooltipTop + margin.top - 12}
          left={tooltipLeft + margin.left + 12}
          style={{
            ...defaultStyles,
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            boxShadow: 'var(--box-shadow)',
          }}
        >
          <div style={{ fontWeight: 600 }}>Match #{tooltipData.index + 1}</div>
          <div style={{ color: 'var(--muted)', fontSize: 12 }}>{formatSecondsShort(tooltipData.timeSec)} · {format(tooltipData.date, 'MMM d, yyyy')}</div>
        </TooltipInPortal>
      )}
    </div>
  );
}

/**
 * A line chart plotting completion time (in seconds) over chronological order.
 * For forfeited runs, the time is omitted, causing the line to break.  This
 * component uses Recharts and automatically resizes to fill its container.
 */
export default function TimeTrend({ data }: TimeTrendProps) {
  const points = data
    .filter((d) => d.timeMs != null)
    .map((d, i) => ({
      index: i,
      date: new Date(d.dateSec * 1000),
      dateSec: d.dateSec,
      timeSec: d.timeMs! / 1000,
    }));

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, background: 'var(--card-bg)' }}>
      <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>Completion time trend</div>
      <div style={{ width: '100%', height: 300 }}>
        <ParentSize>
          {({ width, height }) => {
            return <TimeTrendInner width={width} height={height} points={points} />;
          }}
        </ParentSize>
      </div>
    </div>
  );
}