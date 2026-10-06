import React from 'react';
import { useApp } from '../../context/AppContext';
import { PageHead } from '../../components/layout/PageHead';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';

export function FacultyDashboard() {
  const { currentUser, questions, assessments, attempts, auditLog, nav } = useApp();

  const myQs = questions.length;
  const myAs = assessments.length;
  const pendingEval = attempts.filter((a) => a.status === 'Evaluating').length;
  const totalSubmissions = attempts.filter((a) => a.status !== 'In Progress').length;

  return (
    <div>
      <PageHead
        title={`Welcome back, ${currentUser?.name}`}
        subtitle="Here's what's moving across your courses right now."
        action={
          <Button variant="teal" size="sm" onClick={() => nav('bank')}>
            + Manage Question Bank
          </Button>
        }
      />

      <div className="grid-3" style={{ marginBottom: '28px' }}>
        <StatCard
          num={myQs}
          lbl="Questions in bank"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          }
        />
        <StatCard
          num={myAs}
          lbl="Assessments created"
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
          num={pendingEval}
          lbl="Attempts awaiting evaluation"
          numStyle={{ color: pendingEval > 0 ? 'var(--coral)' : 'inherit' }}
          trend={totalSubmissions > 0 ? `${totalSubmissions} submitted` : undefined}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />
      </div>

      <div className="list-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        Recent activity
      </div>

      <div className="card">
        {auditLog.length === 0 ? (
          <div className="empty">
            No activity yet — create a question or assessment to see it here.
          </div>
        ) : (
          <table>
            <tbody>
              {auditLog.slice(0, 6).map((l) => (
                <tr key={l.id}>
                  <td className="mono" style={{ width: '100px', color: 'var(--ink-soft)' }}>
                    {l.time}
                  </td>
                  <td style={{ fontWeight: 500 }}>{l.action}</td>
                  <td style={{ color: 'var(--ink-soft)' }}>{l.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
