import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useExamTimer } from '../../hooks/useExamTimer';
import { useIntegrityMonitor } from '../../hooks/useIntegrityMonitor';
import { useScreenRecorder } from '../../hooks/useScreenRecorder';
import { useExamFaceProctor } from '../../hooks/useExamFaceProctor';
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

  // AI Webcam Face & Microphone Proctoring Integration
  const handleProctorIntegrityViolation = useCallback((event) => {
    recordIntegrityEvent(event);
    showToast(`⚠️ Proctor Alert: ${event.details || event.type}`);
  }, [recordIntegrityEvent, showToast]);

  const {
    videoRef,
    setVideoRef,
    cameraActive,
    cameraError,
    audioLevel,
    activeAlert,
    isRecording: isWebcamRecording,
    startProctoring,
    stopProctoring,
  } = useExamFaceProctor({
    onIntegrityViolation: handleProctorIntegrityViolation,
  });

  // Stop recording & proctoring if disqualified
  useEffect(() => {
    if ((attempt?.status === 'Disqualified' || attempt?.disqualified)) {
      if (isRecording) {
        stopRecording().then((res) => {
          if (res?.url) {
            saveScreenRecording(examAttemptId, res);
          }
        });
      }
      stopProctoring().catch(() => {});
    }
  }, [attempt?.status, attempt?.disqualified, isRecording, stopRecording, stopProctoring, saveScreenRecording, examAttemptId]);

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

  // Pre-test Proctoring Screen: Student MUST start screen recording & AI camera/mic proctoring before viewing questions
  if (!hasStartedRecording) {
    return (
      <div style={{ maxWidth: '660px', margin: '30px auto' }}>
        <div className="card" style={{ padding: '36px', textAlign: 'center' }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '20px',
            background: 'var(--coral-light)',
            color: 'var(--coral)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '34px',
            marginBottom: '18px',
            boxShadow: '0 8px 24px rgba(240, 83, 62, 0.18)',
          }}>
            📹
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px', color: 'var(--ink)' }}>
            AI-Proctored Exam Verification
          </h2>
          <p style={{ color: 'var(--ink-soft)', fontSize: '14px', maxWidth: '520px', margin: '0 auto 22px', lineHeight: '1.5' }}>
            <strong>{assessment.title}</strong> is monitored with continuous screen recording, AI webcam face &amp; mouth occlusion tracking, and microphone audio analysis.
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
              <span>🛡️</span> Mandatory Academic Integrity Checks:
            </div>
            <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>Continuous Screen Recording:</strong> Your entire screen is captured and recorded for instructor review.</li>
              <li><strong>AI Face Visibility:</strong> You must remain in front of the camera. Turning away or leaving the frame triggers an alert.</li>
              <li><strong>Mouth &amp; Face Occlusion Detection:</strong> Covering your lips, mouth, or face with hands or objects triggers an immediate integrity warning.</li>
              <li><strong>Microphone Audio Monitoring:</strong> Any talking, whispering, or abnormal room noise is detected and logged.</li>
              <li><strong>Strict Tab Limit:</strong> Maximum <strong>3 tab switches</strong> allowed before automatic disqualification.</li>
            </ul>
          </div>

          {(recordingError || cameraError) && (
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
              ⚠️ {recordingError || cameraError}
            </div>
          )}

          <Button
            variant="coral"
            size="lg"
            onClick={async () => {
              // 1. Start AI Camera & Mic Proctoring
              const proctorOk = await startProctoring();
              if (!proctorOk) return;

              // 2. Start Screen Recording
              const screenOk = await startRecording();
              if (screenOk) {
                setHasStartedRecording(true);
              } else {
                stopProctoring();
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
            Start AI Proctoring &amp; Screen Recording to Begin Exam
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

      {/* Real-time AI Proctor Warning Banner */}
      {activeAlert && (
        <div style={{
          background: activeAlert.level === 'danger' ? 'var(--coral-light)' : 'var(--amber-light)',
          color: activeAlert.level === 'danger' ? 'var(--coral)' : 'var(--amber)',
          border: `2px solid ${activeAlert.level === 'danger' ? 'var(--coral)' : 'var(--amber)'}`,
          padding: '12px 18px',
          borderRadius: '10px',
          marginBottom: '16px',
          fontSize: '14px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 16px rgba(240, 83, 62, 0.25)',
          animation: 'pulse 1.5s infinite',
        }}>
          <span style={{ fontSize: '24px' }}>🚨</span>
          <div style={{ flex: 1 }}>
            <div><strong>PROCTORING INTEGRITY WARNING:</strong> {activeAlert.message}</div>
            <div style={{ fontSize: '11.5px', fontWeight: '400', opacity: 0.9, marginTop: '2px' }}>
              This integrity violation has been logged to your exam attempt audit trail.
            </div>
          </div>
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
              🛡️ <strong>Anti-Cheating &amp; Proctoring:</strong> Continuous screen recording, live AI webcam facial monitoring, microphone audio analysis, and tab switches are monitored in real time.
            </div>
          </div>
        </div>
      </div>

      {/* Floating AI Proctor Camera & Mic PIP Widget */}
      {cameraActive && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '184px',
          borderRadius: '12px',
          overflow: 'hidden',
          background: 'var(--card)',
          border: activeAlert ? '2.5px solid var(--coral)' : '2px solid var(--teal)',
          boxShadow: activeAlert ? '0 8px 24px rgba(240, 83, 62, 0.45)' : '0 8px 24px rgba(0,0,0,0.18)',
          zIndex: 999,
          transition: 'all 0.3s ease',
        }}>
          <div style={{ position: 'relative', width: '100%', height: '128px', background: '#111827' }}>
            <video
              ref={setVideoRef}
              autoPlay
              muted
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)', // Mirrored for natural student webcam preview
              }}
            />
            {/* Status badge overlay */}
            <div style={{
              position: 'absolute',
              top: '6px',
              left: '6px',
              background: activeAlert ? 'rgba(240, 83, 62, 0.9)' : 'rgba(13, 148, 136, 0.9)',
              color: '#fff',
              padding: '2px 7px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: '700',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              backdropFilter: 'blur(4px)',
            }}>
              <span style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#fff',
                animation: activeAlert ? 'pulse 0.8s infinite' : 'none',
              }} />
              {activeAlert ? 'ALERT' : 'AI PROCTOR'}
            </div>

            {/* REC indicator */}
            {isWebcamRecording && (
              <div style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                background: 'rgba(0,0,0,0.65)',
                color: '#fff',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '9px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--coral)', display: 'inline-block' }} />
                REC
              </div>
            )}
          </div>

          {/* Audio Level & Status Footer */}
          <div style={{ padding: '7px 9px', background: 'var(--card)', fontSize: '11px', borderTop: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ color: 'var(--ink-soft)', fontSize: '10.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🎙️ Mic: {audioLevel > 48 ? <span style={{ color: 'var(--coral)', fontWeight: '700' }}>NOISE</span> : 'Quiet'}
              </span>
              <span style={{ fontSize: '10px', fontWeight: '600', color: audioLevel > 48 ? 'var(--coral)' : 'var(--ink-muted)' }}>
                {audioLevel}%
              </span>
            </div>
            {/* Real-time sound level bar */}
            <div style={{ width: '100%', height: '4px', background: 'var(--line)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{
                width: `${audioLevel}%`,
                height: '100%',
                background: audioLevel > 48 ? 'var(--coral)' : audioLevel > 28 ? 'var(--amber)' : 'var(--teal)',
                transition: 'width 0.15s ease, background 0.2s',
              }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
