import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PageHead } from '../../components/layout/PageHead';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

const DIFFICULTY_VARIANT = { Easy: 'teal', Medium: 'amber', Hard: 'coral' };
const TYPE_LABEL = { mcq: 'MCQ', numerical: 'Numerical', subjective: 'Essay' };

export function QuestionBankView() {
  const { questions, openModal } = useApp();
  const [filter, setFilter] = useState('all');

  const topics = ['all', ...Array.from(new Set(questions.map((q) => q.topic)))];
  const visible = filter === 'all' ? questions : questions.filter((q) => q.topic === filter);

  return (
    <div>
      <PageHead
        title="Question bank"
        subtitle={`${questions.length} questions · Computer Networks`}
        action={
          <Button variant="teal" onClick={() => openModal('addQuestion')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add question
          </Button>
        }
      />

      {/* Topic filter pills */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {topics.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilter(t)}
            style={{
              padding: '5px 14px',
              borderRadius: '100px',
              border: '1.5px solid',
              borderColor: filter === t ? 'var(--teal)' : 'var(--line)',
              background: filter === t ? 'var(--teal-light)' : 'var(--card)',
              color: filter === t ? 'var(--teal-deep)' : 'var(--ink-soft)',
              fontSize: '13px',
              fontWeight: filter === t ? '600' : '400',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {t === 'all' ? `All (${questions.length})` : t}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {visible.length === 0 ? (
          <div className="empty">No questions match this filter.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Question</th>
                <th>Type</th>
                <th>Topic</th>
                <th>Difficulty</th>
                <th>Marks</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((q) => (
                <tr key={q.id}>
                  <td style={{ maxWidth: '340px' }}>
                    <div style={{ fontWeight: '500', fontSize: '13.5px', lineHeight: '1.4' }}>
                      {q.text}
                    </div>
                  </td>
                  <td>
                    <Badge variant="gray">{TYPE_LABEL[q.type] || q.type}</Badge>
                  </td>
                  <td style={{ color: 'var(--ink-soft)', fontSize: '13px' }}>{q.topic}</td>
                  <td>
                    <Badge variant={DIFFICULTY_VARIANT[q.difficulty] || 'gray'}>
                      {q.difficulty}
                    </Badge>
                  </td>
                  <td>
                    <span style={{ fontWeight: '600', color: 'var(--ink)' }}>{q.marks}</span>
                    <span style={{ color: 'var(--ink-muted)', fontSize: '12px', marginLeft: '2px' }}>mk</span>
                  </td>
                  <td>
                    <Badge variant="teal">{q.status || 'Active'}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {visible.length > 0 && (
        <div style={{ marginTop: '12px', fontSize: '12.5px', color: 'var(--ink-muted)' }}>
          Showing {visible.length} of {questions.length} questions
        </div>
      )}
    </div>
  );
}
