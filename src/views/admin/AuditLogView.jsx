import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PageHead } from '../../components/layout/PageHead';

const ACTION_COLORS = {
  LOGIN: 'var(--teal-deep)',
  LOGOUT: 'var(--ink-soft)',
  EXAM_START: 'var(--indigo)',
  EXAM_SUBMIT: 'var(--teal-deep)',
  INTEGRITY: 'var(--amber)',
  RESULT_PUBLISH: 'var(--teal-deep)',
  QUESTION_ADD: 'var(--indigo)',
  ASSESSMENT_CREATE: 'var(--indigo)',
  MARK_SAVE: 'var(--teal-deep)',
};

function getActionColor(action) {
  const key = Object.keys(ACTION_COLORS).find((k) => action?.toUpperCase().includes(k));
  return key ? ACTION_COLORS[key] : 'var(--ink-soft)';
}

function ActionDot({ action }) {
  const color = getActionColor(action);
  return (
    <span style={{
      display: 'inline-block',
      width: '7px',
      height: '7px',
      borderRadius: '50%',
      background: color,
      marginRight: '7px',
      flexShrink: 0,
      verticalAlign: 'middle',
    }} />
  );
}

export function AuditLogView() {
  const { auditLog } = useApp();
  const [filterActor, setFilterActor] = useState('');

  const actors = Array.from(new Set(auditLog.map((l) => l.actor))).filter(Boolean);
  const visible = filterActor
    ? auditLog.filter((l) => l.actor === filterActor)
    : auditLog;

  return (
    <div>
      <PageHead
        title="Audit log"
        subtitle={`${auditLog.length} event${auditLog.length !== 1 ? 's' : ''} this session · newest first`}
      />

      {auditLog.length === 0 ? (
        <div className="card">
          <div className="empty" style={{ padding: '32px 16px' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--ink-muted)" strokeWidth="1.5" style={{ marginBottom: '10px' }}>
              <path d="M12 2L4 6v5c0 5 3.5 9.4 8 11 4.5-1.6 8-6 8-11V6l-8-4z" />
            </svg>
            <div>Nothing logged yet.</div>
            <div style={{ fontSize: '13px', color: 'var(--ink-muted)', marginTop: '6px' }}>
              Actions across all roles — login, exam, evaluation, publishing — will appear here.
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Actor filter */}
          {actors.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => setFilterActor('')}
                style={{
                  padding: '5px 14px',
                  borderRadius: '100px',
                  border: '1.5px solid',
                  borderColor: !filterActor ? 'var(--teal)' : 'var(--line)',
                  background: !filterActor ? 'var(--teal-light)' : 'var(--card)',
                  color: !filterActor ? 'var(--teal-deep)' : 'var(--ink-soft)',
                  fontSize: '13px',
                  fontWeight: !filterActor ? '600' : '400',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                All actors ({auditLog.length})
              </button>
              {actors.map((actor) => {
                const count = auditLog.filter((l) => l.actor === actor).length;
                return (
                  <button
                    key={actor}
                    type="button"
                    onClick={() => setFilterActor(filterActor === actor ? '' : actor)}
                    style={{
                      padding: '5px 14px',
                      borderRadius: '100px',
                      border: '1.5px solid',
                      borderColor: filterActor === actor ? 'var(--teal)' : 'var(--line)',
                      background: filterActor === actor ? 'var(--teal-light)' : 'var(--card)',
                      color: filterActor === actor ? 'var(--teal-deep)' : 'var(--ink-soft)',
                      fontSize: '13px',
                      fontWeight: filterActor === actor ? '600' : '400',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {actor} ({count})
                  </button>
                );
              })}
            </div>
          )}

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>Time</th>
                  <th style={{ width: '140px' }}>Actor</th>
                  <th>Action</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((l) => (
                  <tr key={l.id}>
                    <td className="mono" style={{ color: 'var(--ink-muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {l.time}
                    </td>
                    <td style={{ fontWeight: '500', fontSize: '13.5px' }}>{l.actor}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '13.5px' }}>
                        <ActionDot action={l.action} />
                        {l.action}
                      </span>
                    </td>
                    <td style={{ color: 'var(--ink-soft)', fontSize: '13px' }}>{l.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '10px', fontSize: '12.5px', color: 'var(--ink-muted)' }}>
            Showing {visible.length} of {auditLog.length} events
          </div>
        </>
      )}
    </div>
  );
}
