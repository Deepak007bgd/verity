import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    const isPass = item.percentage >= 40;
    return (
      <div className="custom-tooltip">
        <div className="label">{item.name || label}</div>
        <div style={{ color: 'var(--ink-soft)', fontSize: '12px', marginBottom: '4px' }}>
          Score: <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{item.score}</span> / {item.maxMarks}
        </div>
        <div className="value" style={{ color: isPass ? 'var(--teal)' : 'var(--coral)' }}>
          {item.percentage}% ({isPass ? 'Pass' : 'Fail'})
        </div>
      </div>
    );
  }
  return null;
}

export function ClassPerformanceChart({
  data = [],
  title = 'Class Performance Comparison',
  subtitle = 'Individual student scores and pass thresholds',
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
          No student submission data available yet.
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
          <BarChart data={data} margin={{ top: 10, right: 15, left: -10, bottom: 10 }}>
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
            <Bar dataKey="percentage" radius={[6, 6, 0, 0]} maxBarSize={45}>
              {data.map((entry, index) => {
                const color = entry.percentage >= 40 ? 'var(--teal)' : 'var(--coral)';
                return <Cell key={`cell-${index}`} fill={color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
