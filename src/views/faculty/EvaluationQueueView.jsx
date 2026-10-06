import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { seedUsers } from '../../data/seedUsers';
import { PageHead } from '../../components/layout/PageHead';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

function EvaluationItem({ attempt, question, onSave }) {
  const currentEval = attempt.evaluations ? attempt.evaluations[question.id] : null;
  const [markInput, setMarkInput] = useState(
    currentEval && currentEval.marks !== null ? String(currentEval.marks) : ''
  );
  const [saved, setSaved] = useState(false);

  const studentAnswer =
    (attempt.answers && attempt.answers[question.id]) || '(no answer submitted)';

  const handleSave = () => {
    const val = parseFloat(markInput);
    if (isNaN(val)) return;
    const clamped = Math.max(0, Math.min(question.marks, val));
    onSave(attempt.id, question.id, question.marks, clamped);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const pct = currentEval ? Math.round((currentEval.marks / question.marks) * 100) : null;

  return (
    <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px', marginTop: '16px' }}>
      {/* Question meta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ fontSize: '12px', color: 'var(--ink-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {question.topic}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>
          Max: <strong>{question.marks}</strong> marks
        </div>
      </div>

      {/* Question text */}
      <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--ink)', marginBottom: '10px', lineHeight: '1.5' }}>
        {question.text}
      </div>

      {/* Student answer box */}
      <div style={{
        background: 'var(--paper)',
        padding: '12px 16px',
        borderRadius: '10px',
        border: '1px solid var(--line)',
        fontSize: '13.5px',
        color: 'var(--ink-soft)',
        marginBottom: '12px',
        whiteSpace: 'pre-wrap',
        lineHeight: '1.6',
        minHeight: '48px',
      }}>
        {studentAnswer}
      </div>

      {/* Mark input row */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="number"
          min="0"
          max={question.marks}
          step="0.5"
          placeholder={`0 – ${question.marks}`}
          style={{ width: '120px' }}
          value={markInput}
          onChange={(e) => { setMarkInput(e.target.value); setSaved(false); }}
        />
        <Button variant="outline" size="sm" onClick={handleSave}>
          {currentEval ? 'Update' : 'Save mark'}
        </Button>
        {(currentEval || saved) && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--teal-deep)', fontWeight: '600' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {currentEval ? `${currentEval.marks}/${question.marks} (${pct}%)` : 'Saved'}
          </span>
        )}
      </div>
    </div>
  );
}

