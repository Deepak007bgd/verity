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
    return (
      <div className="custom-tooltip">
        <div className="label">{item.topic || label}</div>
        <div style={{ color: 'var(--ink-soft)', fontSize: '12px', marginBottom: '4px' }}>
          Marks: <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{item.earned}</span> / {item.possible}
        </div>
        <div className="value">{item.percentage}% Accuracy</div>
      </div>
    );
  }
  return null;
}

export function TopicPerformanceChart({
  data = [],
  title = 'Topic & Subject Accuracy',
  subtitle = 'Mastery percentage across curriculum topics',
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
          No topic performance data available yet.
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
          <BarChart data={data} margin={{ top: 10, right: 15, left: -10, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="topic"
              stroke={axisColor}
              fontSize={11.5}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
              angle={-20}
              textAnchor="end"
              interval={0}
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
                const color = entry.percentage < 65 ? 'var(--amber)' : 'var(--teal)';
                return <Cell key={`cell-${index}`} fill={color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
