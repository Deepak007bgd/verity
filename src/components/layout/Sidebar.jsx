import React from 'react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';

const navItems = {
  teacher: [
    { id: 'dashboard', label: 'Overview', icon: 'M4 6h16M4 12h16M4 18h10' },
    { id: 'bank', label: 'Question bank', icon: 'M4 6h16M4 12h16M4 18h10' },
    { id: 'assessments', label: 'Tests', icon: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4z' },
    { id: 'evaluate', label: 'Evaluation queue', icon: 'M5 13l4 4L19 7' },
    { id: 'analytics', label: 'Analytics', icon: 'M4 19h16M8 19V9M12 19V5M16 19v7' },
  ],
  faculty: [
    { id: 'dashboard', label: 'Overview', icon: 'M4 6h16M4 12h16M4 18h10' },
    { id: 'bank', label: 'Question bank', icon: 'M4 6h16M4 12h16M4 18h10' },
    { id: 'assessments', label: 'Tests', icon: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4z' },
    { id: 'evaluate', label: 'Evaluation queue', icon: 'M5 13l4 4L19 7' },
    { id: 'analytics', label: 'Analytics', icon: 'M4 19h16M8 19V9M12 19V5M16 19v7' },
  ],
  student: [
    { id: 'dashboard', label: 'My tests', icon: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4z' },
    { id: 'results', label: 'Results', icon: 'M4 19h16M8 19V9M12 19V5M16 19v7' },
  ],
  admin: [
    { id: 'dashboard', label: 'Overview', icon: 'M4 6h16M4 12h16M4 18h10' },
    { id: 'users', label: 'Users', icon: 'M9 8a3 3 0 100-6 3 3 0 000 6zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6' },
    { id: 'audit', label: 'Audit log', icon: 'M12 2L4 6v5c0 5 3.5 9.4 8 11 4.5-1.6 8-6 8-11V6l-8-4z' },
  ],
};

export function Sidebar() {
  const { currentUser, view, nav, resetDemo, logout } = useApp();
  const { theme, toggleTheme, isDark } = useTheme();

  if (!currentUser) return null;

  const userRole = currentUser.role === 'faculty' ? 'teacher' : currentUser.role;
  const items = navItems[userRole] || [];

  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <div className="logo-box-3d" style={{ display: 'flex' }}>
          <svg viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="9" fill="#12C6A6" />
            <path
              d="M9 16.5L14 21L23 11"
              stroke="#0F1233"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span className="brand-3d">Verity</span>
      </div>

      <div className="sb-user">
        <div className="name">{currentUser.name}</div>
        <div className="role">
          {currentUser.role === 'faculty' || currentUser.role === 'teacher' ? 'Teacher' : currentUser.role}
        </div>
      </div>

      <nav className="sb-nav">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            className={view === it.id ? 'active' : ''}
            onClick={() => nav(it.id)}
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d={it.icon}
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {it.label}
          </button>
        ))}
      </nav>

      <div className="sb-bottom">
        <button
          type="button"
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            {isDark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
            <span>Theme</span>
          </span>
          <span className="theme-pill">{theme}</span>
        </button>

        <button type="button" onClick={resetDemo}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Reset demo
        </button>
        <button type="button" onClick={logout}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Log out
        </button>
      </div>
    </aside>
  );
}
