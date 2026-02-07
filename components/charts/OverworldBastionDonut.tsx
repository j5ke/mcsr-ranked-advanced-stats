"use client";

import { ParentSize } from "@visx/responsive";
import { Pie } from "@visx/shape";
import type { PieArcDatum, ProvidedProps } from "@visx/shape/lib/shapes/Pie";
import { Group } from "@visx/group";
import { useTooltip, useTooltipInPortal, defaultStyles } from "@visx/tooltip";
import { useMemo, type ComponentProps, type ReactNode } from "react";
import { animated, to, useTransition, type SpringValue, type AnimatedProps } from "@react-spring/web";
import { MatchInfo } from "@/types/mcsr";
import { humanizeStructure } from "@/lib/format";
import { getColor } from "@/lib/theme";

interface OverworldBastionDonutProps {
  matches: MatchInfo[];
  selectedOverworld: string | null;
  onSelectOverworld: (overworld: string | null) => void;
}

type Slice = { key: string; label: string; count: number };

interface OverworldBastionDonutInnerProps {
  width: number;
  height: number;
  overworldSlices: Slice[];
  bastionSlices: Slice[];
  overworldColorMap: Map<string, string>;
  bastionColorMap: Map<string, string>;
  selectedOverworld: string | null;
  onSelectOverworld: (overworld: string | null) => void;
}

type AnimatedStyles = { startAngle: SpringValue<number>; endAngle: SpringValue<number>; opacity: SpringValue<number> };

const enterUpdateTransition = ({ startAngle, endAngle }: PieArcDatum<any>) => ({
  startAngle,
  endAngle,
  opacity: 1,
});

const leaveTransition = ({ startAngle, endAngle }: PieArcDatum<any>) => ({
  startAngle,
  endAngle,
  opacity: 0,
});

type AnimatedPieProps<Datum> = ProvidedProps<Datum> & {
  animate?: boolean;
  getKey: (d: PieArcDatum<Datum>) => string;
  getColor: (d: PieArcDatum<Datum>) => string;
  onClickDatum?: (d: PieArcDatum<Datum>) => void;
  getPathProps?: (d: PieArcDatum<Datum>, styles: AnimatedStyles) => Partial<Omit<AnimatedProps<ComponentProps<"path">>, "ref">>;
  renderLabel?: (d: PieArcDatum<Datum>, styles: AnimatedStyles) => ReactNode;
};

function AnimatedPie<Datum>({
  animate = true,
  arcs,
  path,
  getKey,
  getColor,
  onClickDatum,
  getPathProps,
  renderLabel,
}: AnimatedPieProps<Datum>) {
  const transitions = useTransition<PieArcDatum<Datum>, AnimatedStyles>(arcs, {
    from: enterUpdateTransition,
    enter: enterUpdateTransition,
    update: enterUpdateTransition,
    leave: leaveTransition,
    keys: getKey,
  });

  return transitions((styles, arc, { key }) => (
    <g key={key}>
      <animated.path
        d={to([styles.startAngle, styles.endAngle], (startAngle, endAngle) =>
          path({ ...arc, startAngle, endAngle }) || ""
        )}
        fill={getColor(arc)}
        onClick={() => onClickDatum?.(arc)}
        onTouchStart={() => onClickDatum?.(arc)}
        {...getPathProps?.(arc, styles)}
      />
      {renderLabel?.(arc, styles)}
    </g>
  ));
}

function getBastionKey(m: MatchInfo) {
  return ((m as any).bastionType ?? m.seed?.bastion ?? m.seed?.nether ?? "Unknown") as string;
}

