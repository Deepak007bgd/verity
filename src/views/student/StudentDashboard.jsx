import React from 'react';
import { useApp } from '../../context/AppContext';
import { PageHead } from '../../components/layout/PageHead';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { PerformanceLineChart } from '../../components/charts/PerformanceLineChart';
import { TopicPerformanceChart } from '../../components/charts/TopicPerformanceChart';
import { AnswerDistributionChart } from '../../components/charts/AnswerDistributionChart';
import { totalMarks } from '../../utils/helpers';

export function StudentDashboard() {
  const { currentUser, assessments, questions, attempts, startExam, resumeExam, nav } =
    useApp();

  const mine = assessments.filter(
    (a) => a.assignedStudents && a.assignedStudents.includes(currentUser?.id)
  );

  const studentAttempts = attempts.filter((at) => at.studentId === currentUser?.id);
  const publishedAttempts = studentAttempts.filter((at) => at.resultPublished);
  const inProgressAttempts = studentAttempts.filter((at) => at.status === 'In Progress');

  // Summary Metrics
  let avgPercentage = null;
  if (publishedAttempts.length > 0) {
    const totalPcts = publishedAttempts.reduce((sum, at) => {
      const assessment = assessments.find((a) => a.id === at.assessmentId);
      const tm = totalMarks(assessment, questions);
      const pct = tm > 0 ? (at.totalScore / tm) * 100 : 0;
      return sum + pct;
    }, 0);
    avgPercentage = Math.round(totalPcts / publishedAttempts.length);
  }

  // A. Performance Over Assessments (Line Chart)
  const lineChartData = publishedAttempts.map((at) => {
    const assessment = assessments.find((a) => a.id === at.assessmentId);
    const tm = totalMarks(assessment, questions);
    const pct = tm > 0 ? Math.round((at.totalScore / tm) * 100) : 0;
    return {
      name: assessment ? assessment.title : at.assessmentId,
      score: at.totalScore,
      maxMarks: tm,
      percentage: pct,
    };
  });

  // B. Topic Performance (Bar Chart)
  const topicMap = {};
  publishedAttempts.forEach((at) => {
    const assessment = assessments.find((a) => a.id === at.assessmentId);
    if (!assessment) return;

    assessment.questionIds.forEach((qid) => {
      const q = questions.find((x) => x.id === qid);
      if (!q) return;

      if (!topicMap[q.topic]) {
        topicMap[q.topic] = { earned: 0, possible: 0 };
      }

      const ev = at.evaluations ? at.evaluations[qid] : null;
      const earned = ev && ev.marks !== null ? ev.marks : at.autoScores?.[qid] ?? 0;
      topicMap[q.topic].earned += earned;
      topicMap[q.topic].possible += q.marks;
    });
  });

  const topicChartData = Object.keys(topicMap).map((t) => {
    const possible = topicMap[t].possible;
    const earned = topicMap[t].earned;
    const pct = possible > 0 ? Math.round((earned / possible) * 100) : 0;
    return {
      topic: t,
      earned,
      possible,
      percentage: pct,
    };
  });

  // C. Answer Distribution (Donut Chart)
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  publishedAttempts.forEach((at) => {
    const assessment = assessments.find((a) => a.id === at.assessmentId);
    if (!assessment) return;

    assessment.questionIds.forEach((qid) => {
      const q = questions.find((x) => x.id === qid);
      if (!q) return;

      const ans = at.answers ? at.answers[qid] : undefined;
      const hasAnswer = ans !== undefined && ans !== null && ans.toString().trim() !== '';

      if (!hasAnswer) {
        unansweredCount++;
      } else if (q.type === 'subjective') {
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
  });

  const answerDistData = [
    { name: 'Correct / Passing', value: correctCount, color: 'var(--teal)' },
    { name: 'Incorrect / Low', value: incorrectCount, color: 'var(--coral)' },
    { name: 'Unanswered', value: unansweredCount, color: 'var(--ink-muted)' },
  ];

  return (
    <div>
      <PageHead
        title="My Assessments"
        subtitle="Manage your active tests and track your academic progress."
      />

      {/* Overview Stat Cards */}
      <div className="grid-3" style={{ marginBottom: '28px' }}>
        <StatCard
          num={mine.length}
          lbl="Assigned Assessments"
          trend={`${inProgressAttempts.length} in progress`}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
        />
        <StatCard
          num={publishedAttempts.length}
          lbl="Evaluated & Published"
          trend={`${studentAttempts.length} total submitted`}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
        />
        <StatCard
          num={avgPercentage !== null ? `${avgPercentage}%` : '—'}
          lbl="Average Score"
          numStyle={{ color: avgPercentage && avgPercentage >= 40 ? 'var(--teal)' : 'inherit' }}
          trend={avgPercentage !== null ? (avgPercentage >= 40 ? 'Passing standing' : 'Needs improvement') : 'No grades yet'}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 14 14" />
            </svg>
          }
        />
      </div>

      {/* Assessment Cards List */}
      <div className="list-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        Assigned Course Exams
      </div>

      {mine.length === 0 ? (
        <div className="empty">No assessments assigned yet.</div>
      ) : (
        mine.map((a) => {
          const attempt = attempts.find(
            (at) => at.assessmentId === a.id && at.studentId === currentUser?.id
          );

          let statusText = 'Not started';
          let actionElement = (
            <Button variant="teal" size="sm" onClick={() => startExam(a.id)}>
              Start exam
            </Button>
          );

          if (attempt) {
            if (attempt.status === 'In Progress') {
              statusText = 'In progress';
              actionElement = (
                <Button variant="indigo" size="sm" onClick={() => resumeExam(attempt.id)}>
                  Resume
                </Button>
              );
            } else if (attempt.resultPublished) {
              statusText = 'Result published';
              actionElement = (
                <Button variant="outline" size="sm" onClick={() => nav('results')}>
                  View result
                </Button>
              );
            } else {
              statusText = 'Submitted — evaluating';
              actionElement = <Badge variant="amber">Awaiting evaluation</Badge>;
            }
          }

          const tm = totalMarks(a, questions);

          return (
            <div
              key={a.id}
              className="card card-interactive"
              style={{
                marginBottom: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <h3 style={{ fontSize: '16px' }}>{a.title}</h3>
                <p style={{ color: 'var(--ink-soft)', fontSize: '13px', marginTop: '4px' }}>
                  {a.questionIds.length} questions · {tm} marks · {a.durationMin} minutes ·{' '}
                  <strong style={{ color: 'var(--ink)' }}>{statusText}</strong>
                </p>
              </div>
              {actionElement}
            </div>
          );
        })
      )}

      {/* Performance Analytics Section */}
      <div className="list-title" style={{ marginTop: '36px' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
        Performance Analytics
      </div>

      {publishedAttempts.length === 0 ? (
        <div className="card empty">
          <p>No published performance analytics available yet.</p>
          <p style={{ fontSize: '13px', marginTop: '4px', color: 'var(--ink-soft)' }}>
            Complete your scheduled assessments and wait for faculty review to populate your progress charts.
          </p>
        </div>
      ) : (
        <div>
          <div className="grid-2" style={{ marginBottom: '20px' }}>
            <TopicPerformanceChart
              data={topicChartData}
              title="Curriculum Topic Mastery"
              subtitle="Your percentage accuracy across Computer Networks topics"
            />
            <AnswerDistributionChart
              data={answerDistData}
              title="Overall Response Distribution"
              subtitle="Distribution of your answers across published exams"
            />
          </div>

          {lineChartData.length > 1 && (
            <div style={{ marginTop: '20px' }}>
              <PerformanceLineChart
                data={lineChartData}
                title="Exam Score Trend"
                subtitle="Track your percentage progress over sequential assessments"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
