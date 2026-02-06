"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

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
  const top = data.slice(0, 12);
  return (
    <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={top} layout="vertical" margin={{ top: 10, right: 20, bottom: 10, left: 40 }}>
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={160} />
            <Tooltip />
            <Bar dataKey="count" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}