function OverworldBastionDonutInner({
  width,
  height,
  overworldSlices,
  bastionSlices,
  overworldColorMap,
  bastionColorMap,
  selectedOverworld,
  onSelectOverworld,
}: OverworldBastionDonutInnerProps) {
  const totalOverworld = overworldSlices.reduce((s, d) => s + d.count, 0);
  const totalBastion = bastionSlices.reduce((s, d) => s + d.count, 0);

  const { tooltipData, tooltipLeft, tooltipTop, showTooltip, hideTooltip } = useTooltip<Slice>();
  const { containerRef, TooltipInPortal } = useTooltipInPortal({ scroll: true });

  const size = Math.min(width, height);
  const centerX = width / 2;
  const centerY = height / 2;
  const outerRadius = size * 0.45;
  const innerRadius = size * 0.28;
  const pieRadius = size * 0.22;

  if (size <= 0) return null;

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <svg width={width} height={height}>
        <Group top={centerY} left={centerX}>
          <Pie
            data={overworldSlices}
            pieValue={(d) => d.count}
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            cornerRadius={6}
            padAngle={0.01}
          >
            {(pie) => (
              <AnimatedPie<Slice>
                {...pie}
                getKey={(arc) => arc.data.key}
                getColor={(arc) => overworldColorMap.get(arc.data.key) ?? getColor(arc.index ?? 0)}
                onClickDatum={(arc) => {
                  const isSelected = selectedOverworld === arc.data.key;
                  onSelectOverworld(isSelected ? null : arc.data.key);
                }}
                getPathProps={(arc, styles) => {
                  const isSelected = selectedOverworld === arc.data.key;
                  return {
                    style: {
                      cursor: "pointer",
                    },
                    opacity: to(styles.opacity, (value) =>
                      isSelected || !selectedOverworld ? value : value * 0.35
                    ),
                    stroke: isSelected ? "var(--accent)" : "transparent",
                    strokeWidth: isSelected ? 2 : 0,
                    onMouseMove: (event) => {
                      const point = event.currentTarget.getBoundingClientRect();
                      showTooltip({
                        tooltipData: arc.data,
                        tooltipLeft: point.left + point.width / 2,
                        tooltipTop: point.top + point.height / 2,
                      });
                    },
                    onMouseLeave: () => hideTooltip(),
                  };
                }}
                renderLabel={(arc, styles) => {
                  const [labelX, labelY] = pie.path.centroid(arc);
                  const pct = totalOverworld > 0 ? Math.round((arc.data.count / totalOverworld) * 100) : 0;
                  if (pct < 5) return null;
                  const label = arc.data.label;
                  const fontSize = 10;
                  const paddingX = 6;
                  const paddingY = 4;
                  const combined = `${label} ${pct}%`;
                  const estWidth = combined.length * 6.2 + paddingX * 2;
                  const estHeight = fontSize + paddingY * 2;
                  return (
                    <animated.g style={{ opacity: styles.opacity }}>
                      <rect
                        x={labelX - estWidth / 2}
                        y={labelY - estHeight / 2}
                        width={estWidth}
                        height={estHeight}
                        rx={6}
                        fill="var(--card-bg)"
                        stroke="var(--border)"
                        opacity={0.65}
                        onClick={() => {
                          const isSelected = selectedOverworld === arc.data.key;
                          onSelectOverworld(isSelected ? null : arc.data.key);
                        }}
                      />
                      <text
                        x={labelX}
                        y={labelY + 0.5}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="var(--muted)"
                        fontSize={fontSize}
                        onClick={() => {
                          const isSelected = selectedOverworld === arc.data.key;
                          onSelectOverworld(isSelected ? null : arc.data.key);
                        }}
                      >
                        {combined}
                      </text>
                    </animated.g>
                  );
                }}
              />
            )}
          </Pie>

          <Pie
            data={bastionSlices}
            pieValue={(d) => d.count}
            outerRadius={pieRadius}
            innerRadius={0}
            cornerRadius={4}
            padAngle={0.01}
          >
            {(pie) => (
              <AnimatedPie<Slice>
                {...pie}
                getKey={(arc) => arc.data.key}
                getColor={(arc) => bastionColorMap.get(arc.data.key) ?? getColor((arc.index ?? 0) + 6)}
                getPathProps={(_arc, styles) => ({
                  opacity: to(styles.opacity, (value) => value * 0.9),
                })}
                renderLabel={(arc, styles) => {
                  const [labelX, labelY] = pie.path.centroid(arc);
                  const pct = totalBastion > 0 ? Math.round((arc.data.count / totalBastion) * 100) : 0;
                  if (pct < 10) return null;
                  const label = arc.data.label;
                  const fontSize = 9;
                  const paddingX = 5;
                  const paddingY = 3;
                  const combined = `${label} ${pct}%`;
                  const estWidth = combined.length * 6 + paddingX * 2;
                  const estHeight = fontSize + paddingY * 2;
                  return (
                    <animated.g style={{ opacity: styles.opacity }}>
                      <rect
                        x={labelX - estWidth / 2}
                        y={labelY - estHeight / 2}
                        width={estWidth}
                        height={estHeight}
                        rx={6}
                        fill="var(--card-bg)"
                        stroke="var(--border)"
                        opacity={0.6}
                      />
                      <text
                        x={labelX}
                        y={labelY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="var(--muted)"
                        fontSize={fontSize}
                      >
                        {combined}
                      </text>
                    </animated.g>
                  );
                }}
              />
            )}
          </Pie>
        </Group>
      </svg>

      {tooltipData && tooltipLeft != null && tooltipTop != null && (
        <TooltipInPortal
          top={tooltipTop}
          left={tooltipLeft}
          style={{
            ...defaultStyles,
            background: "var(--card-bg)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            boxShadow: "var(--box-shadow)",
          }}
        >
          <div style={{ fontWeight: 600 }}>{tooltipData.label}</div>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>
            {tooltipData.count} matches · {totalOverworld > 0 ? Math.round((tooltipData.count / totalOverworld) * 1000) / 10 : 0}%
          </div>
        </TooltipInPortal>
      )}
    </div>
  );
}

