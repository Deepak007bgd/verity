/**
 * FaceEnrollModal — shown to students who haven't registered a face yet.
 * They must capture their face before they can log in.
 */
import React, { useState, useEffect } from 'react';
import { useFaceVerification } from '../../hooks/useFaceVerification';

export function FaceEnrollModal({ userId, userName, onEnrolled, onCancel }) {
  const {
    videoRef,
    modelsReady,
    cameraActive,
    cameraError,
    startCamera,
    stopCamera,
    enroll,
  } = useFaceVerification(userId);

  const [status, setStatus] = useState('idle'); // idle | capturing | success | error
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(null);

  // Auto-start camera when models are ready
  useEffect(() => {
    if (modelsReady) startCamera();
    return () => stopCamera();
  }, [modelsReady]); // eslint-disable-line

  const handleCapture = async () => {
    setStatus('capturing');
    setMessage('');
    // 3-second countdown for user to position face
    for (let i = 3; i >= 1; i--) {
      setCountdown(i);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setCountdown(null);

    const result = await enroll();
    if (result.ok) {
      setStatus('success');
      setMessage('Face registered successfully! You can now log in using face verification.');
      setTimeout(() => {
        stopCamera();
        onEnrolled();
      }, 1800);
    } else {
      setStatus('error');
      setMessage(result.error || 'Could not detect a face. Please try again.');
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>📸</div>
          <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--ink)' }}>Register Your Face</h2>
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--ink-soft)' }}>
            Hi <strong>{userName}</strong>, this is a one-time setup. Your face is stored securely in your browser.
          </p>
        </div>

        {/* Loading state */}
        {!modelsReady && (
          <div style={infoBox('#f0fdfb', 'var(--teal-deep)')}>
            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
            &nbsp; Loading face detection models… please wait.
          </div>
        )}

        {/* Camera error */}
        {cameraError && (
          <div style={infoBox('var(--coral-light)', 'var(--coral)')}>
            ❌ {cameraError}
          </div>
        )}

        {/* Video feed */}
        <div style={videoWrapStyle}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={videoStyle}
          />
          {/* Overlay face guide */}
          <div style={faceGuideStyle} />
          {/* Countdown overlay */}
          {countdown !== null && (
            <div style={countdownStyle}>{countdown}</div>
          )}
          {/* Success overlay */}
          {status === 'success' && (
            <div style={{ ...countdownStyle, background: 'rgba(14,186,155,0.8)', fontSize: '40px' }}>✓</div>
          )}
        </div>

        {/* Status message */}
        {message && (
          <div style={infoBox(
            status === 'success' ? 'var(--teal-light)' : 'var(--coral-light)',
            status === 'success' ? 'var(--teal-deep)' : 'var(--coral)'
          )}>
            {status === 'success' ? '✅' : '⚠️'} {message}
          </div>
        )}

        {/* Instructions */}
        {status === 'idle' && cameraActive && (
          <ul style={{ fontSize: '12.5px', color: 'var(--ink-soft)', margin: '12px 0', paddingLeft: '18px' }}>
            <li>Position your face inside the oval guide</li>
            <li>Ensure good lighting on your face</li>
            <li>Remove glasses if possible for better accuracy</li>
            <li>Look directly at the camera and stay still</li>
          </ul>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button
            className="btn btn-outline"
            style={{ flex: 1 }}
            onClick={() => { stopCamera(); onCancel(); }}
            disabled={status === 'capturing' || status === 'success'}
          >
            Cancel
          </button>
          <button
            className="btn btn-teal"
            style={{ flex: 2 }}
            onClick={handleCapture}
            disabled={!modelsReady || !cameraActive || status === 'capturing' || status === 'success'}
          >
            {status === 'capturing' ? `Capturing in ${countdown ?? '…'}` : '📸 Capture & Register Face'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const overlayStyle = {
  position: 'fixed', inset: 0, zIndex: 9999,
  background: 'rgba(0,0,0,0.65)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '20px',
};

const cardStyle = {
  background: 'var(--card)',
  borderRadius: '16px',
  padding: '28px',
  width: '100%',
  maxWidth: '460px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
};

const videoWrapStyle = {
  position: 'relative',
  width: '100%',
  aspectRatio: '4/3',
  background: '#000',
  borderRadius: '12px',
  overflow: 'hidden',
  marginBottom: '14px',
};

const videoStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  transform: 'scaleX(-1)', // Mirror effect
};

const faceGuideStyle = {
  position: 'absolute',
  top: '50%', left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '55%', height: '75%',
  border: '3px dashed rgba(14,186,155,0.7)',
  borderRadius: '50%',
  pointerEvents: 'none',
};

const countdownStyle = {
  position: 'absolute', inset: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(0,0,0,0.5)',
  color: '#fff',
  fontSize: '64px',
  fontWeight: '800',
  borderRadius: '12px',
};

const infoBox = (bg, color) => ({
  background: bg,
  color,
  borderRadius: '8px',
  padding: '10px 14px',
  fontSize: '13px',
  marginBottom: '12px',
  lineHeight: '1.5',
});
