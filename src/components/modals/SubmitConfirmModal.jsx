import React from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export function SubmitConfirmModal() {
  const { activeModal, modalData, closeModal, submitExam } = useApp();

  if (activeModal !== 'submitConfirm') return null;

  const handleConfirm = () => {
    if (modalData && typeof modalData.onConfirm === 'function') {
      modalData.onConfirm();
    } else {
      submitExam();
    }
  };

  return (
    <Modal isOpen={true} onClose={closeModal} title="Submit exam?">
      <p style={{ color: 'var(--ink-soft)', fontSize: '14px', marginBottom: '14px' }}>
        Once submitted you can't change your answers. Objective questions are graded immediately; subjective answers go to your faculty's queue.
      </p>
      {modalData?.isRecording && (
        <div style={{
          background: 'var(--paper)',
          border: '1px solid var(--line)',
          borderRadius: '8px',
          padding: '10px 12px',
          marginBottom: '18px',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--teal-deep)',
        }}>
          <span>📹</span>
          <span>Your proctored screen recording will automatically stop and attach to this submission.</span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <Button variant="outline" size="sm" onClick={closeModal}>
          Keep working
        </Button>
        <Button variant="indigo" size="sm" onClick={handleConfirm}>
          Submit exam
        </Button>
      </div>
    </Modal>
  );
}
