'use client';

import { XAxis, YAxis, ResponsiveContainer, Tooltip, Area, AreaChart } from 'recharts';

interface LineChartProps {
  data: Array<{ date: string; value: number }>;
}

// Format date for x-axis: "Dec 2024" -> "Dec" on top, "2024" below
const formatXAxisLabel = (dateStr: string) => {
  const parts = dateStr.split(' ');
  if (parts.length >= 2) {
    const month = parts[0].substring(0, 3); // First 3 letters
    const year = parts[1];
    return { month, year };
  }
  return { month: dateStr.substring(0, 3), year: '' };
};

// Custom tick component for vertical labels
const CustomXAxisTick = ({ x, y, payload }: any) => {
  const { month, year } = formatXAxisLabel(payload.value);
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={0} textAnchor="middle" fill="rgba(231, 228, 228, 0.7)" fontSize={12}>
        {month}
      </text>
      <text x={0} y={14} dy={0} textAnchor="middle" fill="rgba(231, 228, 228, 0.7)" fontSize={12}>
        {year}
      </text>
    </g>
  );
};

export default function LineChart({ data }: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#AC66DA" stopOpacity={1} />
            <stop offset="100%" stopColor="#282828" stopOpacity={1} />
          </linearGradient>
        </defs>
        <XAxis 
          dataKey="date" 
          stroke="rgba(231, 228, 228, 0.7)"
          tickLine={{ stroke: 'rgba(231, 228, 228, 0.3)' }}
          tick={<CustomXAxisTick />}
          height={40}
          interval={0}
        />
        <YAxis 
          hide
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'var(--bg-surface)', 
            border: 'none', 
            borderRadius: '8px',
            color: 'var(--text-primary)'
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#AC66DA"
          strokeWidth={2}
          fill="url(#colorGradient)"
          dot={{ fill: '#E7E4E4', r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

