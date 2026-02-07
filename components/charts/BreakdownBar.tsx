"use client";

import { ParentSize } from "@visx/responsive";
import { scaleBand, scaleLinear } from "@visx/scale";
import { AxisLeft, AxisBottom } from "@visx/axis";
import { GridColumns } from "@visx/grid";
import { useTooltip, useTooltipInPortal, defaultStyles } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import { useEffect, useMemo, useState } from "react";
import { getColor } from '@/lib/theme';
import { humanizeStructure, humanizeBiome } from "@/lib/format";

interface BreakdownBarProps {
  title: string;
  data: { name: string; count: number }[];
}

interface BreakdownBarInnerProps {
  width: number;
  height: number;
  data: { name: string; count: number; displayName: string }[];
}

function BreakdownBarInner({ width, height, data }: BreakdownBarInnerProps) {
  const margin = { top: 8, right: 16, bottom: 36, left: 140 };
  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);
  if (innerWidth <= 0 || innerHeight <= 0) return null;
  if (data.length === 0) {
    return (
      <svg width={width} height={height}>
        <text x={width / 2} y={height / 2} textAnchor="middle" fill="var(--muted)" fontSize={12}>
          No data
        </text>
      </svg>
    );
  }

  const yScale = scaleBand({
    domain: data.map((d) => d.displayName),
    range: [0, innerHeight],
    padding: 0.2,
  });
  const xMax = Math.max(...data.map((d) => d.count));
  const xScale = scaleLinear({
    domain: [0, xMax],
    range: [0, innerWidth],
    nice: true,
  });

  const { tooltipData, tooltipLeft, tooltipTop, showTooltip, hideTooltip } = useTooltip<typeof data[number]>();
  const { containerRef, TooltipInPortal } = useTooltipInPortal({ scroll: true });
  const [animate, setAnimate] = useState(false);
  const animKey = useMemo(() => data.map((d) => `${d.displayName}:${d.count}`).join('|'), [data]);

  useEffect(() => {
    setAnimate(false);
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, [animKey]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width, height }}>
      <svg width={width} height={height} style={{ transition: 'opacity 320ms ease', opacity: animate ? 1 : 0.6 }}>
        <g transform={`translate(${margin.left},${margin.top})`}>
          <GridColumns scale={xScale} height={innerHeight} stroke="var(--border)" strokeOpacity={0.4} />
          {data.map((d, i) => {
            const y = yScale(d.displayName) ?? 0;
            const barHeight = yScale.bandwidth();
            const barWidth = xScale(d.count) ?? 0;
            return (
              <rect
                key={d.displayName}
                x={0}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={getColor(i)}
                rx={6}
                style={{ transition: 'width 320ms ease' }}
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
            tickLabelProps={() => ({ fill: 'var(--muted)', fontSize: 12, textAnchor: 'end', dx: -6, dy: 3 })}
          />
          <AxisBottom
            top={innerHeight}
            scale={xScale}
            stroke="var(--border)"
            tickStroke="var(--border)"
            tickLabelProps={() => ({ fill: 'var(--muted)', fontSize: 11, textAnchor: 'middle', dy: 10 })}
          />
        </g>
      </svg>
      {tooltipData && tooltipLeft != null && tooltipTop != null && (
        <TooltipInPortal
          top={tooltipTop}
          left={tooltipLeft + 12}
          style={{
            ...defaultStyles,
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            boxShadow: 'var(--box-shadow)',
          }}
        >
          <div style={{ fontWeight: 600 }}>{tooltipData.displayName}</div>
          <div style={{ color: 'var(--muted)', fontSize: 12 }}>{tooltipData.count} matches</div>
        </TooltipInPortal>
      )}
    </div>
  );
}

/**
 * A vertical bar chart showing the distribution of values for a given seed
 * dimension (e.g. overworld or bastion).  Only the top 12 categories are
 * displayed to prevent overcrowding.  Bars are labelled with the seed
 * type on the y‑axis and the count on the x‑axis.
 */
export default function BreakdownBar({ title, data }: BreakdownBarProps) {
  const top = data.slice(0, 12).map((d) => {
    const key = d.name;
    let label = key;
    if (!key) label = '—';
    else if (/^[A-Z0-9_]+$/.test(key)) {
      label = humanizeStructure(key);
    } else if (/^[a-z0-9_]+$/.test(key)) {
      label = humanizeBiome(key);
    } else {
      label = key;
    }
    return { ...d, displayName: label };
  });
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, background: 'var(--card-bg)' }}>
      <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>{title}</div>
      <div style={{ width: '100%', height: 300 }}>
        <ParentSize>
          {({ width, height }) => {
            return <BreakdownBarInner width={width} height={height} data={top} />;
          }}
        </ParentSize>
      </div>
    </div>
  );
}