export default function OverworldBastionDonut({ matches, selectedOverworld, onSelectOverworld }: OverworldBastionDonutProps) {
  const overworldSlices = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of matches) {
      const key = m.seed?.overworld ?? "Unknown";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([key, count]) => ({ key, count, label: humanizeStructure(key) }))
      .sort((a, b) => b.count - a.count);
  }, [matches]);

  const overworldColorMap = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of matches) {
      const key = m.seed?.overworld ?? "Unknown";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const keys = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([key]) => key);
    const map = new Map<string, string>();
    keys.forEach((key, index) => map.set(key, getColor(index)));
    return map;
  }, [matches]);

  const bastionSlices = useMemo(() => {
    const map = new Map<string, number>();
    const filtered = selectedOverworld
      ? matches.filter((m) => (m.seed?.overworld ?? "Unknown") === selectedOverworld)
      : matches;
    for (const m of filtered) {
      const key = getBastionKey(m);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([key, count]) => ({ key, count, label: humanizeStructure(key) }))
      .sort((a, b) => b.count - a.count);
  }, [matches, selectedOverworld]);

  const bastionColorMap = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of matches) {
      const key = getBastionKey(m);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const keys = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([key]) => key);
    const map = new Map<string, string>();
    keys.forEach((key, index) => map.set(key, getColor(index + 6)));
    return map;
  }, [matches]);

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 12, background: "var(--card-bg)" }}>
      <div style={{ fontWeight: 600, marginBottom: 8, color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>Overworld → Bastion</span>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          {selectedOverworld ? humanizeStructure(selectedOverworld) : "Any Overworld"}
        </span>
      </div>
      <div style={{ width: "100%", height: 320 }}>
        <ParentSize>
          {({ width, height }) => (
            <OverworldBastionDonutInner
              width={width}
              height={height}
              overworldSlices={overworldSlices}
              bastionSlices={bastionSlices}
              overworldColorMap={overworldColorMap}
              bastionColorMap={bastionColorMap}
              selectedOverworld={selectedOverworld}
              onSelectOverworld={onSelectOverworld}
            />
          )}
        </ParentSize>
      </div>
    </div>
  );
}
