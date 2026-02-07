"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getColor } from '@/lib/theme';
import { humanizeStructure, humanizeBiome } from "@/lib/format";

interface BreakdownBarProps {
  title: string;
  data: { name: string; count: number }[];
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
        <ResponsiveContainer>
          <BarChart data={top} layout="vertical" margin={{ top: 10, right: 20, bottom: 10, left: 40 }}>
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="displayName" width={140} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: any, name: any, props: any) => [value, (props.payload?.displayName ?? props.payload?.name) || name]}
              contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
              labelStyle={{ color: 'var(--muted)' }}
              itemStyle={{ color: 'var(--text)' }}
            />
            <Bar dataKey="count">
              {top.map((_, i) => (
                <Cell key={`cell-${i}`} fill={getColor(i)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}