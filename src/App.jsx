import React from 'react';
import { useApp } from './context/AppContext';
import { AppShell } from './components/layout/AppShell';
import { Toast } from './components/common/Toast';
import { AddQuestionModal } from './components/modals/AddQuestionModal';
import { CreateAssessmentModal } from './components/modals/CreateAssessmentModal';
import { SubmitConfirmModal } from './components/modals/SubmitConfirmModal';
import { UserFormModal } from './components/modals/UserFormModal';
import { DeleteUserModal } from './components/modals/DeleteUserModal';

import { LoginView } from './views/LoginView';
import { FacultyDashboard } from './views/faculty/FacultyDashboard';
import { QuestionBankView } from './views/faculty/QuestionBankView';
import { AssessmentsView } from './views/faculty/AssessmentsView';
import { EvaluationQueueView } from './views/faculty/EvaluationQueueView';
import { AnalyticsView } from './views/faculty/AnalyticsView';

import { StudentDashboard } from './views/student/StudentDashboard';
import { ExamView } from './views/student/ExamView';
import { ResultsView } from './views/student/ResultsView';

import { AdminDashboard } from './views/admin/AdminDashboard';
import { UsersView } from './views/admin/UsersView';
import { AuditLogView } from './views/admin/AuditLogView';

export function App() {
  const { currentUser, view, toastMessage } = useApp();

  if (!currentUser) {
    return (
      <>
        <LoginView />
        <Toast message={toastMessage} />
      </>
    );
  }

  const renderContent = () => {
    if (currentUser.role === 'faculty' || currentUser.role === 'teacher') {
      if (view === 'bank') return <QuestionBankView />;
      if (view === 'assessments') return <AssessmentsView />;
      if (view === 'evaluate') return <EvaluationQueueView />;
      if (view === 'analytics') return <AnalyticsView />;
      return <FacultyDashboard />;
    }

    if (currentUser.role === 'student') {
      if (view === 'exam') return <ExamView />;
      if (view === 'results') return <ResultsView />;
      return <StudentDashboard />;
    }

    if (currentUser.role === 'admin') {
      if (view === 'users') return <UsersView />;
      if (view === 'audit') return <AuditLogView />;
      return <AdminDashboard />;
    }

    return null;
  };

  return (
    <>
      <AppShell>{renderContent()}</AppShell>
      {/* Assessment modals */}
      <AddQuestionModal />
      <CreateAssessmentModal />
      <SubmitConfirmModal />
      {/* User management modals */}
      <UserFormModal />
      <DeleteUserModal />
      <Toast message={toastMessage} />
    </>
  );
}
