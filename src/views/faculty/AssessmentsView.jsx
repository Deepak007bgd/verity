import React from 'react';
import { useApp } from '../../context/AppContext';
import { PageHead } from '../../components/layout/PageHead';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { totalMarks } from '../../utils/helpers';

const STATUS_VARIANT = { Active: 'teal', Draft: 'gray', Closed: 'amber' };

export function AssessmentsView() {
  const { assessments, questions, attempts, openModal } = useApp();

  return (
    <div>
      <PageHead
        title="Assessments"
        subtitle={`${assessments.length} assessment${assessments.length !== 1 ? 's' : ''} created`}
        action={
          <Button variant="teal" onClick={() => openModal('createAssessment')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create assessment
          </Button>
        }
      />

      {assessments.length === 0 ? (
        <div className="card">
          <div className="empty">
            No assessments yet. Create one to get started.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {assessments.map((a) => {
            const aAttempts = attempts.filter((at) => at.assessmentId === a.id);
            const submitted = aAttempts.filter((at) => at.status !== 'In Progress').length;
            const inProgress = aAttempts.filter((at) => at.status === 'In Progress').length;
            const evaluated = aAttempts.filter((at) => at.resultPublished).length;
            const marks = totalMarks(a, questions);
            const submitRate = a.assignedStudents.length > 0
              ? Math.round((submitted / a.assignedStudents.length) * 100)
              : 0;

            return (
              <div key={a.id} className="card">
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                      {a.title}
                    </h3>
                    <p style={{ color: 'var(--ink-soft)', fontSize: '13px' }}>
                      {a.questionIds.length} questions · {marks} marks · {a.durationMin} min
                      {a.negativeMarking && ' · Negative marking on'}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[a.status] || 'gray'}>{a.status}</Badge>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--ink-soft)', marginBottom: '6px' }}>
                    <span>Submission progress</span>
                    <span>{submitted}/{a.assignedStudents.length} submitted ({submitRate}%)</span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '100px', background: 'var(--line)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${submitRate}%`,
                      borderRadius: '100px',
                      background: submitRate === 100 ? 'var(--teal)' : 'var(--indigo)',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  <Stat label="Assigned" value={a.assignedStudents.length} />
                  <Stat label="In progress" value={inProgress} accent={inProgress > 0 ? 'var(--amber)' : undefined} />
                  <Stat label="Submitted" value={submitted} />
                  <Stat label="Results published" value={evaluated} accent={evaluated === submitted && submitted > 0 ? 'var(--teal-deep)' : undefined} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
      <span style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '600' }}>
        {label}
      </span>
      <span style={{ fontSize: '20px', fontWeight: '700', color: accent || 'var(--ink)', fontFamily: 'Space Grotesk, sans-serif' }}>
        {value}
      </span>
    </div>
  );
}
