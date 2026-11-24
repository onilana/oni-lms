import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Award,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  User as UserIcon,
  X
} from 'lucide-react';
import { apiRequest } from '../api/client';
import type { User } from '../types/auth';

interface StudentProfileModalProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  initialData?: User | null;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  userId,
  isOpen,
  onClose,
  initialData,
}) => {
  const [student, setStudent] = useState<User | null>(initialData || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !userId) {
      if (!initialData) setStudent(null);
      return;
    }

    const fetchStudentProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiRequest<{ data: User }>(`/users/${userId}`);
        setStudent(res.data);
      } catch (err: any) {
        setError(err.message || 'Unable to retrieve student profile records.');
      } finally {
        setLoading(false);
      }
    };

    fetchStudentProfile();
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const profile = student?.student_profile;

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        padding: '16px',
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-content"
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          maxWidth: '780px',
          width: '100%',
          padding: '28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-primary" style={{ textTransform: 'uppercase', fontSize: '11px' }}>
                Official Student Record
              </span>
              {student && (
                <span className={`badge ${student.status === 'active' ? 'badge-success' : 'badge-neutral'}`} style={{ textTransform: 'capitalize' }}>
                  {student.status}
                </span>
              )}
            </div>
            <h2 style={{ margin: '8px 0 2px', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {student ? student.name : 'Loading Profile...'}
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
              Institutional Student Dossier &amp; Certification Profile
            </p>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px' }}
            title="Close"
          >
            <X size={22} />
          </button>
        </div>

        {loading && !student && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={28} className="spinning" style={{ margin: '0 auto 12px' }} />
            <p>Loading institutional profile information...</p>
          </div>
        )}

        {error && (
          <div className="alert alert-danger" style={{ margin: '16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {student && (
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Student Hero Ribbon */}
            <div
              style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #0f766e 100%)',
                borderRadius: '10px',
                padding: '18px 20px',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  fontWeight: 700,
                  border: '2px solid rgba(255, 255, 255, 0.4)',
                }}
              >
                {student.name.substring(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700 }}>
                    {profile?.student_id_number || 'ID Not Assigned'}
                  </span>
                  {profile?.current_semester && (
                    <span className="badge" style={{ background: '#38bdf8', color: '#0f172a', fontWeight: 600 }}>
                      Semester {profile.current_semester}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '4px' }}>
                  <strong>{profile?.programme_name || 'General Programme'}</strong> · {profile?.department_name || 'Academic Division'}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.75, marginTop: '2px' }}>
                  Cohort: {profile?.batch_name || 'Unassigned Batch'}
                </div>
              </div>
            </div>

            {/* Official 9 Profile Details Grid */}
            <div>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                1. Official Personal &amp; Communication Details (For Certification &amp; Records)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
                <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>1. Full Name</span>
                  <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px' }}>{student.name}</strong>
                </div>

                <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>2. Date of Birth</span>
                  <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px' }}>
                    {profile?.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : 'Not Provided'}
                  </strong>
                </div>

                <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>3. Gender</span>
                  <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px', textTransform: 'capitalize' }}>
                    {profile?.gender || 'Not Provided'}
                  </strong>
                </div>

                <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>4. Class Roll No.</span>
                  <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px', color: '#173f73' }}>
                    {profile?.class_roll_no || 'Not Set'}
                  </strong>
                </div>

                <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>5. Phone No.</span>
                  <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px' }}>
                    {profile?.phone || 'Not Provided'}
                  </strong>
                </div>

                <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>6. Enrolled Email</span>
                  <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px', wordBreak: 'break-all' }}>
                    {student.email}
                  </strong>
                </div>

                <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>7. Father's Name</span>
                  <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px' }}>
                    {profile?.father_name || 'Not Provided'}
                  </strong>
                </div>

                <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>8. Mother's Name</span>
                  <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px' }}>
                    {profile?.mother_name || 'Not Provided'}
                  </strong>
                </div>

                <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)', gridColumn: 'span 2' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>9. Permanent / Mailing Address</span>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: profile?.address ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {profile?.address || 'Not Provided'}
                  </p>
                </div>
              </div>
            </div>

            {/* Academic Program & Enrollment Mapping */}
            <div>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                2. Academic Hierarchy &amp; Institutional Mapping
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px' }}>
                <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Department</span>
                  <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px' }}>{profile?.department_name || 'N/A'}</strong>
                  <small style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Code: {profile?.department_code || 'N/A'}</small>
                </div>

                <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Degree Programme</span>
                  <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px' }}>{profile?.programme_name || 'N/A'}</strong>
                  <small style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Code: {profile?.programme_code || 'N/A'}</small>
                </div>

                <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Current Semester</span>
                  <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px' }}>Semester {profile?.current_semester ?? 'N/A'}</strong>
                </div>

                <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Batch / Cohort</span>
                  <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px' }}>{profile?.batch_name || 'General Batch'}</strong>
                </div>

                <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Enrolled Courses</span>
                  <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px', color: '#0f766e' }}>
                    {student.enrolled_courses_count ?? (student as any).enrolled_courses?.length ?? 0} Active Courses
                  </strong>
                </div>

                <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Admission Date</span>
                  <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px' }}>
                    {profile?.admission_date ? new Date(profile.admission_date).toLocaleDateString() : 'Active Registration'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Enrolled Courses List */}
            {((student as any).enrolled_courses && (student as any).enrolled_courses.length > 0) && (
              <div>
                <h4 style={{ margin: '0 0 10px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                  3. Enrolled Courses &amp; Curricula
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(student as any).enrolled_courses.map((course: any) => (
                    <div
                      key={course.id}
                      style={{
                        padding: '10px 14px',
                        background: 'var(--surface-subtle)',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="badge" style={{ background: '#0284c7', color: '#fff', fontSize: '11px' }}>{course.code}</span>
                          <strong>{course.title}</strong>
                        </div>
                        <small style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                          {course.credits} Credits · Department: {course.department?.name || 'Academic Division'}
                        </small>
                      </div>
                      <span className="badge badge-success">Enrolled</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};
