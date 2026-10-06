import React from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export function DeleteUserModal() {
  const { activeModal, modalData, closeModal, deleteUser } = useApp();

  if (activeModal !== 'deleteUser' || !modalData) return null;

  const user = modalData;

  const roleLabel =
    user.role === 'admin' ? 'Administrator' :
    user.role === 'faculty' ? 'Faculty / Staff' :
    'Student';

  const handleDelete = () => {
    deleteUser(user.id);
  };

  return (
    <Modal isOpen={true} onClose={closeModal} title="Delete user?">
      {/* Warning banner */}
      <div style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
        padding: '14px 16px',
        background: 'var(--coral-light)',
        border: '1px solid var(--coral)',
        borderRadius: '10px',
        marginBottom: '20px',
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--coral)" strokeWidth="2" style={{ flexShrink: 0, marginTop: '1px' }}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div>
          <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--coral)', marginBottom: '4px' }}>
            This action cannot be undone
          </div>
          <div style={{ fontSize: '13px', color: 'var(--ink-soft)', lineHeight: '1.5' }}>
            Deleting a user removes their account from VERITY. Their assessment attempts,
            exam results, and evaluation records are <strong>preserved</strong> (linked by user ID).
          </div>
        </div>
      </div>

      {/* User identity card */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '14px 16px',
        background: 'var(--paper)',
        border: '1px solid var(--line)',
        borderRadius: '10px',
        marginBottom: '20px',
      }}>
        {/* Avatar */}
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: 'var(--indigo-light)',
          color: 'var(--indigo)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '15px',
          fontWeight: '700',
          flexShrink: 0,
        }}>
          {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: '600', fontSize: '15px' }}>{user.name}</div>
          <div style={{ fontSize: '13px', color: 'var(--ink-soft)', marginTop: '2px' }}>
            {user.email} · {roleLabel}
            {user.regNumber && ` · ${user.regNumber}`}
            {user.employeeId && ` · ${user.employeeId}`}
          </div>
        </div>
      </div>

      {/* Tip: prefer disabling */}
      <div style={{ fontSize: '13px', color: 'var(--ink-soft)', marginBottom: '20px', padding: '10px 12px', background: 'var(--indigo-light)', borderRadius: '8px' }}>
        <strong>Tip:</strong> If you only want to prevent login, consider <em>disabling</em> the account instead. The user's data stays fully intact and can be re-enabled later.
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '4px' }}>
        <Button variant="outline" size="sm" onClick={closeModal} type="button">
          Cancel
        </Button>
        <Button
          size="sm"
          type="button"
          onClick={handleDelete}
          style={{ background: 'var(--coral)', color: '#fff', border: 'none' }}
        >
          Delete "{user.name}"
        </Button>
      </div>
    </Modal>
  );
}
