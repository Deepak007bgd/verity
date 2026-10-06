import React from 'react';
import { useApp } from '../../context/AppContext';
import { seedUsers } from '../../data/seedUsers';
import { PageHead } from '../../components/layout/PageHead';
import { StatCard } from '../../components/common/StatCard';

export function AdminDashboard() {
  const { assessments, attempts, auditLog } = useApp();

  return (
    <div>
      <PageHead
        title="System Overview"
        subtitle="Live telemetry and audit snapshot across the VERITY platform."
      />

      <div className="grid-3" style={{ marginBottom: '28px' }}>
        <StatCard
          num={seedUsers.length}
          lbl="Registered users"
          trend="Active accounts"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <StatCard
          num={assessments.length}
          lbl="Total assessments"
          trend="Scheduled & live"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
          }
        />
        <StatCard
          num={attempts.length}
          lbl="Attempts recorded"
          trend={`${attempts.filter((a) => a.status === 'Evaluated').length} fully evaluated`}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          }
        />
      </div>

      <div className="list-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        Latest audit entries
      </div>
      <div className="card">
        {auditLog.length === 0 ? (
          <div className="empty">No platform activity recorded yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.slice(0, 6).map((l) => (
                <tr key={l.id}>
                  <td className="mono" style={{ width: '110px', color: 'var(--ink-soft)' }}>
                    {l.time}
                  </td>
                  <td style={{ fontWeight: 500 }}>{l.actor}</td>
                  <td>{l.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
