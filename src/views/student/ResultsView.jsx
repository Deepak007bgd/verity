import React from 'react';
import { useApp } from '../../context/AppContext';
import { PageHead } from '../../components/layout/PageHead';
import { Badge } from '../../components/common/Badge';
import { TopicPerformanceChart } from '../../components/charts/TopicPerformanceChart';
import { AnswerDistributionChart } from '../../components/charts/AnswerDistributionChart';
import { totalMarks, calculateGrade } from '../../utils/helpers';

export function ResultsView() {
  const { currentUser, attempts, assessments, questions } = useApp();

  const studentUid = currentUser?.uid || currentUser?.id;
  const mine = attempts.filter(
    (a) => a.studentId === studentUid && (a.resultPublished || a.status === 'Disqualified' || a.disqualified)
  );

  if (mine.length === 0) {
    return (
      <div>
        <PageHead title="Results" subtitle="Published results appear here." />
        <div className="empty">
          No published results found. Once teachers complete grading and publish results, your comprehensive scorecard and analytics will display here.
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHead
        title="Assessment Results"
        subtitle="Detailed scorecards and topic breakdown for your published tests."
      />

      {mine.map((at) => {
        const assessment = assessments.find((a) => a.id === at.assessmentId || a.id === at.testId);
        if (!assessment) return null;

        const tm = totalMarks(assessment, questions);
        const pct = tm > 0 ? Math.round((at.totalScore / tm) * 100) : 0;
        const grade = calculateGrade(pct);
        const isDisqualified = at.status === 'Disqualified' || at.disqualified;
        const pass = !isDisqualified && pct >= (assessment.passCriteria || assessment.passPercentage || 40);

        // Topic calculations
        const topics = {};
        assessment.questionIds.forEach((qid) => {
          const q = questions.find((x) => x.id === qid);
          if (!q) return;
          if (!topics[q.topic]) {
            topics[q.topic] = { earned: 0, possible: 0 };
          }
          const ev = at.evaluations ? at.evaluations[qid] : null;
          const earned = ev && ev.marks !== null ? ev.marks : at.autoScores?.[qid] ?? 0;
          topics[q.topic].earned += earned;
          topics[q.topic].possible += q.marks;
        });

        const topicChartData = Object.keys(topics).map((t) => {
          const possible = topics[t].possible;
          const earned = topics[t].earned;
          const pc = possible > 0 ? Math.round((earned / possible) * 100) : 0;
          return {
            topic: t,
            earned,
            possible,
            percentage: pc,
          };
        });

        // Answer distribution
        let correctCount = 0;
        let incorrectCount = 0;
        let unansweredCount = 0;

        assessment.questionIds.forEach((qid) => {
          const q = questions.find((x) => x.id === qid);
          if (!q) return;

          const ans = at.answers ? at.answers[qid] : undefined;
          const hasAnswer = ans !== undefined && ans !== null && ans.toString().trim() !== '';

          if (!hasAnswer) {
            unansweredCount++;
          } else if (q.type === 'subjective' || q.type === 'short_answer') {
            const ev = at.evaluations ? at.evaluations[qid] : null;
            if (ev && ev.marks >= q.marks * 0.5) {
              correctCount++;
            } else {
              incorrectCount++;
            }
          } else {
            const score = at.autoScores?.[qid] ?? 0;
            if (score > 0) {
              correctCount++;
            } else {
              incorrectCount++;
            }
          }
        });

        const answerDistData = [
          { name: 'Correct', value: correctCount, color: 'var(--teal)' },
          { name: 'Incorrect', value: incorrectCount, color: 'var(--coral)' },
          { name: 'Unanswered', value: unansweredCount, color: 'var(--ink-muted)' },
        ];

        return (
          <div key={at.id} className="card" style={{ marginBottom: '28px' }}>
            {/* Top Score Summary Banner */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                paddingBottom: '20px',
                borderBottom: '1px solid var(--line)',
                marginBottom: '20px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ fontSize: '18px' }}>{assessment.title}</h3>
                  {isDisqualified ? (
                    <Badge variant="coral">Disqualified</Badge>
                  ) : (
                    <Badge variant={pass ? 'teal' : 'coral'}>
                      {pass ? 'Passed' : 'Failed'}
                    </Badge>
                  )}
                  {!isDisqualified && <Badge variant="gray">Grade {grade}</Badge>}
                  {at.tabSwitchCount > 0 && (
                    <Badge variant={isDisqualified ? 'coral' : 'amber'}>
                      {at.tabSwitchCount} Tab Switch{at.tabSwitchCount > 1 ? 'es' : ''}
                    </Badge>
                  )}
                </div>
                <p style={{ color: 'var(--ink-soft)', fontSize: '13.5px', marginTop: '5px' }}>
                  Submitted on {at.submittedAt || at.endTime || '—'} · {pct}% overall accuracy
                  {isDisqualified && ' · Disqualified due to exceeding 5 tab switches'}
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '32px',
                    fontWeight: '700',
                    color: isDisqualified ? 'var(--coral)' : pass ? 'var(--teal-deep)' : 'var(--coral)',
                    lineHeight: 1,
                  }}
                >
                  {at.totalScore ?? at.score ?? 0}
                  <span style={{ fontSize: '16px', color: 'var(--ink-soft)', fontWeight: 500 }}>
                    /{tm}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ink-soft)', marginTop: '4px' }}>
                  {isDisqualified ? 'Disqualified Score' : 'Total Points Earned'}
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid-2" style={{ marginBottom: '24px' }}>
              <TopicPerformanceChart
                data={topicChartData}
                title="Topic Mastery in this Exam"
                subtitle="Performance breakdown by curriculum topics"
              />
              <AnswerDistributionChart
                data={answerDistData}
                title="Response Breakdown"
                subtitle="Accuracy distribution across all exam questions"
              />
            </div>

            {/* Proctoring Screen Recording */}
            {at.screenRecordingUrl && (
              <div style={{
                background: 'var(--paper)',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid var(--line)',
                marginBottom: '24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>📹</span>
                    <span style={{ fontWeight: '600', fontSize: '15px', color: 'var(--ink)' }}>
                      Proctoring Screen Recording
                    </span>
                    {at.screenRecordingDuration !== undefined && (
                      <Badge variant="gray">
                        Duration: {Math.floor(at.screenRecordingDuration / 60)}m {at.screenRecordingDuration % 60}s
                      </Badge>
                    )}
                  </div>
                  <a
                    href={at.screenRecordingUrl}
                    download={`verity-exam-screen-${at.id}.webm`}
                    className="btn btn-outline btn-sm"
                    style={{ gap: '6px' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download Recording
                  </a>
                </div>

                <div style={{ borderRadius: '8px', overflow: 'hidden', background: '#000', maxHeight: '380px', display: 'flex', justifyContent: 'center' }}>
                  <video
                    src={at.screenRecordingUrl}
                    controls
                    style={{ width: '100%', maxHeight: '380px', outline: 'none' }}
                  />
                </div>
              </div>
            )}

            {/* Detailed Question Review List */}
            <div className="list-title">Question Breakdown & Evaluation</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {assessment.questionIds.map((qid, idx) => {
                const q = questions.find((x) => x.id === qid);
                if (!q) return null;

                const ans = at.answers ? at.answers[qid] : '(no answer provided)';
                const ev = at.evaluations ? at.evaluations[qid] : null;
                const earned = ev && ev.marks !== null ? ev.marks : at.autoScores?.[qid] ?? 0;
                const isFull = earned === q.marks;
                const isZero = earned === 0;

                return (
                  <div
                    key={qid}
                    style={{
                      background: 'var(--paper)',
                      borderRadius: '10px',
                      padding: '16px',
                      border: '1px solid var(--line)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '12px',
                        marginBottom: '8px',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-soft)', textTransform: 'uppercase' }}>
                          Q{idx + 1} · {q.topic} · {q.type.toUpperCase()}
                        </span>
                        <div style={{ fontSize: '14.5px', fontWeight: 500, marginTop: '4px', color: 'var(--ink)' }}>
                          {q.text}
                        </div>
                      </div>
                      <Badge variant={isFull ? 'teal' : isZero ? 'coral' : 'amber'}>
                        {earned} / {q.marks} mk
                      </Badge>
                    </div>

                    <div style={{ fontSize: '13px', marginTop: '8px', color: 'var(--ink-soft)' }}>
                      <strong>Your answer:</strong>{' '}
                      <span style={{ color: 'var(--ink)', fontFamily: q.type === 'numerical' ? 'var(--font-mono)' : 'inherit' }}>
                        {ans || '(unanswered)'}
                      </span>
                    </div>

                    {q.type !== 'subjective' && q.correct && (
                      <div style={{ fontSize: '12.5px', marginTop: '4px', color: 'var(--teal-deep)' }}>
                        <strong>Correct answer:</strong> {q.correct}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
