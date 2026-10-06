import React from 'react';

export function StatCard({ num, lbl, icon, trend, style, numStyle }) {
  return (
    <div className="stat" style={style}>
      <div className="stat-top">
        <div className="lbl">{lbl}</div>
        {icon && <div className="icon-box">{icon}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '6px' }}>
        <div className="num" style={numStyle}>
          {num}
        </div>
        {trend && <div style={{ fontSize: '12px' }}>{trend}</div>}
      </div>
    </div>
  );
}
