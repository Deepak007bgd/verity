export function seedAssessments() {
  return [
    {
      id: 'a1',
      title: 'CN Midterm — Unit 3',
      subject: 'Computer Networks',
      questionIds: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'],
      durationMin: 8,
      negativeMarking: false,
      assignedStudents: ['u-stu1', 'u-stu2', 'u-stu3'],
      status: 'Scheduled',
      createdBy: 'u-fac1',
    },
  ];
}
