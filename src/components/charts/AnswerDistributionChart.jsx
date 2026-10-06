import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="custom-tooltip">
        <div className="label" style={{ color: item.payload.color || 'var(--ink)' }}>
          {item.name}
        </div>
        <div className="value">{item.value} question{item.value === 1 ? '' : 's'}</div>
      </div>
    );
  }
  return null;
}

const renderLegend = (props) => {
  const { payload } = props;
  return (
    <ul
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '16px',
        listStyle: 'none',
        padding: 0,
        margin: '12px 0 0 0',
        fontSize: '12.5px',
        flexWrap: 'wrap',
      }}
    >
      {payload.map((entry, index) => (
        <li
          key={`legend-${index}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--ink-soft)' }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: entry.color,
            }}
          />
          <span>
            {entry.value}: <strong style={{ color: 'var(--ink)' }}>{entry.payload.value}</strong>
          </span>
        </li>
      ))}
    </ul>
  );
};

export function AnswerDistributionChart({
  data = [],
  title = 'Answer Distribution',
  subtitle = 'Breakdown of question responses',
}) {
  const totalCount = data.reduce((sum, item) => sum + (item.value || 0), 0);

  if (!data || data.length === 0 || totalCount === 0) {
    return (
      <div className="chart-card">
        <div className="chart-header">
          <div className="chart-title">{title}</div>
          {subtitle && <div className="chart-subtitle">{subtitle}</div>}
        </div>
        <div className="empty" style={{ margin: 'auto', width: '100%', padding: '36px 20px' }}>
          No answer distribution data available yet.
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
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--card)" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderLegend} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