export function EvaluationQueueView() {
  const { attempts, assessments, questions, saveEvaluation, publishResult } = useApp();

  const toEval = attempts.filter(
    (a) => a.status === 'Evaluating' || (a.status === 'Evaluated' && !a.resultPublished)
  );

  return (
    <div>
      <PageHead
        title="Evaluation queue"
        subtitle={
          toEval.length === 0
            ? 'All caught up — no pending evaluations.'
            : `${toEval.length} attempt${toEval.length !== 1 ? 's' : ''} need${toEval.length === 1 ? 's' : ''} attention`
        }
      />

      {toEval.length === 0 ? (
        <div className="card">
          <div className="empty" style={{ padding: '32px 16px' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="1.5" style={{ marginBottom: '12px' }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <div>Nothing to grade right now.</div>
            <div style={{ fontSize: '13px', color: 'var(--ink-muted)', marginTop: '6px' }}>
              Have a student submit the CN Midterm to populate this queue.
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {toEval.map((at) => {
            const assessment = assessments.find((a) => a.id === at.assessmentId);
            const student = seedUsers.find((u) => u.id === at.studentId);
            if (!assessment || !student) return null;

            const subjQs = assessment.questionIds
              .map((qid) => questions.find((q) => q.id === qid))
              .filter((q) => q && q.type === 'subjective');

            const allGraded = subjQs.every(
              (q) =>
                at.evaluations &&
                at.evaluations[q.id] &&
                at.evaluations[q.id].marks !== null &&
                at.evaluations[q.id].marks !== undefined
            );

            const gradedCount = subjQs.filter(
              (q) => at.evaluations && at.evaluations[q.id]?.marks !== null && at.evaluations[q.id]?.marks !== undefined
            ).length;

            const hasIntegrityEvents = at.integrityEvents && at.integrityEvents.length > 0;
            const isPublished = at.resultPublished;

            return (
              <div key={at.id} className="card">
                {/* Card header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                  <div>
                    <h3 style={{ fontSize: '15.5px', fontWeight: '600' }}>
                      {student.name}
                    </h3>
                    <p style={{ color: 'var(--ink-soft)', fontSize: '13px', marginTop: '3px' }}>
                      {assessment.title} · Submitted {at.submittedAt}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    {hasIntegrityEvents && (
                      <Badge variant="amber">
                        {at.integrityEvents.length} integrity event{at.integrityEvents.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    {isPublished
                      ? <Badge variant="teal">Published</Badge>
                      : <Badge variant="gray">{gradedCount}/{subjQs.length} graded</Badge>
                    }
                  </div>
                </div>

                {/* Grading progress bar */}
                {subjQs.length > 0 && (
                  <div style={{ marginBottom: '4px' }}>
                    <div style={{ height: '4px', borderRadius: '100px', background: 'var(--line)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${(gradedCount / subjQs.length) * 100}%`,
                        borderRadius: '100px',
                        background: allGraded ? 'var(--teal)' : 'var(--indigo)',
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                  </div>
                )}
                {/* Screen recording proctoring video for faculty */}
                {at.screenRecordingUrl ? (
                  <div style={{
                    marginTop: '12px',
                    marginBottom: '14px',
                    padding: '12px 14px',
                    background: 'var(--paper)',
                    borderRadius: '10px',
                    border: '1px solid var(--line)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--ink)' }}>
                        <span>📹</span>
                        <span>Screen Recording Proctoring Video</span>
                        {at.screenRecordingDuration !== undefined && (
                          <span style={{ fontSize: '12px', color: 'var(--ink-soft)', fontWeight: 'normal' }}>
                            ({Math.floor(at.screenRecordingDuration / 60)}m {at.screenRecordingDuration % 60}s)
                          </span>
                        )}
                      </div>
                      <a
                        href={at.screenRecordingUrl}
                        download={`exam-${student.name.replace(/\s+/g, '_')}-${at.id}.webm`}
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '12px', padding: '4px 10px' }}
                      >
                        Download Video
                      </a>
                    </div>
                    <div style={{ borderRadius: '6px', overflow: 'hidden', background: '#000', maxHeight: '300px', display: 'flex', justifyContent: 'center' }}>
                      <video
                        src={at.screenRecordingUrl}
                        controls
                        style={{ width: '100%', maxHeight: '300px' }}
                      />
                    </div>
                  </div>
                ) : null}

                {/* Evaluation items */}
                {subjQs.map((q) => (
                  <EvaluationItem
                    key={q.id}
                    attempt={at}
                    question={q}
                    onSave={saveEvaluation}
                  />
                ))}

                {/* Footer */}
                <div style={{
                  marginTop: '20px',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--line)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}>
                  <span style={{ fontSize: '13px', color: allGraded ? 'var(--teal-deep)' : 'var(--ink-soft)' }}>
                    {isPublished
                      ? '✓ Result has been published to student.'
                      : allGraded
                      ? '✓ All subjective answers graded — ready to publish.'
                      : `Grade all ${subjQs.length} subjective answer${subjQs.length !== 1 ? 's' : ''} to publish.`}
                  </span>
                  <Button
                    variant="indigo"
                    size="sm"
                    disabled={!allGraded || isPublished}
                    onClick={() => publishResult(at.id)}
                  >
                    {isPublished ? 'Published' : 'Publish result'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
