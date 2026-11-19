import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Download,
  Printer,
  ExternalLink,
  ShieldCheck,
  Calendar,
  BookOpen,
  User,
  Sparkles,
  RefreshCw,
  QrCode,
  FileCheck,
  Clock
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { Certificate, CertificateEligibility, CertificateVerificationResult } from '../types/certificate';
import { Course } from '../types/course';
import { User as AuthUser } from '../types/auth';

interface CertificatesViewProps {
  currentUser: AuthUser | null;
  courses?: Course[];
}

export const CertificatesView: React.FC<CertificatesViewProps> = ({ currentUser, courses: initialCourses }) => {
  const [courses, setCourses] = useState<Course[]>(initialCourses || []);
  const [activeTab, setActiveTab] = useState<'my_certificates' | 'eligibility' | 'verify' | 'manage'>('my_certificates');
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Eligibility state
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [eligibilityData, setEligibilityData] = useState<CertificateEligibility | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState<boolean>(false);
  const [claiming, setClaiming] = useState<boolean>(false);

  useEffect(() => {
    if (!initialCourses || initialCourses.length === 0) {
      apiRequest<{ data: Course[] }>('/courses')
        .then(res => {
          setCourses(res.data);
          if (res.data.length > 0 && !selectedCourseId) {
            setSelectedCourseId(res.data[0].id);
          }
        })
        .catch(() => {});
    } else if (initialCourses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(initialCourses[0].id);
    }
  }, [initialCourses]);

  // Verification state
  const [verifyCode, setVerifyCode] = useState<string>('ONI-2026-CS101-HONORS');
  const [verifyResult, setVerifyResult] = useState<CertificateVerificationResult | null>(null);
  const [verifying, setVerifying] = useState<boolean>(false);

  // Issue manual state (admin/teacher)
  const [issueStudentId, setIssueStudentId] = useState<string>('');
  const [issueCourseId, setIssueCourseId] = useState<string>(courses[0]?.id || '');
  const [issueForce, setIssueForce] = useState<boolean>(false);
  const [revokeReason, setRevokeReason] = useState<string>('');
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const isStaff = currentUser?.roles?.some(r =>
    ['teacher', 'dept_admin', 'college_admin', 'super_admin'].includes(r.name)
  );

  useEffect(() => {
    if (activeTab === 'my_certificates') {
      loadMyCertificates();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'eligibility' && selectedCourseId) {
      checkCourseEligibility(selectedCourseId);
    }
  }, [activeTab, selectedCourseId]);

  const loadMyCertificates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ data: Certificate[] }>('/my-certificates');
      setCertificates(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load your certificates');
    } finally {
      setLoading(false);
    }
  };

  const checkCourseEligibility = async (courseId: string) => {
    setEligibilityLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ data: CertificateEligibility }>(`/courses/${courseId}/certificate/eligibility`);
      setEligibilityData(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to check eligibility');
    } finally {
      setEligibilityLoading(false);
    }
  };

  const handleClaimCertificate = async () => {
    if (!selectedCourseId) return;
    setClaiming(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await apiRequest<{ message: string; data: Certificate }>(`/courses/${selectedCourseId}/certificate/claim`, {
        method: 'POST',
      });
      setSuccessMsg(res.message);
      setSelectedCertificate(res.data);
      checkCourseEligibility(selectedCourseId);
      loadMyCertificates();
    } catch (err: any) {
      setError(err.message || 'Unable to claim certificate. Requirements not met.');
    } finally {
      setClaiming(false);
    }
  };

  const handleVerify = async (codeToVerify?: string) => {
    const code = codeToVerify || verifyCode;
    if (!code.trim()) return;
    setVerifying(true);
    setError(null);
    setVerifyResult(null);
    try {
      const res = await apiRequest<CertificateVerificationResult>(`/certificates/verify/${encodeURIComponent(code.trim())}`);
      setVerifyResult(res);
    } catch (err: any) {
      setVerifyResult({
        valid: false,
        message: err.message || 'Certificate record not found in university ledger.',
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleRevoke = async (certId: string) => {
    if (!revokeReason.trim()) {
      alert('Please provide an official audit reason for revoking this certificate.');
      return;
    }
    setError(null);
    try {
      await apiRequest(`/certificates/${certId}/revoke`, {
        method: 'POST',
        body: JSON.stringify({ reason: revokeReason }),
      });
      setSuccessMsg('Certificate revoked and invalidation recorded in public registry.');
      setRevokingId(null);
      setRevokeReason('');
      loadMyCertificates();
    } catch (err: any) {
      setError(err.message || 'Failed to revoke certificate');
    }
  };

  return (
    <div className="certificates-container">
      {/* Header Banner */}
      <div className="section-header">
        <div>
          <span className="badge badge-accent">Epic 9 &bull; Academic Credentialing</span>
          <h1 className="section-title">Certificates &amp; Degree Verification</h1>
          <p className="section-subtitle">
            Tamper-proof digital certificates, institutional eligibility audits (100% syllabus + 75% attendance + passing exams), and instant QR verification.
          </p>
        </div>
        <div className="header-actions">
          <button
            onClick={() => handleVerify('ONI-2026-CS101-HONORS')}
            className="btn btn-secondary"
            title="Check public sample verification"
          >
            <ShieldCheck size={18} />
            <span>Verify Demo Code</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-nav">
        <button
          className={`tab-btn ${activeTab === 'my_certificates' ? 'active' : ''}`}
          onClick={() => setActiveTab('my_certificates')}
        >
          <Award size={18} />
          <span>My Earned Certificates ({certificates.length})</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'eligibility' ? 'active' : ''}`}
          onClick={() => setActiveTab('eligibility')}
        >
          <Sparkles size={18} />
          <span>Course Eligibility &amp; Claim</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'verify' ? 'active' : ''}`}
          onClick={() => setActiveTab('verify')}
        >
          <QrCode size={18} />
          <span>Public Registry Verification</span>
        </button>

        {isStaff && (
          <button
            className={`tab-btn ${activeTab === 'manage' ? 'active' : ''}`}
            onClick={() => setActiveTab('manage')}
          >
            <FileCheck size={18} />
            <span>Staff Issuance &amp; Audit</span>
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* TAB 1: MY CERTIFICATES */}
      {activeTab === 'my_certificates' && (
        <div>
          {loading ? (
            <div className="empty-state">
              <RefreshCw className="animate-spin" size={32} />
              <p>Loading credentials from institutional blockchain ledger...</p>
            </div>
          ) : certificates.length === 0 ? (
            <div className="empty-state card">
              <Award size={48} className="text-muted" />
              <h3>No Certificates Awarded Yet</h3>
              <p>Complete all course lessons, maintain ≥75% attendance, and pass your course examinations to claim your verified certificate.</p>
              <button
                className="btn btn-primary"
                onClick={() => setActiveTab('eligibility')}
                style={{ marginTop: '1rem' }}
              >
                <Sparkles size={18} />
                <span>Check Course Eligibility</span>
              </button>
            </div>
          ) : (
            <div className="certificate-cards-grid">
              {certificates.map((cert) => (
                <div key={cert.id} className="card certificate-item-card">
                  <div className="certificate-item-top">
                    <div className="cert-crest-mini">
                      <Award size={24} color="#b45309" />
                    </div>
                    <div className="cert-status-badge">
                      {cert.is_revoked ? (
                        <span className="badge badge-danger">Revoked</span>
                      ) : (
                        <span className="badge badge-success">
                          <ShieldCheck size={14} style={{ marginRight: 4 }} />
                          Verified
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="cert-card-title">{cert.title}</h3>
                  <p className="cert-card-course">
                    <strong>{cert.course?.code}</strong>: {cert.course?.title}
                  </p>

                  <div className="cert-stats-row">
                    <div className="cert-stat">
                      <span className="cert-stat-label">Grade / Honors</span>
                      <span className="cert-stat-val text-accent">{cert.grade || 'Pass'}</span>
                    </div>
                    {cert.attendance_percentage !== null && (
                      <div className="cert-stat">
                        <span className="cert-stat-label">Attendance</span>
                        <span className="cert-stat-val">{cert.attendance_percentage}%</span>
                      </div>
                    )}
                    {cert.final_score !== null && (
                      <div className="cert-stat">
                        <span className="cert-stat-label">Exam Average</span>
                        <span className="cert-stat-val">{cert.final_score}%</span>
                      </div>
                    )}
                  </div>

                  <div className="cert-meta-footer">
                    <span className="cert-code">ID: {cert.certificate_code}</span>
                    <span className="cert-date">
                      {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString() : ''}
                    </span>
                  </div>

                  <div className="cert-card-actions">
                    <button
                      className="btn btn-primary btn-sm btn-block"
                      onClick={() => setSelectedCertificate(cert)}
                    >
                      <Award size={16} />
                      <span>View &amp; Print Credential</span>
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        setVerifyCode(cert.certificate_code);
                        setActiveTab('verify');
                        handleVerify(cert.certificate_code);
                      }}
                      title="Verify in public registry"
                    >
                      <QrCode size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COURSE ELIGIBILITY & CLAIM */}
      {activeTab === 'eligibility' && (
        <div className="eligibility-workspace">
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="course-select" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                Select Enrolled Course to Audit:
              </label>
              <select
                id="course-select"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="form-control"
                style={{ padding: '0.75rem', fontSize: '1rem' }}
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} &mdash; {c.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {eligibilityLoading ? (
            <div className="empty-state">
              <RefreshCw className="animate-spin" size={32} />
              <p>Auditing lessons progress, attendance records, and exam evaluations...</p>
            </div>
          ) : eligibilityData ? (
            <div className="card eligibility-results-card">
              <div className="eligibility-status-banner">
                <div className="status-indicator-badge">
                  {eligibilityData.eligible ? (
                    <div className="indicator-pill success">
                      <CheckCircle size={28} />
                      <div>
                        <h4>Eligible for Official Certification!</h4>
                        <p>All academic prerequisites, syllabus lessons, and attendance standards have been fulfilled.</p>
                      </div>
                    </div>
                  ) : eligibilityData.existing_certificate ? (
                    <div className="indicator-pill info">
                      <Award size={28} />
                      <div>
                        <h4>Certificate Already Issued</h4>
                        <p>You have already earned this certificate ({eligibilityData.existing_certificate.certificate_code}).</p>
                      </div>
                    </div>
                  ) : (
                    <div className="indicator-pill warning">
                      <AlertTriangle size={28} />
                      <div>
                        <h4>Prerequisites Incomplete</h4>
                        <p>Review the compliance checklist below to meet the requirements for graduation and certification.</p>
                      </div>
                    </div>
                  )}
                </div>

                {eligibilityData.eligible && (
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={handleClaimCertificate}
                    disabled={claiming}
                  >
                    {claiming ? (
                      <>
                        <RefreshCw className="animate-spin" size={20} />
                        <span>Generating Credential...</span>
                      </>
                    ) : (
                      <>
                        <Award size={20} />
                        <span>Claim &amp; Issue My Certificate</span>
                      </>
                    )}
                  </button>
                )}

                {eligibilityData.existing_certificate && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => setSelectedCertificate(eligibilityData.existing_certificate!)}
                  >
                    <Award size={18} />
                    <span>View Issued Diploma</span>
                  </button>
                )}
              </div>

              {/* Requirements Audit Grid */}
              <div className="requirements-audit-grid">
                {/* 1. Lessons Syllabus */}
                <div className={`audit-tile ${eligibilityData.lessons.passed ? 'passed' : 'pending'}`}>
                  <div className="audit-tile-header">
                    <BookOpen size={20} />
                    <h4>1. Course Syllabus</h4>
                    {eligibilityData.lessons.passed ? (
                      <CheckCircle size={18} className="icon-pass" />
                    ) : (
                      <XCircle size={18} className="icon-fail" />
                    )}
                  </div>
                  <div className="audit-progress-container">
                    <div className="audit-progress-bar">
                      <div
                        className="audit-progress-fill"
                        style={{ width: `${eligibilityData.lessons.percentage}%` }}
                      />
                    </div>
                    <div className="audit-progress-meta">
                      <span>{eligibilityData.lessons.completed} / {eligibilityData.lessons.total} Lessons Completed</span>
                      <strong>{eligibilityData.lessons.percentage}% (100% Req.)</strong>
                    </div>
                  </div>
                </div>

                {/* 2. Attendance Compliance */}
                <div className={`audit-tile ${eligibilityData.attendance.passed ? 'passed' : 'pending'}`}>
                  <div className="audit-tile-header">
                    <Clock size={20} />
                    <h4>2. Minimum Attendance</h4>
                    {eligibilityData.attendance.passed ? (
                      <CheckCircle size={18} className="icon-pass" />
                    ) : (
                      <XCircle size={18} className="icon-fail" />
                    )}
                  </div>
                  <div className="audit-progress-container">
                    <div className="audit-progress-bar">
                      <div
                        className={`audit-progress-fill ${eligibilityData.attendance.has_shortage ? 'bg-danger' : 'bg-success'}`}
                        style={{ width: `${Math.min(100, eligibilityData.attendance.percentage)}%` }}
                      />
                    </div>
                    <div className="audit-progress-meta">
                      <span>{eligibilityData.attendance.total_sessions} Class Sessions Tracked</span>
                      <strong>
                        {eligibilityData.attendance.percentage}% (≥75% Quota)
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 3. Examination Status */}
                <div className={`audit-tile ${eligibilityData.exams.passed_all ? 'passed' : 'pending'}`}>
                  <div className="audit-tile-header">
                    <Award size={20} />
                    <h4>3. Course Examinations</h4>
                    {eligibilityData.exams.passed_all ? (
                      <CheckCircle size={18} className="icon-pass" />
                    ) : (
                      <XCircle size={18} className="icon-fail" />
                    )}
                  </div>
                  <div className="audit-progress-container">
                    <div className="audit-exam-details">
                      <div>
                        <span>Required Exams Passed:</span>
                        <strong>{eligibilityData.exams.passed} / {eligibilityData.exams.total}</strong>
                      </div>
                      {eligibilityData.exams.average_score !== null && (
                        <div>
                          <span>Evaluation Average:</span>
                          <strong>{eligibilityData.exams.average_score}%</strong>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {eligibilityData.reasons.length > 0 && !eligibilityData.eligible && (
                <div className="eligibility-reasons-box">
                  <h5>Missing Criteria Checklist:</h5>
                  <ul>
                    {eligibilityData.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* TAB 3: PUBLIC VERIFICATION REGISTRY */}
      {activeTab === 'verify' && (
        <div className="verify-workspace">
          <div className="card verify-search-card">
            <h3 style={{ marginBottom: '0.5rem' }}>Public Credential Verification Portal</h3>
            <p className="text-muted" style={{ marginBottom: '1.25rem' }}>
              Universities, employers, and accreditation bodies can verify credentials against the ONI academic register.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerify();
              }}
              className="verify-search-form"
            >
              <div className="search-input-wrap">
                <Search size={20} className="search-icon" />
                <input
                  type="text"
                  placeholder="Enter Certificate Verification Code (e.g. ONI-2026-CS101-HONORS)"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  className="form-control"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={verifying}>
                {verifying ? <RefreshCw className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                <span>Verify Credential</span>
              </button>
            </form>
          </div>

          {verifyResult && (
            <div className={`card verify-result-card ${verifyResult.valid ? 'verified-valid' : 'verified-invalid'}`}>
              <div className="verify-badge-header">
                {verifyResult.valid ? (
                  <div className="verified-seal">
                    <CheckCircle size={48} color="#15803d" />
                    <div>
                      <span className="badge badge-success">AUTHENTIC &amp; ACCREDITED</span>
                      <h2>Certificate Officially Validated</h2>
                      <p>This academic credential was officially conferred by ONI Institute of Technology.</p>
                    </div>
                  </div>
                ) : (
                  <div className="verified-seal">
                    <XCircle size={48} color="#b91c1c" />
                    <div>
                      <span className="badge badge-danger">
                        {verifyResult.is_revoked ? 'REVOKED CREDENTIAL' : 'INVALID RECORD'}
                      </span>
                      <h2>Verification Failed</h2>
                      <p>
                        {verifyResult.is_revoked
                          ? `This certificate was revoked on ${verifyResult.revoked_at}. Reason: ${verifyResult.revocation_reason}`
                          : verifyResult.message || 'No matching record found in the university database.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {verifyResult.student_name && (
                <div className="verify-details-grid">
                  <div className="verify-detail-item">
                    <span className="label">Conferred To</span>
                    <span className="value">{verifyResult.student_name}</span>
                  </div>
                  <div className="verify-detail-item">
                    <span className="label">Course Completed</span>
                    <span className="value">{verifyResult.course_code}: {verifyResult.course_title}</span>
                  </div>
                  <div className="verify-detail-item">
                    <span className="label">Award Date</span>
                    <span className="value">{verifyResult.issued_at}</span>
                  </div>
                  <div className="verify-detail-item">
                    <span className="label">Honor / Grade</span>
                    <span className="value text-accent">{verifyResult.grade || 'Pass'}</span>
                  </div>
                  <div className="verify-detail-item">
                    <span className="label">Verification ID</span>
                    <span className="value code-val">{verifyResult.certificate_code}</span>
                  </div>
                  <div className="verify-detail-item">
                    <span className="label">Issuing Authority</span>
                    <span className="value">{verifyResult.institution_name}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: STAFF ISSUANCE & AUDIT */}
      {activeTab === 'manage' && isStaff && (
        <div className="manage-workspace card">
          <h3>Staff Certificate Issuance &amp; Audit</h3>
          <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
            Authorized faculty and deans may issue honor certificates or record administrative revocations.
          </p>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!issueStudentId.trim()) {
                alert('Please enter a valid student user UUID');
                return;
              }
              try {
                await apiRequest('/certificates/issue', {
                  method: 'POST',
                  body: JSON.stringify({
                    student_id: issueStudentId,
                    course_id: issueCourseId,
                    force: issueForce,
                  }),
                });
                setSuccessMsg('Certificate issued successfully.');
                setIssueStudentId('');
                loadMyCertificates();
              } catch (err: any) {
                setError(err.message || 'Failed to issue certificate');
              }
            }}
            className="staff-form"
          >
            <div className="form-row">
              <div className="form-group">
                <label>Student UUID:</label>
                <input
                  type="text"
                  placeholder="e.g. 01a1f36b-ecdc-7106-a0c4-51d945be466d"
                  value={issueStudentId}
                  onChange={(e) => setIssueStudentId(e.target.value)}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Course:</label>
                <select
                  value={issueCourseId}
                  onChange={(e) => setIssueCourseId(e.target.value)}
                  className="form-control"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} &mdash; {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ margin: '1rem 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={issueForce}
                  onChange={(e) => setIssueForce(e.target.checked)}
                />
                <span>Administrative Override (Bypass prerequisite checks)</span>
              </label>
            </div>

            <button type="submit" className="btn btn-primary">
              <Award size={18} />
              <span>Issue Official Certificate</span>
            </button>
          </form>
        </div>
      )}

      {/* ORNATE DIGITAL DIPLOMA MODAL */}
      {selectedCertificate && (
        <div className="modal-overlay" onClick={() => setSelectedCertificate(null)}>
          <div className="modal-content diploma-modal" onClick={(e) => e.stopPropagation()}>
            <div className="diploma-actions-bar no-print">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => window.print()}
              >
                <Printer size={16} />
                <span>Print / Save PDF</span>
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setSelectedCertificate(null)}
              >
                Close
              </button>
            </div>

            {/* Printable Diploma Frame */}
            <div className="diploma-parchment">
              <div className="diploma-border">
                <div className="diploma-inner">
                  {/* Institutional Header */}
                  <div className="diploma-header">
                    <div className="diploma-seal-icon">
                      <Award size={56} color="#92400e" />
                    </div>
                    <h4 className="institution-name">
                      {selectedCertificate.metadata?.institution_name || 'ONI INSTITUTE OF TECHNOLOGY'}
                    </h4>
                    <p className="institution-sub">BOARD OF GOVERNORS &amp; ACADEMIC SENATE</p>
                  </div>

                  <div className="diploma-title-wrap">
                    <h2 className="diploma-title">Certificate of Academic Achievement</h2>
                    <p className="diploma-clause">This is to certify that</p>
                  </div>

                  {/* Student Name */}
                  <h1 className="diploma-student-name">
                    {selectedCertificate.student?.name || selectedCertificate.metadata?.student_name || 'Aarav Sharma'}
                  </h1>

                  <p className="diploma-body">
                    has successfully fulfilled all curriculum, laboratory practicum, and examination requirements prescribed by the faculty for
                  </p>

                  {/* Course Title */}
                  <h3 className="diploma-course-name">
                    {selectedCertificate.course?.code}: {selectedCertificate.course?.title}
                  </h3>

                  <div className="diploma-award-level">
                    With Distinction &bull; Grade: <strong>{selectedCertificate.grade || 'Pass'}</strong>
                  </div>

                  {/* Footer with QR Code and Signatures */}
                  <div className="diploma-footer">
                    <div className="signature-block">
                      <div className="signature-line" />
                      <p className="signer-name">Dr. Eleanor Vance</p>
                      <p className="signer-title">Academic Dean &amp; Registrar</p>
                    </div>

                    <div className="diploma-qr-block">
                      <div className="qr-box">
                        <QrCode size={64} color="#1e293b" />
                      </div>
                      <span className="cert-id-tag">
                        Code: {selectedCertificate.certificate_code}
                      </span>
                      <span className="verify-tag">Scan or visit /verify</span>
                    </div>

                    <div className="signature-block">
                      <div className="signature-line" />
                      <p className="signer-name">Prof. Alan Turing</p>
                      <p className="signer-title">Course Instructor &amp; Chair</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
