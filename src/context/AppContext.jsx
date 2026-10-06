import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { seedUsers } from '../data/seedUsers';
import { seedQuestions } from '../data/seedQuestions';
import { seedAssessments } from '../data/seedAssessments';
import { uid, totalMarks } from '../utils/helpers';
import { loadDemoUsers, saveDemoUsers } from '../services/localDemoService';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { persistRecording, getAllPersistedRecordings } from '../services/screenRecordingStorage';

const AppContext = createContext(null);

async function loadSupabaseProfile(authUser) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, status')
    .eq('id', authUser.id)
    .maybeSingle();

  if (error || !data) {
    throw new Error('Your account profile could not be loaded. Contact the administrator.');
  }

  return {
    id: data.id,
    uid: data.id,
    name: data.name,
    email: data.email,
    role: data.role,
    status: data.status,
  };
}

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [users, setUsers] = useState(() => loadDemoUsers(seedUsers));
  const [questions, setQuestions] = useState(seedQuestions);
  const [assessments, setAssessments] = useState(seedAssessments);
  const [attempts, setAttempts] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [view, setView] = useState('dashboard');
  const [examAttemptId, setExamAttemptId] = useState(null);
  const [examIndex, setExamIndex] = useState(0);
  const [activeModal, setActiveModal] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const toastTimerRef = useRef(null);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }, []);

  // --------------------------------------------------------------------------
  // Audit Logging
  // --------------------------------------------------------------------------
  const log = useCallback((action, details, userOverride) => {
    const user = userOverride !== undefined ? userOverride : currentUser;
    const actor = user ? `${user.name} (${user.role})` : 'System';
    const logId = uid('log');
    const newEntry = {
      id: logId,
      time: new Date().toLocaleTimeString(),
      actor,
      action,
      details: details || '',
    };

    setAuditLog((prev) => [newEntry, ...prev]);

  }, [currentUser]);

  // Keep the existing demo user-management experience available until the
  // Supabase feature migrations are connected in a later stage.
  useEffect(() => {
    saveDemoUsers(users);
  }, [users]);

  // Restore persistent screen recordings from IndexedDB across page reloads & sessions
  useEffect(() => {
    let active = true;
    getAllPersistedRecordings().then((recordings) => {
      if (!active || !recordings || recordings.length === 0) return;
      setAttempts((prev) =>
        prev.map((att) => {
          const match = recordings.find((r) => r.attemptId === att.id);
          if (match && match.url) {
            return {
              ...att,
              screenRecordingUrl: att.screenRecordingUrl || match.url,
              screenRecordingDuration: att.screenRecordingDuration !== undefined ? att.screenRecordingDuration : match.duration,
            };
          }
          return att;
        })
      );
    }).catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  // Restore persisted Supabase sessions and keep the existing user state in
  // sync with subsequent authentication changes. Demo mode remains local-only.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthLoading(false);
      return undefined;
    }

    let active = true;

    const applySession = async (session) => {
      if (!session?.user) {
        if (active) setCurrentUser(null);
        return;
      }

      try {
        const profile = await loadSupabaseProfile(session.user);
        if (profile.status !== 'Active') {
          await supabase.auth.signOut();
          if (active) {
            setCurrentUser(null);
            showToast('Your account has been disabled. Contact the administrator.');
          }
          return;
        }

        if (active) {
          setCurrentUser(profile);
          setView('dashboard');
        }
      } catch (_) {
        if (active) {
          setCurrentUser(null);
        }
      }
    };

    const restoreSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!error && data?.session) await applySession(data.session);
      } catch (err) {
        console.warn('Supabase session restore skipped:', err);
      } finally {
        if (active) setAuthLoading(false);
      }
    };

    void restoreSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session).catch(() => {}).finally(() => {
        if (active) setAuthLoading(false);
      });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [showToast]);

  // --------------------------------------------------------------------------
  // Authentication Actions
  // --------------------------------------------------------------------------
  const login = useCallback(async (emailOrId, password = '', opts = {}) => {
    const { dryRun = false } = opts;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailOrId.trim(),
          password,
        });

        if (!error && data?.user) {
          const profile = await loadSupabaseProfile(data.user);
          if (profile.status !== 'Active') {
            await supabase.auth.signOut();
            throw new Error('Your account has been disabled. Contact the administrator.');
          }

          if (dryRun) {
            // Return profile for face-verification check without committing state
            await supabase.auth.signOut();
            return profile;
          }

          setCurrentUser(profile);
          setView('dashboard');
          log('Signed in', '', profile);
          showToast(`Signed in as ${profile.name}`);
          return true;
        }
      } catch (err) {
        if (err.message === 'Your account has been disabled. Contact the administrator.') {
          throw err;
        }
        // Fall back gracefully to local demo accounts if Supabase credentials are not matched in cloud
        console.info('Supabase sign-in not completed, checking demo accounts:', err.message);
      }
    }

    // Intentional local fallback when Supabase is not configured or demo account is used.
    const user = users.find(
      (u) => u.id === emailOrId || u.uid === emailOrId || u.email?.toLowerCase() === emailOrId.toLowerCase()
    );

    if (!user) {
      showToast('User not found.');
      throw new Error('User not found.');
    }

    if (user.status === 'Disabled') {
      const msg = 'Your account has been disabled. Contact the administrator.';
      showToast(msg);
      throw new Error(msg);
    }

    // Validate password in demo mode
    if (user.password && user.password !== password) {
      showToast('Incorrect password.');
      throw new Error('Incorrect password.');
    }

    if (dryRun) {
      // Return user object for face verification without setting app state
      return user;
    }

    setCurrentUser(user);
    setView('dashboard');
    log('Signed in', '', user);
    showToast(`Signed in as ${user.name}`);
    return true;
  }, [users, log, showToast]);

  const logout = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    setExamAttemptId(null);
    setExamIndex(0);
    setView('dashboard');
    showToast('Signed out');
  }, [showToast]);

  const resetDemo = useCallback(() => {
    setCurrentUser(null);
    setUsers(seedUsers);
    saveDemoUsers(seedUsers);
    setQuestions(seedQuestions());
    setAssessments(seedAssessments());
    setAttempts([]);
    setAuditLog([]);
    setView('dashboard');
    setExamAttemptId(null);
    setExamIndex(0);
    setActiveModal(null);
    setModalData(null);
    showToast('Demo data reset');
  }, [showToast]);

  const nav = useCallback((newView) => {
    setView(newView);
  }, []);

  const openModal = useCallback((modalName, data = null) => {
    setActiveModal(modalName);
    setModalData(data);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setModalData(null);
  }, []);

  // --------------------------------------------------------------------------
  // User Management Actions
  // --------------------------------------------------------------------------
  const addUser = useCallback(async (data) => {
    // Allow callers to supply a pre-assigned ID so face enrollment can use the
    // same ID before the modal closes (avoids setState on unmounted component).
    const { _preAssignedId, ...rest } = data;
    const newUid = _preAssignedId || uid('u');

    const userPayload = {
      uid: newUid,
      id: newUid,
      createdAt: new Date().toLocaleDateString(),
      status: 'Active',
      createdBy: currentUser ? `${currentUser.name} (${currentUser.role})` : 'Admin',
      ...rest,
    };

    setUsers((prev) => [...prev, userPayload]);
    log('Created user', `${userPayload.name} (${userPayload.role})`);
    closeModal();
    showToast(`User "${userPayload.name}" created successfully`);
  }, [currentUser, log, closeModal, showToast]);


  const editUser = useCallback(async (id, data) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id || u.uid === id ? { ...u, ...data } : u))
    );

    setCurrentUser((prev) => {
      if (prev && (prev.id === id || prev.uid === id)) return { ...prev, ...data };
      return prev;
    });

    log('Edited user', data.name || id);
    closeModal();
    showToast('User updated');
  }, [log, closeModal, showToast]);

  const toggleUserStatus = useCallback(async (id) => {
    const targetUser = users.find((u) => u.id === id || u.uid === id);
    if (!targetUser) return;

    const nextStatus = targetUser.status === 'Active' ? 'Disabled' : 'Active';

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id || u.uid === id) {
          return { ...u, status: nextStatus };
        }
        return u;
      })
    );

    // If currently logged-in user is disabled, sign them out
    setCurrentUser((prev) => {
      if (prev && (prev.id === id || prev.uid === id)) {
        if (nextStatus === 'Disabled') {
          return null;
        }
        return { ...prev, status: nextStatus };
      }
      return prev;
    });

    log(nextStatus === 'Disabled' ? 'Disabled user' : 'Enabled user', targetUser.name || id);
    showToast(`User ${nextStatus === 'Disabled' ? 'disabled' : 'enabled'}`);
  }, [users, log, showToast]);

  const deleteUser = useCallback(async (id) => {
    const target = users.find((u) => u.id === id || u.uid === id);

    setUsers((prev) => prev.filter((u) => u.id !== id && u.uid !== id));
    log('Deleted user', target ? `${target.name} (${target.role})` : id);
    closeModal();
    showToast(`User "${target?.name || id}" deleted`);
  }, [users, log, closeModal, showToast]);

  // --------------------------------------------------------------------------
  // Test / Assessment Creation (Teacher / Faculty)
  // --------------------------------------------------------------------------
  const createAssessment = useCallback(async (aData) => {
    const newTestId = uid('t');
    const newA = {
      id: newTestId,
      testId: newTestId,
      subject: aData.subject || 'Academic Assessment',
      status: aData.status || 'Published',
      createdBy: currentUser ? currentUser.id || currentUser.uid : 'Teacher',
      createdAt: new Date().toISOString(),
      questionIds: aData.questionIds || [],
      assignedStudents: aData.assignedStudents || [],
      ...aData,
    };

    setAssessments((prev) => [...prev, newA]);
    log('Created test', aData.title);
    closeModal();
    showToast('Test published successfully');
  }, [currentUser, log, closeModal, showToast]);

  const updateAssessment = useCallback(async (testId, aData) => {
    setAssessments((prev) =>
      prev.map((a) => (a.id === testId ? { ...a, ...aData } : a))
    );
    showToast('Test updated');
  }, [showToast]);

  const deleteAssessment = useCallback(async (testId) => {
    setAssessments((prev) => prev.filter((a) => a.id !== testId));
    showToast('Test deleted');
  }, [showToast]);

  // --------------------------------------------------------------------------
  // Questions (MCQ, True/False, Short Answer)
  // --------------------------------------------------------------------------
  const addQuestion = useCallback(async (qData) => {
    const newQId = uid('q');
    const newQ = {
      id: newQId,
      status: 'Published',
      createdBy: currentUser ? currentUser.name : 'Teacher',
      createdAt: new Date().toISOString(),
      ...qData,
    };

    setQuestions((prev) => [...prev, newQ]);
    log('Created question', (qData.text || '').slice(0, 50) + '…');
    closeModal();
    showToast('Question added to bank');
  }, [currentUser, log, closeModal, showToast]);

  const editQuestion = useCallback(async (qid, qData) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === qid ? { ...q, ...qData } : q))
    );
    showToast('Question updated');
  }, [showToast]);

  const deleteQuestion = useCallback(async (qid) => {
    setQuestions((prev) => prev.filter((q) => q.id !== qid));
    showToast('Question deleted');
  }, [showToast]);

  // --------------------------------------------------------------------------
  // Student - Exam / Test Taking & Anti-Cheating
  // --------------------------------------------------------------------------
  const startExam = useCallback(async (assessmentId) => {
    const assessment = assessments.find((a) => a.id === assessmentId);
    if (!assessment || !currentUser) return;

    const studentUid = currentUser.uid || currentUser.id;

    let existingAttempt = attempts.find(
      (a) => (a.assessmentId === assessmentId || a.testId === assessmentId) && a.studentId === studentUid
    );

    if (existingAttempt && existingAttempt.status === 'Disqualified') {
      showToast('You have been disqualified from this test.');
      return;
    }

    if (!existingAttempt) {
      const newAttemptId = uid('att');
      const newAttempt = {
        id: newAttemptId,
        testId: assessmentId,
        assessmentId,
        studentId: studentUid,
        answers: {},
        review: [],
        status: 'In Progress',
        startTime: new Date().toLocaleTimeString(),
        startedAt: new Date().toLocaleTimeString(),
        endTime: null,
        submittedAt: null,
        evaluations: {},
        autoScores: {},
        score: 0,
        totalScore: 0,
        totalMarks: totalMarks(assessment, questions),
        resultPublished: false,
        tabSwitchCount: 0,
        disqualified: false,
        integrityEvents: [],
        remainingSeconds: (assessment.durationMin || assessment.duration || 10) * 60,
      };

      setAttempts((prev) => [...prev, newAttempt]);
      setExamAttemptId(newAttemptId);
      log('Started test attempt', assessment.title);
    } else {
      setExamAttemptId(existingAttempt.id);
    }

    setExamIndex(0);
    setView('exam');
  }, [assessments, currentUser, attempts, questions, log, showToast]);

  const resumeExam = useCallback((attemptId) => {
    setExamAttemptId(attemptId);
    setExamIndex(0);
    setView('exam');
  }, []);

  const answerQuestion = useCallback((qid, val) => {
    if (!examAttemptId) return;
    setAttempts((prev) =>
      prev.map((att) => {
        if (att.id === examAttemptId) {
          const updatedAnswers = { ...att.answers, [qid]: val };
          return { ...att, answers: updatedAnswers };
        }
        return att;
      })
    );
  }, [examAttemptId]);

  const toggleReview = useCallback((qid) => {
    if (!examAttemptId) return;
    setAttempts((prev) =>
      prev.map((att) => {
        if (att.id === examAttemptId) {
          const rev = att.review || [];
          const exists = rev.includes(qid);
          const nextReview = exists ? rev.filter((id) => id !== qid) : [...rev, qid];
          return { ...att, review: nextReview };
        }
        return att;
      })
    );
  }, [examAttemptId]);

  // Anti-cheating Tab Switch Handler (Page Visibility API)
  const recordIntegrityEvent = useCallback((event) => {
    if (!examAttemptId) return;

    setAttempts((prev) =>
      prev.map((att) => {
        if (att.id === examAttemptId && att.status === 'In Progress') {
          const isTabSwitch = event.type === 'tab_switch';
          const newTabCount = (att.tabSwitchCount || 0) + (isTabSwitch ? 1 : 0);
          const updatedEvents = [...(att.integrityEvents || []), event];

          // Disqualification rule: If tabSwitchCount exceeds 3
          if (newTabCount > 3) {
            const disqualifiedUpdate = {
              tabSwitchCount: newTabCount,
              integrityEvents: updatedEvents,
              status: 'Disqualified',
              disqualified: true,
              endTime: new Date().toLocaleTimeString(),
              submittedAt: new Date().toLocaleTimeString(),
              resultPublished: true,
            };

            log('Test Disqualification', `Exceeded tab switch limit (${newTabCount} switches)`);
            setExamAttemptId(null);
            setExamIndex(0);
            setView('dashboard');
            showToast('TEST TERMINATED: You have been disqualified for exceeding 3 tab switches.');

            return { ...att, ...disqualifiedUpdate };
          }

          // Normal increment
          const normalUpdate = {
            tabSwitchCount: newTabCount,
            integrityEvents: updatedEvents,
          };

          if (isTabSwitch) {
            showToast(`Warning: Tab switch detected (${newTabCount}/3 switches used).`);
          }

          return { ...att, ...normalUpdate };
        }
        return att;
      })
    );
  }, [examAttemptId, log, showToast]);

  const setAttemptRemainingSeconds = useCallback((attemptId, updater) => {
    setAttempts((prev) =>
      prev.map((att) => {
        if (att.id === attemptId) {
          const newSeconds = typeof updater === 'function' ? updater(att.remainingSeconds) : updater;
          return { ...att, remainingSeconds: newSeconds };
        }
        return att;
      })
    );
  }, []);

  // --------------------------------------------------------------------------
  // Screen Recording & Test Submission
  // --------------------------------------------------------------------------
  const saveScreenRecording = useCallback((attemptId, recordingData) => {
    if (!attemptId || !recordingData) return;
    const url = recordingData.url || recordingData.recordingUrl;
    const duration = recordingData.duration || recordingData.screenRecordingDuration;
    const blob = recordingData.blob || recordingData.recordedBlob;

    if (blob) {
      persistRecording(attemptId, blob, { duration });
    }

    setAttempts((prev) =>
      prev.map((att) => {
        if (att.id === attemptId) {
          return {
            ...att,
            screenRecordingUrl: url || att.screenRecordingUrl,
            screenRecordingDuration: duration !== undefined ? duration : att.screenRecordingDuration,
          };
        }
        return att;
      })
    );
  }, []);

  const submitExam = useCallback((extraData = null) => {
    if (!examAttemptId) return;
    closeModal();

    let targetAssessmentTitle = '';
    let integrityCount = 0;

    setAttempts((prev) =>
      prev.map((att) => {
        if (att.id === examAttemptId) {
          const assessment = assessments.find((a) => a.id === att.assessmentId || a.id === att.testId);
          targetAssessmentTitle = assessment ? assessment.title : '';
          integrityCount = att.integrityEvents?.length || 0;

          const newAutoScores = { ...(att.autoScores || {}) };

          if (assessment) {
            assessment.questionIds.forEach((qid) => {
              const q = questions.find((x) => x.id === qid);
              if (q) {
                // Auto-evaluate MCQ, True/False, and numerical
                if (q.type === 'mcq' || q.type === 'true_false' || q.type === 'numerical') {
                  const given = (att.answers[qid] || '').toString().trim().toLowerCase();
                  const correct = (q.correct || '').toString().trim().toLowerCase();
                  const isCorrect = given !== '' && given === correct;
                  let score = isCorrect
                    ? q.marks
                    : assessment.negativeMarking
                    ? -Math.round(q.marks * 0.25 * 100) / 100
                    : 0;
                  newAutoScores[qid] = Math.max(score, assessment.negativeMarking ? -q.marks : 0);
                }
              }
            });
          }

          const hasShortAnswer = assessment
            ? assessment.questionIds.some((qid) => {
                const q = questions.find((x) => x.id === qid);
                return q && (q.type === 'subjective' || q.type === 'short_answer');
              })
            : false;

          let total = 0;
          if (assessment) {
            assessment.questionIds.forEach((qid) => {
              const q = questions.find((x) => x.id === qid);
              if (q && (q.type === 'subjective' || q.type === 'short_answer')) {
                total += att.evaluations?.[qid] ? att.evaluations[qid].marks : 0;
              } else {
                total += newAutoScores[qid] || 0;
              }
            });
          }

          const recordingUrl = extraData?.url || extraData?.recordingUrl || extraData?.screenRecordingUrl || att.screenRecordingUrl;
          const recordingDuration = extraData?.duration || extraData?.screenRecordingDuration || att.screenRecordingDuration;
          const recordingBlob = extraData?.blob || extraData?.recordedBlob;

          if (recordingBlob) {
            persistRecording(examAttemptId, recordingBlob, { duration: recordingDuration });
          }

          const submissionUpdate = {
            autoScores: newAutoScores,
            status: hasShortAnswer ? 'Evaluating' : 'Evaluated',
            endTime: new Date().toLocaleTimeString(),
            submittedAt: new Date().toLocaleTimeString(),
            resultPublished: !hasShortAnswer, // auto-publish if purely objective
            score: Math.round(total * 100) / 100,
            totalScore: Math.round(total * 100) / 100,
            ...(recordingUrl ? { screenRecordingUrl: recordingUrl } : {}),
            ...(recordingDuration !== undefined ? { screenRecordingDuration: recordingDuration } : {}),
          };

          return {
            ...att,
            ...submissionUpdate,
          };
        }
        return att;
      })
    );

    log('Submitted test', targetAssessmentTitle + (integrityCount ? ` · ${integrityCount} integrity event(s)` : ''));
    setExamAttemptId(null);
    setExamIndex(0);
    setView('dashboard');
    showToast('Test submitted successfully. Objective answers evaluated.');
  }, [examAttemptId, assessments, questions, closeModal, log, showToast]);

  // --------------------------------------------------------------------------
  // Manual Evaluation (Teacher / Faculty)
  // --------------------------------------------------------------------------
  const saveEvaluation = useCallback(async (attemptId, qid, maxMarks, val, feedback = '') => {
    let isUpdate = false;

    setAttempts((prev) =>
      prev.map((att) => {
        if (att.id === attemptId) {
          isUpdate = !!(att.evaluations && att.evaluations[qid]);
          const newEvals = {
            ...(att.evaluations || {}),
            [qid]: {
              marks: val,
              feedback: feedback || '',
              gradedBy: currentUser ? currentUser.name : 'Teacher',
              gradedAt: new Date().toLocaleTimeString(),
            },
          };

          const assessment = assessments.find((a) => a.id === att.assessmentId || a.id === att.testId);
          let total = 0;
          if (assessment) {
            assessment.questionIds.forEach((qId) => {
              const q = questions.find((x) => x.id === qId);
              if (q && (q.type === 'subjective' || q.type === 'short_answer')) {
                total += newEvals[qId] ? newEvals[qId].marks : 0;
              } else {
                total += att.autoScores?.[qId] || 0;
              }
            });
          }

          const evalUpdate = {
            evaluations: newEvals,
            score: Math.round(total * 100) / 100,
            totalScore: Math.round(total * 100) / 100,
          };

          return { ...att, ...evalUpdate };
        }
        return att;
      })
    );

    log(isUpdate ? 'Updated mark' : 'Graded short answer', `${qid} → ${val}/${maxMarks}`);
  }, [currentUser, assessments, questions, log]);

  const publishResult = useCallback(async (attemptId) => {
    setAttempts((prev) =>
      prev.map((att) => {
        if (att.id === attemptId) {
          const assessment = assessments.find((a) => a.id === att.assessmentId || a.id === att.testId);
          let total = 0;
          if (assessment) {
            assessment.questionIds.forEach((qid) => {
              const q = questions.find((x) => x.id === qid);
              if (q && (q.type === 'subjective' || q.type === 'short_answer')) {
                total += att.evaluations?.[qid] ? att.evaluations[qid].marks : 0;
              } else {
                total += att.autoScores?.[qid] || 0;
              }
            });
          }

          const publishUpdate = {
            resultPublished: true,
            status: 'Evaluated',
            score: Math.round(total * 100) / 100,
            totalScore: Math.round(total * 100) / 100,
          };

          return { ...att, ...publishUpdate };
        }
        return att;
      })
    );

    log('Published result', `attempt ${attemptId}`);
    showToast('Result published to student');
  }, [assessments, questions, log, showToast]);

  const value = {
    currentUser,
    authLoading,
    users,
    questions,
    assessments,
    attempts,
    auditLog,
    view,
    examAttemptId,
    examIndex,
    activeModal,
    modalData,
    toastMessage,
    // Auth
    login,
    logout,
    resetDemo,
    nav,
    openModal,
    closeModal,
    showToast,
    // User management
    addUser,
    editUser,
    toggleUserStatus,
    deleteUser,
    // Question / assessment
    addQuestion,
    editQuestion,
    deleteQuestion,
    createAssessment,
    updateAssessment,
    deleteAssessment,
    // Exam
    startExam,
    resumeExam,
    setExamIndex,
    answerQuestion,
    toggleReview,
    recordIntegrityEvent,
    setAttemptRemainingSeconds,
    saveScreenRecording,
    submitExam,
    saveEvaluation,
    publishResult,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
}
