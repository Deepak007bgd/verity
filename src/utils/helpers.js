export const uid = (p) => p + '-' + Math.random().toString(36).slice(2, 8);

export function totalMarks(assessment, questions) {
  if (!assessment || !assessment.questionIds || !questions) return 0;
  return assessment.questionIds.reduce((s, qid) => {
    const q = questions.find((item) => item.id === qid);
    return s + (q ? q.marks : 0);
  }, 0);
}

export function calculateGrade(pct) {
  if (pct >= 90) return 'A';
  if (pct >= 75) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
}
