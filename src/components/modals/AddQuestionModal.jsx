import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export function AddQuestionModal() {
  const { activeModal, closeModal, addQuestion, showToast, assessments } = useApp();

  const [text, setText] = useState('');
  const [type, setType] = useState('mcq');
  const [testId, setTestId] = useState('');
  const [topic, setTopic] = useState('General');
  const [difficulty, setDifficulty] = useState('Medium');
  const [marks, setMarks] = useState(2);
  const [optionsStr, setOptionsStr] = useState('');
  const [correct, setCorrect] = useState('');
  const [tfCorrect, setTfCorrect] = useState('True');

  if (activeModal !== 'addQuestion') return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedText = text.trim();
    if (!trimmedText) {
      showToast('Question text is required');
      return;
    }

    const questionData = {
      text: trimmedText,
      type,
      testId: testId || (assessments[0]?.id || ''),
      topic: topic.trim() || 'General',
      difficulty,
      marks: parseInt(marks, 10) || 1,
    };

    if (type === 'mcq') {
      const opts = optionsStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const trimmedCorrect = correct.trim();
      if (opts.length < 2) {
        showToast('MCQ requires at least 2 comma-separated options');
        return;
      }
      if (!trimmedCorrect) {
        showToast('Specify which option is the correct answer');
        return;
      }
      questionData.options = opts;
      questionData.correct = trimmedCorrect;
    } else if (type === 'true_false') {
      questionData.options = ['True', 'False'];
      questionData.correct = tfCorrect;
    } else if (type === 'numerical') {
      const trimmedCorrect = correct.trim();
      if (!trimmedCorrect) {
        showToast('Add the correct numeric answer');
        return;
      }
      questionData.correct = trimmedCorrect;
    } else if (type === 'short_answer' || type === 'subjective') {
      questionData.options = [];
      questionData.correct = '';
    }

    addQuestion(questionData);
  };

  return (
    <Modal isOpen={true} onClose={closeModal} title="Add question to bank">
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Question text <span style={{ color: 'var(--coral)' }}>*</span></label>
          <textarea
            rows="3"
            placeholder="Type your question here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
          />
        </div>

        <div className="grid-2">
          <div className="field">
            <label>Question type</label>
            <select value={type} onChange={(e) => { setType(e.target.value); setCorrect(''); }}>
              <option value="mcq">Multiple Choice (MCQ)</option>
              <option value="true_false">True / False</option>
              <option value="short_answer">Short Answer (manual grading)</option>
              <option value="numerical">Numerical</option>
            </select>
          </div>
          <div className="field">
            <label>Topic / subject</label>
            <input
              type="text"
              placeholder="e.g. Transport Layer, Algorithms"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
        </div>

        <div className="grid-2">
          <div className="field">
            <label>Difficulty level</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
          <div className="field">
            <label>Marks</label>
            <input
              type="number"
              min="1"
              value={marks}
              onChange={(e) => setMarks(e.target.value)}
            />
          </div>
        </div>

        {/* MCQ Options */}
        {type === 'mcq' && (
          <div>
            <div className="field">
              <label>Options (comma-separated) <span style={{ color: 'var(--coral)' }}>*</span></label>
              <input
                type="text"
                placeholder="Option A, Option B, Option C, Option D"
                value={optionsStr}
                onChange={(e) => setOptionsStr(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Correct answer (must match one option exactly) <span style={{ color: 'var(--coral)' }}>*</span></label>
              <input
                type="text"
                placeholder="e.g. Option B"
                value={correct}
                onChange={(e) => setCorrect(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* True / False */}
        {type === 'true_false' && (
          <div className="field">
            <label>Correct answer <span style={{ color: 'var(--coral)' }}>*</span></label>
            <div style={{ display: 'flex', gap: '24px', padding: '6px 0' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                <input
                  type="radio"
                  name="tf"
                  value="True"
                  checked={tfCorrect === 'True'}
                  onChange={() => setTfCorrect('True')}
                />
                True
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                <input
                  type="radio"
                  name="tf"
                  value="False"
                  checked={tfCorrect === 'False'}
                  onChange={() => setTfCorrect('False')}
                />
                False
              </label>
            </div>
          </div>
        )}

        {/* Short Answer */}
        {(type === 'short_answer' || type === 'subjective') && (
          <div style={{ padding: '10px 14px', background: 'var(--indigo-light)', borderRadius: '8px', fontSize: '12.5px', color: 'var(--ink-soft)', marginBottom: '14px' }}>
            ℹ️ <strong>Short Answer Question:</strong> Students type free-form text. Automatically sent to the Teacher Evaluation Queue after submission.
          </div>
        )}

        {/* Numerical */}
        {type === 'numerical' && (
          <div className="field">
            <label>Correct numeric answer <span style={{ color: 'var(--coral)' }}>*</span></label>
            <input
              type="text"
              placeholder="e.g. 42"
              value={correct}
              onChange={(e) => setCorrect(e.target.value)}
            />
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
          <Button variant="outline" size="sm" onClick={closeModal} type="button">
            Cancel
          </Button>
          <Button variant="teal" size="sm" type="submit">
            Add to Question Bank
          </Button>
        </div>
      </form>
    </Modal>
  );
}
