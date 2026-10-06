import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { PageHead } from '../../components/layout/PageHead';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { hasRegisteredFace } from '../../services/faceVerification';


const ROLE_META = {
  admin:   { label: 'Admin',   variant: 'coral',  icon: '🛡️' },
  teacher: { label: 'Teacher', variant: 'indigo', icon: '👨‍🏫' },
  faculty: { label: 'Teacher', variant: 'indigo', icon: '👨‍🏫' },
  student: { label: 'Student', variant: 'teal',   icon: '🎓' },
};

function Avatar({ name }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div style={{
      width: '36px', height: '36px', borderRadius: '50%',
      background: 'var(--indigo-light)', color: 'var(--indigo)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '13px', fontWeight: '700', flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function FilterPill({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '5px 14px', borderRadius: '100px', border: '1.5px solid',
        borderColor: active ? 'var(--teal)' : 'var(--line)',
        background: active ? 'var(--teal-light)' : 'var(--card)',
        color: active ? 'var(--teal-deep)' : 'var(--ink-soft)',
        fontSize: '13px', fontWeight: active ? '600' : '400',
        cursor: 'pointer', transition: 'all 0.15s ease', whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

export function UsersView() {
  const { users, openModal, toggleUserStatus, currentUser } = useApp();

  const [search, setSearch]           = useState('');
  const [roleFilter, setRoleFilter]   = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  // Map of userId → boolean: whether the student has a face enrolled in IndexedDB
  const [faceEnrolled, setFaceEnrolled] = useState({});

  // Check face enrollment status for all students whenever the user list changes
  useEffect(() => {
    const students = users.filter((u) => u.role === 'student');
    if (students.length === 0) return;

    let active = true;
    Promise.all(
      students.map(async (u) => {
        const enrolled = await hasRegisteredFace(u.id || u.uid).catch(() => false);
        return [u.id || u.uid, enrolled];
      })
    ).then((results) => {
      if (!active) return;
      setFaceEnrolled(Object.fromEntries(results));
    });

    return () => { active = false; };
  }, [users]);

  // ── Derived counts ──────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const c = { total: users.length, admin: 0, teacher: 0, student: 0, active: 0, disabled: 0 };
    users.forEach((u) => {
      const r = u.role === 'faculty' ? 'teacher' : u.role;
      if (c[r] !== undefined) c[r]++;
      if (u.status === 'Active') c.active++;
      else c.disabled++;
    });
    return c;
  }, [users]);

  // ── Filtered list ───────────────────────────────────────────────────────────
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const uRole = u.role === 'faculty' ? 'teacher' : u.role;
      if (roleFilter !== 'all' && uRole !== roleFilter) return false;
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (q) {
        const hay = [u.name, u.email, u.registerNumber, u.regNumber, u.employeeId, u.department]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [users, roleFilter, statusFilter, search]);

  const summaryCards = [
    { label: 'Total users',  value: counts.total,    accent: undefined },
    { label: 'Admins',       value: counts.admin,    accent: 'var(--coral)',     role: 'admin' },
    { label: 'Teachers',     value: counts.teacher,  accent: 'var(--indigo)',    role: 'teacher' },
    { label: 'Students',     value: counts.student,  accent: 'var(--teal-deep)', role: 'student' },
    { label: 'Active',       value: counts.active,   accent: 'var(--teal-deep)', status: 'Active' },
    { label: 'Disabled',     value: counts.disabled, accent: counts.disabled > 0 ? 'var(--amber)' : undefined, status: 'Disabled' },
  ];

  function handleCardClick(card) {
    if (card.role) {
      setRoleFilter((prev) => (prev === card.role ? 'all' : card.role));
      setStatusFilter('all');
    } else if (card.status) {
      setStatusFilter((prev) => (prev === card.status ? 'all' : card.status));
      setRoleFilter('all');
    } else {
      setRoleFilter('all');
      setStatusFilter('all');
    }
  }

  return (
    <div>
      <PageHead
        title="User management"
        subtitle={`${counts.total} account${counts.total !== 1 ? 's' : ''} · ${counts.active} active`}
        action={
          <Button variant="teal" onClick={() => openModal('addUser')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add user
          </Button>
        }
      />

      {/* ── Summary cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', marginBottom: '24px' }}>
        {summaryCards.map((card) => {
          const isActive =
            (card.role && roleFilter === card.role) ||
            (card.status && statusFilter === card.status) ||
            (!card.role && !card.status && roleFilter === 'all' && statusFilter === 'all');
          return (
            <div
              key={card.label}
              className="card"
              onClick={() => handleCardClick(card)}
              style={{
                cursor: 'pointer',
                textAlign: 'center',
                padding: '16px 10px',
                borderColor: isActive ? 'var(--teal)' : 'var(--card-border)',
                background: isActive ? 'var(--teal-light)' : 'var(--card)',
                transition: 'all 0.15s ease',
                userSelect: 'none',
              }}
            >
              <div style={{
                fontSize: '24px', fontWeight: '700',
                fontFamily: 'Space Grotesk, sans-serif',
                color: card.accent || 'var(--ink)',
              }}>
                {card.value}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--ink-soft)', fontWeight: '500', marginTop: '3px' }}>
                {card.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Search + filters ── */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
        {/* Search box */}
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <svg
            width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="var(--ink-muted)" strokeWidth="2"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, email, reg no., employee ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', width: '100%' }}
          />
        </div>

        {/* Role filters */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <FilterPill label={`All roles (${counts.total})`} active={roleFilter === 'all'} onClick={() => setRoleFilter('all')} />
          <FilterPill label={`Admin (${counts.admin})`} active={roleFilter === 'admin'} onClick={() => setRoleFilter(roleFilter === 'admin' ? 'all' : 'admin')} />
          <FilterPill label={`Teacher (${counts.teacher})`} active={roleFilter === 'teacher'} onClick={() => setRoleFilter(roleFilter === 'teacher' ? 'all' : 'teacher')} />
          <FilterPill label={`Student (${counts.student})`} active={roleFilter === 'student'} onClick={() => setRoleFilter(roleFilter === 'student' ? 'all' : 'student')} />
        </div>

        {/* Status filters */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <FilterPill label="Active" active={statusFilter === 'Active'} onClick={() => setStatusFilter(statusFilter === 'Active' ? 'all' : 'Active')} />
          <FilterPill label={counts.disabled > 0 ? `Disabled (${counts.disabled})` : 'Disabled'} active={statusFilter === 'Disabled'} onClick={() => setStatusFilter(statusFilter === 'Disabled' ? 'all' : 'Disabled')} />
        </div>
      </div>

      {/* ── User table ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {visible.length === 0 ? (
          <div className="empty" style={{ padding: '36px 16px' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--ink-muted)" strokeWidth="1.5" style={{ marginBottom: '10px' }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <div>No users match your search or filters.</div>
            <div style={{ fontSize: '13px', color: 'var(--ink-muted)', marginTop: '6px' }}>
              Try clearing filters or adding a new user.
            </div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Contact / ID</th>
                <th>Role</th>
                <th>Details</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((u) => {
                const meta = ROLE_META[u.role] || ROLE_META.student;
                const isSelf = currentUser?.id === u.id;
                const isDisabled = u.status === 'Disabled';
                return (
                  <tr key={u.id} style={{ opacity: isDisabled ? 0.7 : 1 }}>
                    {/* Name + avatar */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Avatar name={u.name} />
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '14px' }}>
                            {u.name}
                            {isSelf && (
                              <span style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--teal-deep)', fontWeight: '600', background: 'var(--teal-light)', padding: '1px 7px', borderRadius: '100px' }}>
                                You
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '1px' }}>
                            Since {u.createdAt || '—'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
                      <div>{u.email || '—'}</div>
                      {(u.registerNumber || u.regNumber) && (
                        <div style={{ fontSize: '12px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
                          {u.registerNumber || u.regNumber}
                        </div>
                      )}
                      {u.employeeId && (
                        <div style={{ fontSize: '12px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
                          {u.employeeId}
                        </div>
                      )}
                    </td>

                    {/* Role badge */}
                    <td>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </td>

                    {/* Role-specific details */}
                    <td style={{ fontSize: '12.5px', color: 'var(--ink-soft)' }}>
                      {u.department && <div>{u.department}</div>}
                      {u.designation && <div>{u.designation}</div>}
                      {u.year && u.section && <div>Year {u.year} · Sec {u.section}</div>}
                    </td>

                    {/* Status badge + face enrollment status for students */}
                    <td>
                      <Badge variant={isDisabled ? 'amber' : 'teal'}>
                        {u.status || 'Active'}
                      </Badge>
                      {u.role === 'student' && (
                        <div style={{ marginTop: '4px' }}>
                          {faceEnrolled[u.id || u.uid]
                            ? (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '3px',
                                fontSize: '11px', fontWeight: '600',
                                color: 'var(--teal-deep)',
                                background: 'var(--teal-light)',
                                padding: '2px 7px', borderRadius: '100px',
                              }}>
                                👤 Face enrolled
                              </span>
                            )
                            : (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '3px',
                                fontSize: '11px', fontWeight: '600',
                                color: 'var(--amber)',
                                background: '#fffbeb',
                                padding: '2px 7px', borderRadius: '100px',
                              }}>
                                ⚠ No face
                              </span>
                            )
                          }
                        </div>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => openModal('editUser', u)}
                          title="Edit user"
                          style={{
                            padding: '5px 12px', fontSize: '12.5px', borderRadius: '8px',
                            border: '1px solid var(--line)', background: 'var(--card)',
                            color: 'var(--ink-soft)', cursor: 'pointer',
                            transition: 'all 0.15s ease', fontFamily: 'inherit',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--teal)'; e.currentTarget.style.color = 'var(--teal-deep)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--ink-soft)'; }}
                        >
                          Edit
                        </button>

                        {/* Enable / Disable — can't disable yourself */}
                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() => toggleUserStatus(u.id)}
                            title={isDisabled ? 'Enable account' : 'Disable account'}
                            style={{
                              padding: '5px 12px', fontSize: '12.5px', borderRadius: '8px',
                              border: '1px solid', fontFamily: 'inherit',
                              borderColor: isDisabled ? 'var(--teal)' : 'var(--amber)',
                              background: 'var(--card)',
                              color: isDisabled ? 'var(--teal-deep)' : 'var(--amber)',
                              cursor: 'pointer', transition: 'all 0.15s ease',
                            }}
                          >
                            {isDisabled ? 'Enable' : 'Disable'}
                          </button>
                        )}

                        {/* Delete — can't delete yourself */}
                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() => openModal('deleteUser', u)}
                            title="Delete user"
                            style={{
                              padding: '5px 12px', fontSize: '12.5px', borderRadius: '8px',
                              border: '1px solid var(--coral-light)', background: 'var(--card)',
                              color: 'var(--coral)', cursor: 'pointer', fontFamily: 'inherit',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--coral-light)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--card)'; }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer count */}
      {visible.length > 0 && (
        <div style={{ marginTop: '10px', fontSize: '12.5px', color: 'var(--ink-muted)' }}>
          Showing {visible.length} of {users.length} users
          {(search || roleFilter !== 'all' || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => { setSearch(''); setRoleFilter('all'); setStatusFilter('all'); }}
              style={{ marginLeft: '12px', color: 'var(--teal-deep)', fontSize: '12.5px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
