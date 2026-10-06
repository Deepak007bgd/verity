import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export function CreateAssessmentModal() {
  const { activeModal, closeModal, questions, createAssessment, showToast, users } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [duration, setDuration] = useState(30);
  const [passPercentage, setPassPercentage] = useState(40);
  const [status, setStatus] = useState('Published');
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [assignAll, setAssignAll] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState([]);

  if (activeModal !== 'createAssessment') return null;

  const studentUsers = users.filter((u) => u.role === 'student');

  const handleToggleQuestion = (qid) => {
    setSelectedQuestions((prev) =>
      prev.includes(qid) ? prev.filter((id) => id !== qid) : [...prev, qid]
    );
  };

  const handleToggleStudent = (uid) => {
    setSelectedStudents((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const totalMarks = selectedQuestions.reduce((sum, qid) => {
    const q = questions.find((x) => x.id === qid);
    return sum + (q ? Number(q.marks) || 0 : 0);
  }, 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      showToast('Please enter a test title');
      return;
    }
    if (selectedQuestions.length === 0) {
      showToast('Please select at least one question from the bank');
      return;
    }

    const assigned = assignAll ? studentUsers.map((u) => u.uid || u.id) : selectedStudents;

    createAssessment({
      title: trimmedTitle,
      description: description.trim(),
      questionIds: selectedQuestions,
      duration: parseInt(duration, 10) || 10,
      durationMin: parseInt(duration, 10) || 10,
      totalMarks,
      passCriteria: parseInt(passPercentage, 10) || 40,
      passPercentage: parseInt(passPercentage, 10) || 40,
      status,
      negativeMarking,
      assignedStudents: assigned,
    });
  };

  return (
    <Modal isOpen={true} onClose={closeModal} title="Create new test">
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Test title <span style={{ color: 'var(--coral)' }}>*</span></label>
          <input
            type="text"
            placeholder="e.g. Computer Networks Unit 1 Midterm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label>Description / instructions (optional)</label>
          <textarea
            rows="2"
            placeholder="Instructions for students taking this test..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="field">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ margin: 0 }}>Select questions from question bank <span style={{ color: 'var(--coral)' }}>*</span></label>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--teal-deep)' }}>
              {selectedQuestions.length} selected · Total: {totalMarks} marks
            </span>
          </div>

          <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--line)', borderRadius: '8px', padding: '8px' }}>
            {questions.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--ink-muted)', padding: '12px', textAlign: 'center' }}>
                Question bank is empty. Add questions first!
              </div>
            ) : (
              questions.map((q) => (
                <label key={q.id} className="checkline" style={{ padding: '6px 8px' }}>
                  <input
                    type="checkbox"
                    checked={selectedQuestions.includes(q.id)}
                    onChange={() => handleToggleQuestion(q.id)}
                  />
                  <span style={{ fontSize: '13px', flex: 1 }}>{q.text}</span>
                  <span style={{ color: 'var(--ink-muted)', fontSize: '11px', textTransform: 'capitalize', marginRight: '6px' }}>
                    {q.type}
                  </span>
                  <span style={{ color: 'var(--teal-deep)', fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>
                    {q.marks} mk
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="grid-2">
          <div className="field">
            <label>Duration (minutes)</label>
            <input
              type="number"
              min="1"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Pass percentage (%)</label>
            <input
              type="number"
              min="1"
              max="100"
              value={passPercentage}
              onChange={(e) => setPassPercentage(e.target.value)}
            />
          </div>
        </div>

        <div className="grid-2">
          <div className="field">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Published">Published (visible to students)</option>
              <option value="Draft">Draft (saved, not yet visible)</option>
              <option value="Closed">Closed (no longer accepting attempts)</option>
            </select>
          </div>
          <div className="field">
            <label>Negative marking</label>
            <select
              value={negativeMarking ? 'true' : 'false'}
              onChange={(e) => setNegativeMarking(e.target.value === 'true')}
            >
              <option value="false">Off</option>
              <option value="true">On (25% penalty for wrong answers)</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label>Assign to students</label>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="assignOption"
                checked={assignAll}
                onChange={() => setAssignAll(true)}
              />
              All students ({studentUsers.length})
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="assignOption"
                checked={!assignAll}
                onChange={() => setAssignAll(false)}
              />
              Select specific students
            </label>
          </div>

          {!assignAll && (
            <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--line)', borderRadius: '8px', padding: '6px' }}>
              {studentUsers.map((u) => {
                const uid = u.uid || u.id;
                return (
                  <label key={uid} className="checkline" style={{ padding: '4px 8px' }}>
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(uid)}
                      onChange={() => handleToggleStudent(uid)}
                    />
                    <span style={{ fontSize: '13px' }}>{u.name}</span>
                    <span style={{ marginLeft: 'auto', color: 'var(--ink-muted)', fontSize: '11px' }}>
                      {u.registerNumber || u.regNumber || u.email}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
          <Button variant="outline" size="sm" onClick={closeModal} type="button">
            Cancel
          </Button>
          <Button variant="teal" size="sm" type="submit">
            Save & Publish Test
          </Button>
        </div>
      </form>
    </Modal>
  );
}
