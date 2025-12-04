'use client';

import { XAxis, YAxis, ResponsiveContainer, Tooltip, Area, AreaChart } from 'recharts';
import { formatNumber } from '@/lib/utils';

interface LineChartProps {
  data: Array<{ date: string; value: number }>;
  noPadding?: boolean;
  currencySymbol?: string;
}

// Check if date string is just a day number (e.g., "1", "15") vs month format (e.g., "Jan 2025")
const isDailyData = (dateStr: string): boolean => {
  // If it's just a number, it's daily data
  return /^\d+$/.test(dateStr.trim());
};

// Format date for x-axis: "Dec 2024" -> "Dec" on top, "2024" below, or just day number
const formatXAxisLabel = (dateStr: string) => {
  if (isDailyData(dateStr)) {
    return { day: dateStr, isDaily: true };
  }
  const parts = dateStr.split(' ');
  if (parts.length >= 2) {
    const month = parts[0].substring(0, 3); // First 3 letters
    const year = parts[1];
    return { month, year, isDaily: false };
  }
  return { month: dateStr.substring(0, 3), year: '', isDaily: false };
};

// Custom tick component for vertical labels
const CustomXAxisTick = ({ x, y, payload }: any) => {
  const formatted = formatXAxisLabel(payload.value);
  
  if (formatted.isDaily) {
    // For daily data, show just the day number
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={16} textAnchor="middle" fill="rgba(231, 228, 228, 0.7)" fontSize={12}>
          {formatted.day}
        </text>
      </g>
    );
  }
  
  // For monthly data, show month and year
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={0} textAnchor="middle" fill="rgba(231, 228, 228, 0.7)" fontSize={12}>
        {formatted.month}
      </text>
      <text x={0} y={14} dy={0} textAnchor="middle" fill="rgba(231, 228, 228, 0.7)" fontSize={12}>
        {formatted.year}
      </text>
    </g>
  );
};

// Custom tooltip component
const CustomTooltip = ({ active, payload, currencySymbol = '$' }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const dateStr = data.date;
    const value = data.value;
    const isDaily = isDailyData(dateStr);
    
    // Format date for display
    let displayDate = dateStr;
    if (isDaily) {
      // For daily data, show "Day X" or just the number
      displayDate = `Day ${dateStr}`;
    } else {
      // For monthly data, keep as is or format nicely
      displayDate = dateStr;
    }
    
    return (
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: 'none',
        borderRadius: '8px',
        padding: '8px 12px',
        color: 'var(--text-primary)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{ 
          fontSize: '12px', 
          color: 'rgba(231, 228, 228, 0.7)',
          marginBottom: '4px'
        }}>
          {displayDate}
        </div>
        <div style={{ 
          fontSize: '14px', 
          fontWeight: 600,
          color: 'var(--text-primary)'
        }}>
          {currencySymbol}{formatNumber(value)}
        </div>
      </div>
    );
  }
  return null;
};

export default function LineChart({ data, noPadding = false, currencySymbol = '$' }: LineChartProps) {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart 
          data={data} 
          margin={noPadding ? { top: 10, right: 0, left: 0, bottom: 0 } : { top: 10, right: 10, left: 10, bottom: 10 }}
        >
        <defs>
          <linearGradient id={`colorGradient-${noPadding ? 'no-pad' : 'default'}`} x1="0" y1="0" x2="0" y2="1">
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
        <Tooltip content={<CustomTooltip currencySymbol={currencySymbol} />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#AC66DA"
          strokeWidth={2}
          fill={`url(#colorGradient-${noPadding ? 'no-pad' : 'default'})`}
          dot={{ fill: '#E7E4E4', r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6 }}
        />
      </AreaChart>
    </ResponsiveContainer>
    </div>
  );
}

