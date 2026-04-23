'use client';

import { XAxis, YAxis, ResponsiveContainer, Tooltip, Area, AreaChart } from 'recharts';
import { formatNumber } from '@/lib/utils';

interface LineChartProps {
  data: Array<{ date: string; value: number }>;
  noPadding?: boolean;
  currencySymbol?: string;
}


const isLegacyDailyData = (dateStr: string): boolean => /^\d+$/.test(dateStr.trim());


const isDailyWithMonth = (dateStr: string): boolean =>
  /^[A-Za-z]{3} \d{1,2}$/.test(dateStr.trim());


const formatXAxisLabel = (dateStr: string) => {
  if (isLegacyDailyData(dateStr)) {
    return { day: dateStr, isDaily: true };
  }
  if (isDailyWithMonth(dateStr)) {
    return { monDay: dateStr, isDailyWithMonth: true };
  }

  
  const isoMatch = /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim());
  if (isoMatch) {
    const date = new Date(dateStr);
    
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate().toString();
    const year = date.getFullYear().toString();
    return { month, day, year, isFullDate: true };
  }

  
  const parts = dateStr.replace(',', '').split(' ');
  if (parts.length >= 3) {
    
    const month = parts[0].substring(0, 3);
    const day = parts[1];
    const year = parts[2];
    return { month, day, year, isFullDate: true };
  } else if (parts.length === 2) {
    const month = parts[0].substring(0, 3);
    const day = parts[1];
    return { month, day, isFullDate: false };
  }

  return { month: dateStr.substring(0, 3), year: '', isDaily: false };
};


const CustomXAxisTick = ({ x, y, payload }: any) => {
  const formatted = formatXAxisLabel(payload.value);

  if ('isFullDate' in formatted && formatted.isFullDate) {
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={16} textAnchor="middle" fill="rgba(231, 228, 228, 0.7)" fontSize={11}>
          {formatted.month} {formatted.day}
        </text>
        <text x={0} y={0} dy={30} textAnchor="middle" fill="rgba(231, 228, 228, 0.4)" fontSize={10}>
          {formatted.year}
        </text>
      </g>
    );
  }

  if ('isDailyWithMonth' in formatted && formatted.isDailyWithMonth) {
    
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={16} textAnchor="middle" fill="rgba(231, 228, 228, 0.7)" fontSize={11}>
          {formatted.monDay}
        </text>
      </g>
    );
  }
  if (formatted.isDaily) {
    
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={16} textAnchor="middle" fill="rgba(231, 228, 228, 0.7)" fontSize={11}>
          {formatted.day}
        </text>
      </g>
    );
  }

  
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="middle" fill="rgba(231, 228, 228, 0.7)" fontSize={11}>
        {formatted.month}
      </text>
      {formatted.year && (
        <text x={0} y={30} dy={0} textAnchor="middle" fill="rgba(231, 228, 228, 0.4)" fontSize={10}>
          {formatted.year}
        </text>
      )}
    </g>
  );
};


const CustomTooltip = ({ active, payload, currencySymbol = '$' }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const dateStr = data.date;
    const value = data.value;

    
    let displayDate = dateStr;
    if (isLegacyDailyData(dateStr)) {
      displayDate = `Day ${dateStr}`;
    }

    return (
      <div className="tooltip-surface">
        <div className="tooltip-label">{displayDate}</div>
        <div className="tooltip-value">{currencySymbol}{formatNumber(value)}</div>
      </div>
    );
  }
  return null;
};



const calculateInterval = (data: Array<{ date: string; value: number }>): number | 'preserveStartEnd' => {
  if (!data || data.length === 0) return 0;

  const dataLength = data.length;

  if (dataLength <= 7) return 0;
  if (dataLength <= 14) return 1;
  if (dataLength <= 31) return Math.ceil(dataLength / 6);
  if (dataLength <= 90) return Math.ceil(dataLength / 8);

  
  const targetLabels = 6;
  return Math.floor(dataLength / targetLabels);
};

export default function LineChart({ data, noPadding = false, currencySymbol = '$' }: LineChartProps) {
  const interval = calculateInterval(data);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={`colorGradient-${noPadding ? 'no-pad' : 'default'}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#AC66DA" stopOpacity={1} />
              <stop offset="100%" stopColor="#282828" stopOpacity={1} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            axisLine={{ stroke: 'rgba(231, 228, 228, 0.3)' }}
            tickLine={{ stroke: 'rgba(231, 228, 228, 0.3)' }}
            tick={<CustomXAxisTick />}
            height={54}
            tickMargin={16}
            interval={interval}
            padding={{ left: 16, right: 16 }} 
          />
          <YAxis
            hide
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip currencySymbol={currencySymbol} />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#AC66DA"
            strokeWidth={2}
            fill={`url(#colorGradient-${noPadding ? 'no-pad' : 'default'})`}
            dot={false} 
            activeDot={{ r: 6, fill: '#AC66DA', stroke: '#E7E4E4', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

