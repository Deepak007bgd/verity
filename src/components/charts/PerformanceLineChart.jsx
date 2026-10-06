import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-tooltip">
        <div className="label">{label}</div>
        <div style={{ color: 'var(--ink-soft)', fontSize: '12px', marginBottom: '4px' }}>
          Score: <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{data.score}</span> / {data.maxMarks}
        </div>
        <div className="value">{data.percentage}%</div>
      </div>
    );
  }
  return null;
}

export function PerformanceLineChart({
  data = [],
  title = 'Performance Over Assessments',
  subtitle = 'Score and percentage trend across exams',
}) {
  const { isDark } = useTheme();

  const gridColor = isDark ? '#23274C' : '#EAEBF5';
  const axisColor = isDark ? '#888DA8' : '#6A6D8C';

  if (!data || data.length === 0) {
    return (
      <div className="chart-card">
        <div className="chart-header">
          <div className="chart-title">{title}</div>
          {subtitle && <div className="chart-subtitle">{subtitle}</div>}
        </div>
        <div className="empty" style={{ margin: 'auto', width: '100%', padding: '36px 20px' }}>
          No performance data available yet.
        </div>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div className="chart-title">{title}</div>
        {subtitle && <div className="chart-subtitle">{subtitle}</div>}
      </div>

      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="name"
              stroke={axisColor}
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
            />
            <YAxis
              domain={[0, 100]}
              stroke={axisColor}
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
              unit="%"
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="percentage"
              name="Percentage"
              stroke="var(--teal)"
              strokeWidth={2.5}
              dot={{ fill: 'var(--teal)', stroke: 'var(--card)', strokeWidth: 2, r: 5 }}
              activeDot={{ r: 7, fill: 'var(--teal-deep)', stroke: 'var(--card)', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
