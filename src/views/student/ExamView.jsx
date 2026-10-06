import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useExamTimer } from '../../hooks/useExamTimer';
import { useIntegrityMonitor } from '../../hooks/useIntegrityMonitor';
import { useScreenRecorder } from '../../hooks/useScreenRecorder';
import { Button } from '../../components/common/Button';

export function ExamView() {
  const {
    examAttemptId,
    attempts,
    assessments,
    questions,
    examIndex,
    setExamIndex,
    answerQuestion,
    toggleReview,
    recordIntegrityEvent,
    setAttemptRemainingSeconds,
    saveScreenRecording,
    openModal,
    submitExam,
    showToast,
  } = useApp();

  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [hasStartedRecording, setHasStartedRecording] = useState(false);

  const attempt = attempts.find((a) => a.id === examAttemptId);
  const assessment = assessments.find((a) => a.id === attempt?.assessmentId || a.id === attempt?.testId);

  // Screen Recording Proctoring Integration
  const handleRecordingIntegrityViolation = useCallback((msg) => {
    recordIntegrityEvent({
      type: 'screen_recording_stopped',
      time: new Date().toLocaleTimeString(),
      details: msg || 'Screen recording was stopped by the student during active exam',
    });
    showToast('⚠️ Integrity Violation: Screen recording was stopped!');
  }, [recordIntegrityEvent, showToast]);

  const {
    isRecording,
    hasPermission,
    formattedDuration,
    recordingError,
    startRecording,
    stopRecording,
  } = useScreenRecorder({
    onIntegrityViolation: handleRecordingIntegrityViolation,
  });

  // Stop recording if disqualified
  useEffect(() => {
    if ((attempt?.status === 'Disqualified' || attempt?.disqualified) && isRecording) {
      stopRecording().then((res) => {
        if (res?.url) {
          saveScreenRecording(examAttemptId, res);
        }
      });
    }
  }, [attempt?.status, attempt?.disqualified, isRecording, stopRecording, saveScreenRecording, examAttemptId]);

  const handleOpenSubmitConfirm = () => {
    openModal('submitConfirm', {
      isRecording,
      onConfirm: async () => {
        let recordingData = null;
        if (isRecording) {
          try {
            recordingData = await stopRecording();
            if (recordingData?.url) {
              saveScreenRecording(examAttemptId, recordingData);
            }
          } catch (err) {
            console.warn('Error stopping recording on submit:', err);
          }
        }
        submitExam(recordingData);
      },
    });
  };

  const { formattedTime, isLow } = useExamTimer({
    attemptId: attempt?.id,
    remainingSeconds: attempt?.remainingSeconds,
    onTick: setAttemptRemainingSeconds,
    isActive: hasStartedRecording && isRecording,
    onTimeUp: async () => {
      showToast('Time is up — auto-submitting');
      let recordingData = null;
      if (isRecording) {
        try {
          recordingData = await stopRecording();
          if (recordingData?.url) {
            saveScreenRecording(examAttemptId, recordingData);
          }
        } catch (err) {
          console.warn('Error finalizing recording on timeout:', err);
        }
      }
      submitExam(recordingData);
    },
  });

  // Anti-cheating: Page Visibility API listener (only active once exam is unlocked & recording)
  useIntegrityMonitor(attempt?.status === 'In Progress' && hasStartedRecording && isRecording, recordIntegrityEvent);

  if (!attempt || !assessment) {
    return <div className="empty">Test attempt not found.</div>;
  }

  if (attempt.status === 'Disqualified' || attempt.disqualified) {
    return (
      <div className="card" style={{ padding: '36px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
        <h2 style={{ color: 'var(--coral)', marginBottom: '8px' }}>Test Terminated: Disqualified</h2>
        <p style={{ color: 'var(--ink-soft)', maxWidth: '500px', margin: '0 auto 20px' }}>
          This attempt was disqualified because the browser window was switched or minimized more than 3 times.
          Your tab switch count of {attempt.tabSwitchCount || 4} has been recorded.
        </p>
      </div>
    );
  }

  // Pre-test Proctoring Screen: Student MUST start screen recording before viewing questions
  if (!hasStartedRecording) {
    return (
      <div style={{ maxWidth: '640px', margin: '30px auto' }}>
        <div className="card" style={{ padding: '36px', textAlign: 'center' }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '18px',
            background: 'var(--coral-light)',
            color: 'var(--coral)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            marginBottom: '18px',
            boxShadow: '0 8px 24px rgba(240, 83, 62, 0.18)',
          }}>
            📹
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px', color: 'var(--ink)' }}>
            Proctored Assessment Verification
          </h2>
          <p style={{ color: 'var(--ink-soft)', fontSize: '14px', maxWidth: '480px', margin: '0 auto 22px', lineHeight: '1.5' }}>
            <strong>{assessment.title}</strong> requires continuous screen recording throughout your test session. Questions and exam timer unlock only when screen recording begins.
          </p>

          <div style={{
            background: 'var(--paper)',
            borderRadius: '12px',
            padding: '18px 20px',
            textAlign: 'left',
            marginBottom: '24px',
            border: '1px solid var(--line)',
            fontSize: '13px',
            lineHeight: '1.6',
            color: 'var(--ink-soft)',
          }}>
            <div style={{ fontWeight: '600', color: 'var(--ink)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🛡️</span> Academic Integrity Requirements:
            </div>
            <ul style={{ paddingLeft: '20px', margin: 0 }}>
              <li><strong>Continuous Screen Recording:</strong> Your screen will be recorded and attached to your attempt for teacher review.</li>
              <li><strong>Strict Tab Limit:</strong> Maximum <strong>3 tab switches</strong> allowed. Switching tabs more than 3 times will instantly disqualify you.</li>
              <li><strong>Do Not Disconnect:</strong> Stopping screen sharing mid-exam freezes your test session immediately until resumed.</li>
            </ul>
          </div>

          {recordingError && (
            <div style={{
              background: 'var(--coral-light)',
              color: 'var(--coral)',
              border: '1px solid var(--coral)',
              padding: '10px 16px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '13px',
              textAlign: 'left',
            }}>
              ⚠️ {recordingError}
            </div>
          )}

          <Button
            variant="coral"
            size="lg"
            onClick={async () => {
              const ok = await startRecording();
              if (ok) {
                setHasStartedRecording(true);
              }
            }}
            style={{
              padding: '14px 34px',
              fontSize: '15px',
              fontWeight: '700',
              gap: '10px',
              boxShadow: '0 8px 22px rgba(240, 83, 62, 0.28)',
            }}
          >
            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#fff', animation: 'pulse 1.5s infinite' }} />
            Start Screen Recording to Begin Exam
          </Button>
        </div>
      </div>
    );
  }

  const qid = assessment.questionIds[examIndex];
  const q = questions.find((x) => x.id === qid);

  if (!q) {
    return <div className="empty">Question not found.</div>;
  }

  const answeredCount = assessment.questionIds.filter(
    (id) => attempt.answers && attempt.answers[id] !== undefined && attempt.answers[id] !== ''
  ).length;

  const currentAnswer = (attempt.answers && attempt.answers[qid]) ?? '';
  const isMarkedForReview = attempt.review && attempt.review.includes(qid);

  const handleAnswerChange = (val) => {
    answerQuestion(qid, val);
    setLastSavedTime(new Date().toLocaleTimeString());
  };

  const tabCount = attempt.tabSwitchCount || 0;

  return (
    <div>
      <div className="page-head">
        <div>
          <h2 className="title-3d">{assessment.title}</h2>
          <p>
            Question {examIndex + 1} of {assessment.questionIds.length} · {answeredCount}/
            {assessment.questionIds.length} answered
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Live Screen Recording Indicator or Action */}
          {isRecording ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                background: 'var(--coral-light)',
                color: 'var(--coral)',
                border: '1px solid var(--coral)',
                padding: '5px 12px',
                borderRadius: '100px',
                fontSize: '12px',
                fontWeight: '600',
              }}
              title="Screen recording proctoring is active"
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--coral)',
                  boxShadow: '0 0 8px var(--coral)',
                  animation: 'pulse 1.5s infinite',
                }}
              />
              <span>REC {formattedDuration}</span>
            </div>
          ) : (
            <Button
              variant="coral"
              size="sm"
              onClick={startRecording}
              style={{ gap: '6px', fontSize: '12px', padding: '5px 12px', fontWeight: '600' }}
              title="Click to start screen recording proctoring"
            >
              <span style={{ fontSize: '14px' }}>🎥</span>
              <span>Start Screen Recording</span>
            </Button>
          )}

          {/* Live Tab Switch Counter (Limit: 3) */}
          <div
            className={`badge ${tabCount >= 2 ? 'badge-coral' : tabCount > 0 ? 'badge-amber' : 'badge-gray'}`}
            title="Exceeding 3 tab switches results in automatic disqualification"
          >
            Tab switches: {tabCount} / 3
          </div>

          <div className={`exam-timer mono ${isLow ? 'low' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {formattedTime}
          </div>
        </div>
      </div>

      {/* Screen Recording Disconnected Alert Overlay: Freezes exam until resumed */}
      {!isRecording && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 17, 42, 0.88)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '42px', marginBottom: '14px' }}>⚠️</div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--coral)', marginBottom: '8px' }}>
              Exam Frozen: Screen Recording Stopped
            </h3>
            <p style={{ color: 'var(--ink-soft)', fontSize: '13.5px', marginBottom: '22px', lineHeight: '1.5' }}>
              Screen sharing was disconnected. Continuous recording is mandatory for this exam. Test questions and timers are locked until screen recording resumes.
            </p>
            {recordingError && (
              <div style={{ fontSize: '12.5px', color: 'var(--coral)', marginBottom: '14px' }}>
                {recordingError}
              </div>
            )}
            <Button
              variant="coral"
              size="md"
              onClick={startRecording}
              style={{ width: '100%', padding: '12px', fontWeight: '700' }}
            >
              🔴 Resume Screen Recording & Unlock Exam
            </Button>
          </div>
        </div>
      )}

      {/* Screen Recording Active Status Strip */}
      {isRecording && (
        <div style={{
          background: 'var(--teal-light)',
          border: '1px solid rgba(14, 186, 155, 0.3)',
          color: 'var(--teal-deep)',
          borderRadius: '10px',
          padding: '8px 14px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px',
          fontSize: '12.5px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--coral)',
              animation: 'pulse 1.5s infinite',
            }} />
            <span><strong>Screen recording active:</strong> Duration {formattedDuration}. All on-screen activity is logged for proctoring verification.</span>
          </div>
          <span className="badge badge-teal" style={{ fontSize: '11px' }}>
            Proctoring Verified
          </span>
        </div>
      )}

      {/* Warning banner when tab switches are high (Limit: 3) */}
      {tabCount >= 2 && (
        <div style={{
          background: 'var(--amber-light)',
          color: 'var(--amber)',
          border: '1px solid rgba(196, 80, 30, 0.3)',
          padding: '10px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          ⚠️ <strong>Anti-Cheating Warning:</strong> You have {3 - tabCount} tab switch(es) remaining before automatic disqualification!
        </div>
      )}

      <div className="exam-shell">
        <div className="card">
          <div className="exam-q-meta">
            {q.topic} · {q.marks} mark{q.marks > 1 ? 's' : ''} ·{' '}
            {q.type === 'subjective' || q.type === 'short_answer' ? 'manually graded' : 'auto-graded'}
          </div>

          <div className="exam-q-text">{q.text}</div>

          {/* MCQ */}
          {q.type === 'mcq' && (
            <div>
              {q.options?.map((opt) => {
                const isSelected = currentAnswer === opt;
                return (
                  <label
                    key={opt}
                    className={`opt ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleAnswerChange(opt)}
                  >
                    <input
                      type="radio"
                      name={`opt-${qid}`}
                      checked={isSelected}
                      onChange={() => handleAnswerChange(opt)}
                    />
                    {opt}
                  </label>
                );
              })}
            </div>
          )}

          {/* True / False */}
          {q.type === 'true_false' && (
            <div>
              {['True', 'False'].map((opt) => {
                const isSelected = currentAnswer === opt;
                return (
                  <label
                    key={opt}
                    className={`opt ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleAnswerChange(opt)}
                  >
                    <input
                      type="radio"
                      name={`opt-tf-${qid}`}
                      checked={isSelected}
                      onChange={() => handleAnswerChange(opt)}
                    />
                    {opt}
                  </label>
                );
              })}
            </div>
          )}

          {/* Numerical */}
          {q.type === 'numerical' && (
            <input
              type="text"
              placeholder="Enter numeric answer"
              value={currentAnswer}
              onChange={(e) => handleAnswerChange(e.target.value)}
            />
          )}

          {/* Short Answer / Subjective */}
          {(q.type === 'short_answer' || q.type === 'subjective') && (
            <textarea
              placeholder="Write your answer here..."
              rows={7}
              value={currentAnswer}
              onChange={(e) => handleAnswerChange(e.target.value)}
            />
          )}

          <div className="save-indicator">
            {lastSavedTime
              ? `Saved ${lastSavedTime}`
              : 'Answers save automatically as you type.'}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '26px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="outline"
                size="sm"
                disabled={examIndex === 0}
                onClick={() => setExamIndex(examIndex - 1)}
              >
                ← Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={examIndex === assessment.questionIds.length - 1}
                onClick={() => setExamIndex(examIndex + 1)}
              >
                Next →
              </Button>
            </div>

            <Button
              variant={isMarkedForReview ? 'indigo' : 'outline'}
              size="sm"
              onClick={() => toggleReview(qid)}
            >
              {isMarkedForReview ? 'Marked for review' : 'Mark for review'}
            </Button>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="nav-grid">
              {assessment.questionIds.map((id, i) => {
                let cls = '';
                if (attempt.review && attempt.review.includes(id)) {
                  cls = 'review';
                } else if (
                  attempt.answers &&
                  attempt.answers[id] !== undefined &&
                  attempt.answers[id] !== ''
                ) {
                  cls = 'answered';
                }
                if (i === examIndex) {
                  cls += ' current';
                }

                return (
                  <button
                    key={id}
                    type="button"
                    className={cls.trim()}
                    onClick={() => setExamIndex(i)}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            <div className="legend">
              <span>
                <i style={{ background: 'var(--teal)' }} />
                Answered
              </span>
              <span>
                <i style={{ background: 'var(--amber)' }} />
                Marked for review
              </span>
              <span>
                <i style={{ background: '#fff', border: '1px solid var(--line)' }} />
                Unanswered
              </span>
            </div>

            <Button
              variant="indigo"
              size="sm"
              style={{ width: '100%', marginTop: '16px' }}
              onClick={handleOpenSubmitConfirm}
            >
              Submit test
            </Button>

            <div className="integrity-note">
              🛡️ <strong>Anti-Cheating & Proctoring:</strong> Continuous screen recording and tab switching are monitored. More than 3 tab switches results in automatic disqualification.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
