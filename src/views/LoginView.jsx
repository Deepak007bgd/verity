import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { hasRegisteredFace } from '../services/faceVerification';
import { FaceEnrollModal } from '../components/modals/FaceEnrollModal';
import { FaceVerifyModal } from '../components/modals/FaceVerifyModal';

// Stage flow: 'login' → (student) → 'enroll' | 'verify' → 'done'
export function LoginView() {
  const { login } = useApp();
  const { theme, toggleTheme, isDark } = useTheme();

  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [errorMsg, setErrorMsg]       = useState('');

  // Face verification state
  const [stage, setStage]             = useState('login'); // 'login' | 'enroll' | 'verify'
  const [pendingUser, setPendingUser] = useState(null);   // user object after password OK

  // ── Step 1: Password login ─────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim()) { setErrorMsg('Please enter your email address.'); return; }
    if (!password)     { setErrorMsg('Please enter your password.');       return; }

    setLoading(true);
    try {
      // Attempt credential check — returns the authenticated user object
      const user = await login(email.trim(), password, { dryRun: true });

      // Non-student roles skip face verification
      if (!user || user.role !== 'student') {
        await login(email.trim(), password);
        return;
      }

      // Students: check if they have a registered face
      setPendingUser(user);
      const enrolled = await hasRegisteredFace(user.id);
      setStage(enrolled ? 'verify' : 'enroll');
    } catch (err) {
      setErrorMsg(err.message || 'Sign in failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2a: After face enrolled → go to verify ───────────────────────────
  const handleEnrolled = () => setStage('verify');

  // ── Step 2b: After face verified → complete login ─────────────────────────
  const handleVerified = async () => {
    try {
      await login(pendingUser.email, password);
    } catch (err) {
      setErrorMsg('Face verified but login failed. Please try again.');
      setStage('login');
    }
  };

  // ── Face verification failed → reset ──────────────────────────────────────
  const handleFaceFailed = () => {
    setErrorMsg('Face verification failed. Access denied. Please contact your administrator.');
    setStage('login');
    setPendingUser(null);
  };

  // ── Admin/skip bypass ─────────────────────────────────────────────────────
  const handleSkipFace = async () => {
    try {
      await login(pendingUser.email, password);
    } catch (err) {
      setErrorMsg('Login failed. Please try again.');
      setStage('login');
    }
  };

  const handleQuickFill = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMsg('');
  };

  return (
    <div id="login">
      {/* Theme toggle */}
      <div style={{ position: 'absolute', top: '24px', right: '24px' }}>
        <button
          type="button"
          onClick={toggleTheme}
          className="btn btn-outline btn-sm"
          style={{ gap: '6px' }}
          title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
        >
          {isDark ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
          <span style={{ textTransform: 'capitalize' }}>{theme}</span>
        </button>
      </div>

      <div className="login-card">
        <div className="login-brand">
          <div className="logo-box-3d" style={{ display: 'flex' }}>
            <svg viewBox="0 0 32 32" fill="none" style={{ width: '32px', height: '32px' }}>
              <rect width="32" height="32" rx="9" fill="#1B1A4B" />
              <path
                d="M9 16.5L14 21L23 11"
                stroke="#12C6A6"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="brand-3d" style={{ fontSize: '26px' }}>Verity</span>
        </div>
        <div className="login-sub">
          Academic Assessment &amp; Integrity Platform. Sign in with your email and password.
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div style={{
            fontSize: '13px',
            background: 'var(--coral-light)',
            color: 'var(--coral)',
            border: '1px solid var(--coral)',
            padding: '10px 14px',
            borderRadius: '8px',
            marginBottom: '16px',
            lineHeight: '1.4',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label>Email address</label>
            <input
              type="email"
              placeholder="e.g. rao@verity.edu"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrorMsg(''); }}
              autoComplete="email"
              required
            />
          </div>

          <div className="field">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrorMsg(''); }}
                autoComplete="current-password"
                required
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--ink-soft)',
                  padding: 0,
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Face verification badge for students */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: 'var(--teal-deep)',
            background: 'var(--teal-light)',
            borderRadius: '8px',
            padding: '8px 12px',
            marginBottom: '12px',
          }}>
            <span>👤</span>
            <span><strong>Students:</strong> Face verification is required after password login for identity assurance.</span>
          </div>

          <button
            type="submit"
            className="btn btn-teal"
            disabled={loading}
            style={{ width: '100%', marginTop: '4px', padding: '12px' }}
          >
            {loading ? 'Verifying credentials…' : 'Sign in →'}
          </button>
        </form>

        {/* Quick-fill helper for test accounts */}
        <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px dashed var(--line)' }}>
          <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginBottom: '8px', fontWeight: '500' }}>
            Quick fill test accounts:
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="user-chip"
              style={{ fontSize: '12px', padding: '6px 12px' }}
              onClick={() => handleQuickFill('rao@verity.edu', 'admin123')}
            >
              🛡️ Admin (Dr. Rao)
            </button>
            <button
              type="button"
              className="user-chip"
              style={{ fontSize: '12px', padding: '6px 12px' }}
              onClick={() => handleQuickFill('iyer@verity.edu', 'faculty123')}
            >
              👨‍🏫 Teacher (Prof. Iyer)
            </button>
            <button
              type="button"
              className="user-chip"
              style={{ fontSize: '12px', padding: '6px 12px' }}
              onClick={() => handleQuickFill('ananya@student.verity.edu', 'student123')}
            >
              🎓 Student (Ananya)
            </button>
          </div>
        </div>
      </div>

      <div className="demo-note">
        Role-based routing for Admin, Teacher, and Student accounts.
      </div>

      {/* ── Face Enrollment Modal (first-time student) ── */}
      {stage === 'enroll' && pendingUser && (
        <FaceEnrollModal
          userId={pendingUser.id}
          userName={pendingUser.name}
          onEnrolled={handleEnrolled}
          onCancel={() => { setStage('login'); setPendingUser(null); }}
        />
      )}

      {/* ── Face Verification Modal (returning student) ── */}
      {stage === 'verify' && pendingUser && (
        <FaceVerifyModal
          userId={pendingUser.id}
          userName={pendingUser.name}
          onVerified={handleVerified}
          onFailed={handleFaceFailed}
          onSkip={pendingUser.role !== 'student' ? handleSkipFace : undefined}
        />
      )}
    </div>
  );
}
