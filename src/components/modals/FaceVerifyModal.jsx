/**
 * FaceVerifyModal — shown to students at login after password check passes.
 * Student must match their registered face to proceed.
 */
import React, { useState, useEffect } from 'react';
import { useFaceVerification } from '../../hooks/useFaceVerification';

export function FaceVerifyModal({ userId, userName, onVerified, onFailed, onSkip }) {
  const {
    videoRef,
    modelsReady,
    cameraActive,
    cameraError,
    checkingRegistration,
    startCamera,
    stopCamera,
    verify,
  } = useFaceVerification(userId);

  const [status, setStatus] = useState('idle'); // idle | scanning | success | failed
  const [message, setMessage] = useState('');
  const [attempts, setAttempts] = useState(0);
  const MAX_ATTEMPTS = 3;

  useEffect(() => {
    if (modelsReady && !checkingRegistration) startCamera();
    return () => stopCamera();
  }, [modelsReady, checkingRegistration]); // eslint-disable-line

  const handleVerify = async () => {
    setStatus('scanning');
    setMessage('');

    const result = await verify();

    if (result.ok) {
      setStatus('success');
      setMessage(`Face verified! Welcome back, ${userName}.`);
      setTimeout(() => {
        stopCamera();
        onVerified();
      }, 1200);
    } else {
      const newCount = attempts + 1;
      setAttempts(newCount);

      if (newCount >= MAX_ATTEMPTS) {
        setStatus('failed');
        setMessage(`Face verification failed after ${MAX_ATTEMPTS} attempts. Access denied.`);
        setTimeout(() => {
          stopCamera();
          onFailed();
        }, 2000);
      } else {
        setStatus('idle');
        setMessage(result.error || `Face not recognized (attempt ${newCount}/${MAX_ATTEMPTS}). Please try again.`);
      }
    }
  };

  if (checkingRegistration) {
    return (
      <div style={overlayStyle}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
          <p style={{ color: 'var(--ink-soft)', fontSize: '14px' }}>Checking face registration…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔍</div>
          <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--ink)' }}>Face Verification</h2>
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--ink-soft)' }}>
            Verifying identity for <strong>{userName}</strong>. Look at the camera.
          </p>
        </div>

        {/* Attempt counter */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '12px' }}>
          {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
            <div
              key={i}
              style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: i < attempts
                  ? 'var(--coral)'
                  : i === attempts && status === 'scanning'
                    ? 'var(--amber)'
                    : 'var(--line)',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>

        {/* Loading */}
        {!modelsReady && (
          <div style={infoBox('#f0fdfb', 'var(--teal-deep)')}>
            ⏳ Loading face detection models…
          </div>
        )}

        {/* Camera error */}
        {cameraError && (
          <div style={infoBox('var(--coral-light)', 'var(--coral)')}>
            ❌ {cameraError}
          </div>
        )}

        {/* Video */}
        <div style={videoWrapStyle}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={videoStyle}
          />
          <div style={faceGuideStyle(status)} />
          {status === 'scanning' && (
            <div style={scanLineStyle} />
          )}
          {status === 'success' && (
            <div style={{ ...statusOverlay, background: 'rgba(14,186,155,0.8)' }}>✓</div>
          )}
          {status === 'failed' && (
            <div style={{ ...statusOverlay, background: 'rgba(220,53,69,0.8)' }}>✗</div>
          )}
        </div>

        {/* Message */}
        {message && (
          <div style={infoBox(
            status === 'success' ? 'var(--teal-light)' : 'var(--coral-light)',
            status === 'success' ? 'var(--teal-deep)' : 'var(--coral)'
          )}>
            {status === 'success' ? '✅' : '⚠️'} {message}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          {onSkip && (
            <button
              className="btn btn-outline"
              style={{ flex: 1, fontSize: '12px' }}
              onClick={() => { stopCamera(); onSkip(); }}
              disabled={status === 'scanning' || status === 'success' || status === 'failed'}
            >
              Skip (Admin)
            </button>
          )}
          <button
            className="btn btn-teal"
            style={{ flex: 2 }}
            onClick={handleVerify}
            disabled={!modelsReady || !cameraActive || status === 'scanning' || status === 'success' || status === 'failed'}
          >
            {status === 'scanning' ? '🔍 Scanning…' : '✓ Verify My Face'}
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--ink-muted)', marginTop: '12px' }}>
          🔒 Face data never leaves your browser — processed locally.
        </p>
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
  maxWidth: '440px',
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
  transform: 'scaleX(-1)',
};

const faceGuideStyle = (status) => ({
  position: 'absolute',
  top: '50%', left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '55%', height: '75%',
  border: `3px solid ${
    status === 'success' ? 'rgba(14,186,155,0.9)' :
    status === 'failed' ? 'rgba(220,53,69,0.9)' :
    status === 'scanning' ? 'rgba(255,193,7,0.9)' :
    'rgba(14,186,155,0.6)'
  }`,
  borderRadius: '50%',
  pointerEvents: 'none',
  transition: 'border-color 0.3s',
});

const scanLineStyle = {
  position: 'absolute',
  left: 0, right: 0,
  height: '3px',
  background: 'rgba(14,186,155,0.7)',
  animation: 'scanLine 1.5s ease-in-out infinite',
};

const statusOverlay = {
  position: 'absolute', inset: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
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
