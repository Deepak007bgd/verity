import React from 'react';
import { useApp } from '../../context/AppContext';
import { seedUsers } from '../../data/seedUsers';
import { PageHead } from '../../components/layout/PageHead';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { ClassPerformanceChart } from '../../components/charts/ClassPerformanceChart';
import { PerformanceLineChart } from '../../components/charts/PerformanceLineChart';
import { TopicPerformanceChart } from '../../components/charts/TopicPerformanceChart';
import { totalMarks, calculateGrade } from '../../utils/helpers';

export function AnalyticsView() {
  const { assessments, attempts, questions } = useApp();

  const a = assessments[0];
  if (!a) {
    return <div className="empty">No assessment data yet.</div>;
  }

  const tm = totalMarks(a, questions);

  const finishedAttempts = attempts.filter(
    (at) => at.assessmentId === a.id && at.status !== 'In Progress'
  );

  if (finishedAttempts.length === 0) {
    return (
      <div>
        <PageHead title="Analytics" subtitle={a.title} />
        <div className="empty">
          No submissions recorded yet for <strong>{a.title}</strong>. Analytics will populate as soon as students submit their exams.
        </div>
      </div>
    );
  }

  const scores = finishedAttempts.map((at) => at.totalScore);
  const avg = (scores.reduce((s, x) => s + x, 0) / scores.length).toFixed(1);
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  const passCount = scores.filter((s) => (s / tm) * 100 >= 40).length;
  const passRatePct = Math.round((passCount / finishedAttempts.length) * 100);

  // 1. Class performance comparison per student
  const classPerformanceData = finishedAttempts.map((at) => {
    const student = seedUsers.find((u) => u.id === at.studentId);
    const pct = tm > 0 ? Math.round((at.totalScore / tm) * 100) : 0;
    return {
      name: student ? student.name : at.studentId,
      score: at.totalScore,
      maxMarks: tm,
      percentage: pct,
      status: at.status,
    };
  });

  // 2. Performance trend across submissions
  const trendData = finishedAttempts.map((at, idx) => {
    const student = seedUsers.find((u) => u.id === at.studentId);
    const pct = tm > 0 ? Math.round((at.totalScore / tm) * 100) : 0;
    return {
      name: `Sub #${idx + 1} (${student ? student.name : ''})`,
      score: at.totalScore,
      maxMarks: tm,
      percentage: pct,
    };
  });

  // 3. Topic performance calculations
  const topics = {};
  a.questionIds.forEach((qid) => {
    const q = questions.find((x) => x.id === qid);
    if (!q) return;
    if (!topics[q.topic]) {
      topics[q.topic] = { earned: 0, possible: 0 };
    }
    finishedAttempts.forEach((at) => {
      const ev = at.evaluations ? at.evaluations[qid] : null;
      const earned = ev && ev.marks !== null ? ev.marks : at.autoScores?.[qid] ?? 0;
      topics[q.topic].earned += earned;
      topics[q.topic].possible += q.marks;
    });
  });

  const topicChartData = Object.keys(topics).map((t) => {
    const possible = topics[t].possible;
    const earned = topics[t].earned;
    const pct = possible > 0 ? Math.round((earned / possible) * 100) : 0;
    return {
      topic: t,
      earned,
      possible,
      percentage: pct,
    };
  });

  return (
    <div>
      <PageHead
        title="Performance Analytics"
        subtitle={`${a.title} · ${finishedAttempts.length} of ${a.assignedStudents.length} submitted`}
      />

      {/* KPI Stats Grid */}
      <div className="grid-4" style={{ marginBottom: '24px' }}>
        <StatCard
          num={`${avg}/${tm}`}
          lbl="Average score"
          trend={`${Math.round((parseFloat(avg) / tm) * 100)}% overall`}
        />
        <StatCard
          num={`${max} / ${min}`}
          lbl="Highest / Lowest"
          trend={`Range: ${max - min} marks`}
        />
        <StatCard
          num={`${passRatePct}%`}
          lbl="Pass rate (≥40%)"
          numStyle={{ color: passRatePct >= 50 ? 'var(--teal)' : 'var(--coral)' }}
          trend={`${passCount} of ${finishedAttempts.length} passed`}
        />
        <StatCard
          num={`${finishedAttempts.length}/${a.assignedStudents.length}`}
          lbl="Submissions"
          trend={`${Math.round((finishedAttempts.length / a.assignedStudents.length) * 100)}% complete`}
        />
      </div>

      {/* Charts Section */}
      <div className="grid-2" style={{ marginBottom: '24px' }}>
        <ClassPerformanceChart
          data={classPerformanceData}
          title="Student Score Comparison"
          subtitle="Total percentage scored per student"
        />
        <TopicPerformanceChart
          data={topicChartData}
          title="Topic Mastery Breakdown"
          subtitle="Aggregated accuracy percentage across all student attempts"
        />
      </div>

      {trendData.length > 1 && (
        <div style={{ marginBottom: '24px' }}>
          <PerformanceLineChart
            data={trendData}
            title="Submission Performance Trend"
            subtitle="Chronological student scores over assessment submission timeline"
          />
        </div>
      )}

      {/* Student Results Comparison Table */}
      <div className="list-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        Student Result Breakdown
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Status</th>
              <th>Submitted At</th>
              <th>Score</th>
              <th>Percentage</th>
              <th>Grade</th>
              <th>Integrity Flags</th>
            </tr>
          </thead>
          <tbody>
            {a.assignedStudents.map((uid) => {
              const student = seedUsers.find((u) => u.id === uid);
              const at = attempts.find((att) => att.assessmentId === a.id && att.studentId === uid);

              if (!at || at.status === 'In Progress') {
                return (
                  <tr key={uid}>
                    <td style={{ fontWeight: 500 }}>{student?.name || uid}</td>
                    <td>
                      <Badge variant="gray">{at ? 'In Progress' : 'Not Started'}</Badge>
                    </td>
                    <td style={{ color: 'var(--ink-soft)' }}>—</td>
                    <td style={{ color: 'var(--ink-soft)' }}>—</td>
                    <td style={{ color: 'var(--ink-soft)' }}>—</td>
                    <td style={{ color: 'var(--ink-soft)' }}>—</td>
                    <td>
                      <Badge variant="gray">None</Badge>
                    </td>
                  </tr>
                );
              }

              const pct = tm > 0 ? Math.round((at.totalScore / tm) * 100) : 0;
              const grade = calculateGrade(pct);
              const hasFlags = at.integrityEvents && at.integrityEvents.length > 0;

              return (
                <tr key={uid}>
                  <td style={{ fontWeight: 600 }}>{student?.name || uid}</td>
                  <td>
                    {at.resultPublished ? (
                      <Badge variant="teal">Published</Badge>
                    ) : (
                      <Badge variant="amber">Awaiting Publication</Badge>
                    )}
                  </td>
                  <td className="mono" style={{ color: 'var(--ink-soft)' }}>
                    {at.submittedAt}
                  </td>
                  <td>
                    <strong>{at.totalScore}</strong> / {tm}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: pct >= 40 ? 'var(--teal)' : 'var(--coral)' }}>
                      {pct}%
                    </span>
                  </td>
                  <td>
                    <span className="mono" style={{ fontWeight: 700 }}>
                      {grade}
                    </span>
                  </td>
                  <td>
                    {hasFlags ? (
                      <Badge variant="coral">{at.integrityEvents.length} event(s)</Badge>
                    ) : (
                      <Badge variant="teal">Clean</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
