import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { uid } from '../../utils/helpers';
import { loadFaceModels, registerFaceFromImage } from '../../services/faceVerification';

const DEPARTMENTS = [
  'Computer Science',
  'Electronics & Communication',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Information Technology',
  'Administration',
];

const YEARS = ['1', '2', '3', '4'];
const SECTIONS = ['A', 'B', 'C', 'D'];

const DESIGNATIONS_TEACHER = [
  'Professor',
  'Associate Professor',
  'Assistant Professor',
  'Lecturer',
  'Lab Instructor',
];

const DESIGNATIONS_ADMIN = [
  'Principal',
  'Vice Principal',
  'Dean',
  'HOD',
  'Registrar',
  'System Administrator',
];

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <span style={{ color: 'var(--coral)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
      {msg}
    </span>
  );
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ─── Photo Upload Component ───────────────────────────────────────────────────
function StudentPhotoUpload({ photoFile, setPhotoFile, faceStatus, setFaceStatus }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFaceStatus({ state: 'error', msg: 'Please select an image file (JPEG, PNG, etc.).' });
      return;
    }
    setPhotoFile(file);
    // Reset any prior status when a new file is chosen
    setFaceStatus({ state: 'ready', msg: '' });
  };

  // Generate a stable preview URL only while photoFile is set
  const [previewUrl, setPreviewUrl] = useState(null);
  useEffect(() => {
    if (!photoFile) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(photoFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const borderColor =
    faceStatus.state === 'error'   ? 'var(--coral)' :
    faceStatus.state === 'success' ? 'var(--teal)'  : 'var(--line)';

  const bgColor =
    faceStatus.state === 'success' ? 'var(--teal-light)'  :
    faceStatus.state === 'error'   ? 'var(--coral-light)' : 'var(--card)';

  return (
    <div style={{ marginTop: '4px' }}>
      <label style={{
        fontSize: '13px', fontWeight: '600', color: 'var(--ink)',
        display: 'block', marginBottom: '6px',
      }}>
        Student photo{' '}
        <span style={{ fontSize: '11px', color: 'var(--ink-muted)', fontWeight: '400' }}>
          (used for face verification at login — optional)
        </span>
      </label>

      <div style={{
        display: 'flex', gap: '14px', alignItems: 'flex-start',
        padding: '14px',
        border: `2px dashed ${borderColor}`,
        borderRadius: '10px',
        background: bgColor,
        transition: 'all 0.2s ease',
      }}>
        {/* Thumbnail */}
        <div style={{
          width: '72px', height: '72px', borderRadius: '8px', overflow: 'hidden',
          background: 'var(--line)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px',
        }}>
          {previewUrl
            ? <img src={previewUrl} alt="Student preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : '🧑'
          }
        </div>

        {/* Right panel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {faceStatus.state === 'detecting' && (
            <div style={{ fontSize: '12.5px', color: 'var(--teal-deep)', marginBottom: '6px' }}>
              ⏳ Detecting face in photo…
            </div>
          )}
          {faceStatus.state === 'success' && (
            <div style={{ fontSize: '12.5px', color: 'var(--teal-deep)', fontWeight: '600', marginBottom: '6px' }}>
              ✅ Face detected &amp; enrolled — student will skip enroll step at login.
            </div>
          )}
          {faceStatus.state === 'error' && faceStatus.msg && (
            <div style={{ fontSize: '12.5px', color: 'var(--coral)', marginBottom: '6px' }}>
              ⚠️ {faceStatus.msg}
            </div>
          )}
          {faceStatus.state === 'ready' && photoFile && (
            <div style={{ fontSize: '12.5px', color: 'var(--ink-soft)', marginBottom: '6px' }}>
              📸 <strong>{photoFile.name}</strong> — ready to enroll on save.
            </div>
          )}
          {!photoFile && faceStatus.state !== 'error' && (
            <div style={{ fontSize: '12.5px', color: 'var(--ink-muted)', marginBottom: '6px' }}>
              Upload a clear, front-facing portrait. If skipped, the student will capture their face at first login.
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={faceStatus.state === 'detecting'}
              style={{
                padding: '5px 12px', fontSize: '12px', borderRadius: '6px',
                border: '1px solid var(--line)', background: 'var(--card)',
                color: 'var(--ink-soft)', cursor: faceStatus.state === 'detecting' ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {photoFile ? '🔄 Change photo' : '📂 Choose photo'}
            </button>
            {photoFile && faceStatus.state !== 'detecting' && (
              <button
                type="button"
                onClick={() => { setPhotoFile(null); setFaceStatus({ state: 'idle', msg: '' }); }}
                style={{
                  padding: '5px 12px', fontSize: '12px', borderRadius: '6px',
                  border: '1px solid var(--coral-light)', background: 'var(--card)',
                  color: 'var(--coral)', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export function UserFormModal() {
  const { activeModal, modalData, closeModal, users, addUser, editUser } = useApp();

  const isEdit = activeModal === 'editUser';
  const isAdd  = activeModal === 'addUser';

  // Form state
  const [name, setName]                   = useState('');
  const [email, setEmail]                 = useState('');
  const [role, setRole]                   = useState('student');
  const [status, setStatus]               = useState('Active');
  const [password, setPassword]           = useState('');
  const [showPassword, setShowPassword]   = useState(false);
  // Student fields
  const [regNumber, setRegNumber]         = useState('');
  const [department, setDepartment]       = useState('Computer Science');
  const [year, setYear]                   = useState('1');
  const [section, setSection]             = useState('A');
  // Teacher / Admin fields
  const [employeeId, setEmployeeId]       = useState('');
  const [designation, setDesignation]     = useState('');
  // Face photo upload (students only)
  const [photoFile, setPhotoFile]         = useState(null);
  const [faceStatus, setFaceStatus]       = useState({ state: 'idle', msg: '' });
  // state: 'idle' | 'ready' | 'detecting' | 'success' | 'error'

  // Validation errors
  const [errors, setErrors]       = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Populate / reset form when modal opens
  useEffect(() => {
    if (isEdit && modalData) {
      setName(modalData.name || '');
      setEmail(modalData.email || '');
      setRole(modalData.role === 'faculty' ? 'teacher' : (modalData.role || 'student'));
      setStatus(modalData.status || 'Active');
      setPassword('');
      setRegNumber(modalData.registerNumber || modalData.regNumber || '');
      setDepartment(modalData.department || 'Computer Science');
      setYear(modalData.year || '1');
      setSection(modalData.section || 'A');
      setEmployeeId(modalData.employeeId || '');
      setDesignation(modalData.designation || '');
    } else if (isAdd) {
      setName('');
      setEmail('');
      setRole('student');
      setStatus('Active');
      setPassword('');
      setRegNumber('');
      setDepartment('Computer Science');
      setYear('1');
      setSection('A');
      setEmployeeId('');
      setDesignation('');
    }
    setErrors({});
    setPhotoFile(null);
    setFaceStatus({ state: 'idle', msg: '' });
  }, [activeModal, modalData, isEdit, isAdd]);

  if (!isAdd && !isEdit) return null;

  // ── Validation ───────────────────────────────────────────────────────────────
  function validate() {
    const errs     = {};
    const trimName = name.trim();
    const trimEmail = email.trim();
    const trimReg   = regNumber.trim();
    const trimEmp   = employeeId.trim();

    if (!trimName)  errs.name = 'Full name is required.';
    if (!trimEmail) errs.email = 'Email is required.';
    else if (!validateEmail(trimEmail)) errs.email = 'Enter a valid email address.';
    if (!role) errs.role = 'Role is required.';

    if (isAdd) {
      if (!password)          errs.password = 'Password is required.';
      else if (password.length < 6) errs.password = 'Password must be at least 6 characters.';
    } else if (password && password.length < 6) {
      errs.password = 'New password must be at least 6 characters.';
    }

    // Duplicate email check (exclude self when editing)
    const emailTaken = users.some(
      (u) => u.email?.toLowerCase() === trimEmail.toLowerCase() &&
             (u.id !== modalData?.id && u.uid !== modalData?.uid)
    );
    if (trimEmail && !errs.email && emailTaken) errs.email = 'This email is already registered.';

    if (role === 'student') {
      if (!trimReg) errs.regNumber = 'Register number is required for students.';
      else {
        const regTaken = users.some(
          (u) => (u.registerNumber || u.regNumber)?.toLowerCase() === trimReg.toLowerCase() &&
                 (u.id !== modalData?.id && u.uid !== modalData?.uid)
        );
        if (regTaken) errs.regNumber = 'This register number is already in use.';
      }
    }

    if (role === 'teacher' || role === 'faculty' || role === 'admin') {
      if (!trimEmp) errs.employeeId = 'Employee ID is required.';
      else {
        const empTaken = users.some(
          (u) => u.employeeId?.toLowerCase() === trimEmp.toLowerCase() &&
                 (u.id !== modalData?.id && u.uid !== modalData?.uid)
        );
        if (empTaken) errs.employeeId = 'This Employee ID is already in use.';
      }
    }

    return errs;
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      const data = {
        name:       name.trim(),
        email:      email.trim(),
        role:       role === 'faculty' ? 'teacher' : role,
        status,
        department: department.trim(),
      };
      if (password) data.password = password;

      if (role === 'student') {
        data.registerNumber = regNumber.trim();
        data.regNumber      = regNumber.trim();
        data.year           = year;
        data.section        = section;
      } else {
        data.employeeId  = employeeId.trim();
        data.designation = designation.trim();
      }

      if (isEdit && modalData) {
        // ── Editing existing user ───────────────────────────────────────────
        await editUser(modalData.uid || modalData.id, data);

      } else {
        // ── Creating new user ───────────────────────────────────────────────
        //
        // KEY FIX: Generate the ID here so we can enroll the face BEFORE the
        // modal closes (avoids setState-on-unmounted-component warnings and
        // ensures the face descriptor is stored under the correct user ID).
        //
        const preAssignedId = uid('u');

        // If a student photo was uploaded, enroll the face now (modal still open)
        if (role === 'student' && photoFile) {
          setFaceStatus({ state: 'detecting', msg: '' });
          await loadFaceModels();
          const result = await registerFaceFromImage(preAssignedId, photoFile);

          if (!result.ok) {
            // Face enrollment failed — show error in modal, don't create user yet
            setFaceStatus({ state: 'error', msg: result.error });
            setSubmitting(false);
            return;
          }
          setFaceStatus({ state: 'success', msg: '' });
          // Brief pause so admin sees the ✅ before the modal closes
          await new Promise((r) => setTimeout(r, 800));
        }

        // Pass the pre-assigned ID so addUser uses the same ID the face was enrolled under
        await addUser({ ...data, _preAssignedId: preAssignedId });
      }

    } catch (err) {
      setErrors((prev) => ({ ...prev, form: err.message || 'Operation failed. Please try again.' }));
    } finally {
      setSubmitting(false);
    }
  }

  const isTeacher          = role === 'teacher' || role === 'faculty';
  const isAdmin            = role === 'admin';
  const designationOptions = isAdmin ? DESIGNATIONS_ADMIN : DESIGNATIONS_TEACHER;
  const isBusy             = submitting || faceStatus.state === 'detecting';

  return (
    <Modal isOpen={true} onClose={closeModal} title={isEdit ? 'Edit user profile' : 'Add new user'}>
      <form onSubmit={handleSubmit} noValidate>
        {errors.form && (
          <div style={{
            padding: '10px 14px', background: 'var(--coral-light)', color: 'var(--coral)',
            borderRadius: '8px', marginBottom: '16px', fontSize: '13px',
          }}>
            {errors.form}
          </div>
        )}

        {/* ── Common Fields ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div className="field">
            <label>Full name <span style={{ color: 'var(--coral)' }}>*</span></label>
            <input
              type="text"
              placeholder="e.g. Dr. Priya Nair"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })); }}
            />
            <FieldError msg={errors.name} />
          </div>

          <div className="field">
            <label>Email <span style={{ color: 'var(--coral)' }}>*</span></label>
            <input
              type="email"
              placeholder="user@verity.edu"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: '' })); }}
            />
            <FieldError msg={errors.email} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div className="field">
            <label>Role <span style={{ color: 'var(--coral)' }}>*</span></label>
            <select value={role} onChange={(e) => { setRole(e.target.value); setErrors({}); }}>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
            <FieldError msg={errors.role} />
          </div>

          <div className="field">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Active">Active</option>
              <option value="Disabled">Disabled</option>
            </select>
          </div>
        </div>

        {/* ── Password ── */}
        <div className="field">
          <label>
            {isAdd ? 'Password' : 'Change password (optional)'}
            {isAdd && <span style={{ color: 'var(--coral)' }}> *</span>}
            <span style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--ink-muted)', fontWeight: '400' }}>
              (min 6 characters; Supabase authentication will be enabled in a later stage)
            </span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder={isAdd ? 'Enter password' : 'Leave empty to keep current password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: '' })); }}
              style={{ paddingRight: '40px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              style={{
                position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--ink-soft)', padding: '0', lineHeight: 1,
              }}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          <FieldError msg={errors.password} />
        </div>

        {/* ── Student Fields ── */}
        {role === 'student' && (
          <>
            <div style={{ margin: '4px 0 12px', padding: '8px 12px', background: 'var(--indigo-light)', borderRadius: '8px', fontSize: '12.5px', color: 'var(--ink-soft)' }}>
              🎓 Student account details
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <div className="field">
                <label>Register number <span style={{ color: 'var(--coral)' }}>*</span></label>
                <input
                  type="text"
                  placeholder="e.g. REG-2026-001"
                  value={regNumber}
                  onChange={(e) => { setRegNumber(e.target.value); setErrors((p) => ({ ...p, regNumber: '' })); }}
                />
                <FieldError msg={errors.regNumber} />
              </div>

              <div className="field">
                <label>Department</label>
                <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <div className="field">
                <label>Year</label>
                <select value={year} onChange={(e) => setYear(e.target.value)}>
                  {YEARS.map((y) => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Section</label>
                <select value={section} onChange={(e) => setSection(e.target.value)}>
                  {SECTIONS.map((s) => <option key={s} value={s}>Section {s}</option>)}
                </select>
              </div>
            </div>

            {/* ── Photo upload for face verification ── */}
            <div className="field">
              <StudentPhotoUpload
                photoFile={photoFile}
                setPhotoFile={setPhotoFile}
                faceStatus={faceStatus}
                setFaceStatus={setFaceStatus}
              />
            </div>
          </>
        )}

        {/* ── Teacher / Admin Fields ── */}
        {(isTeacher || isAdmin) && (
          <>
            <div style={{ margin: '4px 0 12px', padding: '8px 12px', background: 'var(--indigo-light)', borderRadius: '8px', fontSize: '12.5px', color: 'var(--ink-soft)' }}>
              {isAdmin ? '🛡️ Administrator account details' : '👨‍🏫 Teacher account details'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <div className="field">
                <label>
                  {isAdmin ? 'Admin / Employee ID' : 'Employee ID'} <span style={{ color: 'var(--coral)' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. EMP-101"
                  value={employeeId}
                  onChange={(e) => { setEmployeeId(e.target.value); setErrors((p) => ({ ...p, employeeId: '' })); }}
                />
                <FieldError msg={errors.employeeId} />
              </div>

              <div className="field">
                <label>Department</label>
                <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Designation</label>
              <select value={designation} onChange={(e) => setDesignation(e.target.value)}>
                <option value="">— Select designation —</option>
                {designationOptions.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </>
        )}

        {/* ── Actions ── */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: '10px',
          marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--line)',
        }}>
          <Button variant="outline" size="sm" onClick={closeModal} type="button" disabled={isBusy}>
            Cancel
          </Button>
          <Button variant="teal" size="sm" type="submit" disabled={isBusy}>
            {faceStatus.state === 'detecting'
              ? '⏳ Enrolling face…'
              : submitting
              ? 'Saving…'
              : isEdit
              ? 'Save changes'
              : 'Create user'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
