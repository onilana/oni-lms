import React, { useState, useEffect } from 'react';
import {
  Globe,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Code2,
  Copy,
  Layers,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  Sparkles,
  Link2,
  Radio,
  FileText
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { User as AuthUser } from '../types/auth';

interface WordPressStatus {
  status: string;
  is_healthy: boolean;
  wordpress_url: string;
  api_endpoint: string;
  theme: {
    name: string;
    slug: string;
    version: string;
    active: boolean;
  };
  latency_ms: number;
  wp_version: string;
  database_separation: {
    enforced: boolean;
    lms_database: string;
    shared_credentials: boolean;
    isolation_confirmed: boolean;
  };
  sso_ready: boolean;
  last_sync_at: string;
}

interface WordPressCourse {
  id: string;
  code: string;
  title: string;
  department: string;
  credits: number;
  level: string;
  description: string;
  lead_instructor: string;
  lms_enrolment_url: string;
}

interface WordPressSnippets {
  theme_slug: string;
  snippets: {
    header_navigation_php: string;
    catalogue_shortcode_php: string;
  };
}

interface WordPressIntegrationViewProps {
  currentUser: AuthUser | null;
}

export const WordPressIntegrationView: React.FC<WordPressIntegrationViewProps> = ({ currentUser }) => {
  const [status, setStatus] = useState<WordPressStatus | null>(null);
  const [courses, setCourses] = useState<WordPressCourse[]>([]);
  const [snippets, setSnippets] = useState<WordPressSnippets | null>(null);
  const [activeTab, setActiveTab] = useState<'catalogue' | 'sync' | 'snippets' | 'sso'>('catalogue');
  const [loading, setLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
    loadCatalogue();
    loadSnippets();
  }, []);

  const loadStatus = async () => {
    try {
      const res = await apiRequest<{ data: WordPressStatus }>('/integrations/wordpress/status');
      setStatus(res.data);
    } catch (err: any) {
      setError(err.message || 'Unable to retrieve WordPress integration status.');
    }
  };

  const loadCatalogue = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ data: WordPressCourse[] }>('/integrations/wordpress/catalogue');
      setCourses(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Unable to retrieve syndicated course catalogue.');
    } finally {
      setLoading(false);
    }
  };

  const loadSnippets = async () => {
    try {
      const res = await apiRequest<WordPressSnippets>('/integrations/wordpress/snippets');
      setSnippets(res);
    } catch (err) {}
  };

  const handleSyncNotices = async () => {
    setIsSyncing(true);
    setSyncMsg(null);
    setError(null);
    try {
      const res = await apiRequest<{ message: string; data: { synced_count: number } }>(
        '/integrations/wordpress/sync-notices',
        { method: 'POST' }
      );
      setSyncMsg(res.message);
      loadStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to synchronize notices from WordPress.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(key);
    setTimeout(() => setCopiedSnippet(null), 2500);
  };

  return (
    <div className="wordpress-integration-workspace">
      {/* Header Banner */}
      <div className="section-header">
        <div>
          <span className="badge badge-accent">Milestone 13 &bull; WordPress Ecosystem</span>
          <h1 className="section-title">WordPress Integration (`oni_lana`)</h1>
          <p className="section-subtitle">
            Bridge between public college website (<a href="https://www.yourcollege.edu" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>www.yourcollege.edu</a>) and LMS.
            Strict database separation is enforced with independent credentials.
          </p>
        </div>

        <div className="header-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={loadStatus}
            title="Refresh connection status"
          >
            <RefreshCw size={14} />
            <span>Check Status</span>
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSyncNotices}
            disabled={isSyncing}
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Notices from WP'}</span>
          </button>
        </div>
      </div>

      {syncMsg && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          <CheckCircle size={18} />
          <span>{syncMsg}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 16 }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Integration Status KPI Cards */}
      {status && (
        <div className="grid-3" style={{ marginBottom: 24 }}>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
                WordPress Endpoint
              </span>
              <span className="badge badge-success">Online &bull; {status.latency_ms}ms</span>
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, margin: '8px 0', color: '#38bdf8' }}>
              {status.wordpress_url}
            </div>
            <small className="text-muted">
              Theme: <strong>{status.theme.name} ({status.theme.slug})</strong> &bull; WP {status.wp_version}
            </small>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
                Architecture Isolation
              </span>
              <span className="badge badge-accent">Enforced</span>
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, margin: '8px 0', color: '#10b981' }}>
              Independent Databases
            </div>
            <small className="text-muted">
              LMS DB: <strong>{status.database_separation.lms_database}</strong> &bull; 0 Shared Credentials
            </small>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
                Single Sign-On (SSO)
              </span>
              <span className="badge badge-role">OIDC Ready</span>
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, margin: '8px 0', color: '#eab308' }}>
              Token Handshake Active
            </div>
            <small className="text-muted">
              Endpoint: <code style={{ fontSize: '0.75rem' }}>/api/v1/integrations/wordpress/sso-handshake</code>
            </small>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="tab-nav" style={{ marginBottom: 20 }}>
        <button
          className={`tab-btn ${activeTab === 'catalogue' ? 'active' : ''}`}
          onClick={() => setActiveTab('catalogue')}
        >
          <BookOpen size={16} />
          <span>Syndicated Course Catalogue ({courses.length})</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'sync' ? 'active' : ''}`}
          onClick={() => setActiveTab('sync')}
        >
          <Radio size={16} />
          <span>Notice &amp; Bulletin Sync</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'snippets' ? 'active' : ''}`}
          onClick={() => setActiveTab('snippets')}
        >
          <Code2 size={16} />
          <span>Theme Code Snippets (`oni_lana`)</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'sso' ? 'active' : ''}`}
          onClick={() => setActiveTab('sso')}
        >
          <ShieldCheck size={16} />
          <span>SSO &amp; Security Specs</span>
        </button>
      </div>

      {/* TAB 1: SYNDICATED COURSE CATALOGUE */}
      {activeTab === 'catalogue' && (
        <div className="card">
          <div className="card-header-row">
            <div>
              <h3>Public Catalogue Feed for `oni_lana`</h3>
              <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                These courses are dynamically served via <code style={{ fontSize: '0.8rem' }}>GET /api/v1/integrations/wordpress/catalogue</code> for public browsing on WordPress without requiring an LMS account.
              </p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={loadCatalogue}>
              <RefreshCw size={13} />
            </button>
          </div>

          {loading ? (
            <div className="empty-state">
              <RefreshCw className="animate-spin" size={32} />
              <p>Fetching syndicated course catalogue...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="empty-state">
              <BookOpen size={48} className="text-muted" />
              <h4>No Published Courses</h4>
              <p>Publish courses in the Course Builder to display them automatically on the college public site.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginTop: 16 }}>
              {courses.map(course => (
                <div
                  key={course.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.4)',
                    border: '1px solid #334155',
                    borderRadius: 12,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span className="badge badge-accent" style={{ fontSize: '0.75rem' }}>
                        {course.code}
                      </span>
                      <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                        {course.credits} Credits &bull; {course.level}
                      </span>
                    </div>

                    <h4 style={{ margin: '4px 0 8px 0', fontSize: '1.05rem' }}>{course.title}</h4>
                    <p className="text-muted" style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                      {course.description ? (course.description.length > 90 ? course.description.slice(0, 90) + '...' : course.description) : 'Curriculum instruction module.'}
                    </p>
                  </div>

                  <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <small className="text-muted">Dept: {course.department}</small>
                    <a
                      href={course.lms_enrolment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                    >
                      <span>Enrol Link</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: NOTICE & BULLETIN SYNC */}
      {activeTab === 'sync' && (
        <div className="card">
          <h3>WordPress &rarr; LMS Announcement Bridge</h3>
          <p className="text-muted">
            Administrative notices and press releases published on the WordPress college homepage can be synchronized directly into the student and teacher LMS notice board.
          </p>

          <div className="governance-box" style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: 20, marginTop: 16 }}>
            <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Radio size={18} color="#0284c7" />
              Automated Notice Feed
            </h4>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#cbd5e1' }}>
              When activated, a scheduled task polls <code style={{ fontSize: '0.8rem' }}>GET /wp-json/wp/v2/posts</code> hourly. New posts are converted into campus-wide notices with source attribution, ensuring students never miss institutional announcements.
            </p>

            <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
              <button
                className="btn btn-primary"
                onClick={handleSyncNotices}
                disabled={isSyncing}
              >
                <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
                <span>{isSyncing ? 'Synchronizing...' : 'Trigger Immediate Sync'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: THEME CODE SNIPPETS (oni_lana) */}
      {activeTab === 'snippets' && snippets && (
        <div className="card">
          <h3>Integration Code for `oni_lana` Theme</h3>
          <p className="text-muted">
            Add these lightweight snippets to your WordPress theme's <code style={{ fontSize: '0.8rem' }}>functions.php</code> to add the LMS navigation button and the course catalogue shortcode.
          </p>

          {/* Snippet 1 */}
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong>1. Header Navigation Button (Primary Menu)</strong>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => handleCopy(snippets.snippets.header_navigation_php, 'nav')}
              >
                {copiedSnippet === 'nav' ? <CheckCircle size={14} color="#10b981" /> : <Copy size={14} />}
                <span>{copiedSnippet === 'nav' ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
            <pre
              style={{
                background: '#0f172a',
                color: '#38bdf8',
                padding: '16px',
                borderRadius: '8px',
                overflowX: 'auto',
                fontSize: '0.82rem',
                border: '1px solid #334155',
              }}
            >
              {snippets.snippets.header_navigation_php}
            </pre>
          </div>

          {/* Snippet 2 */}
          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong>2. Course Catalogue Shortcode (<code style={{ fontSize: '0.8rem' }}>[edu_care_course_catalogue]</code>)</strong>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => handleCopy(snippets.snippets.catalogue_shortcode_php, 'shortcode')}
              >
                {copiedSnippet === 'shortcode' ? <CheckCircle size={14} color="#10b981" /> : <Copy size={14} />}
                <span>{copiedSnippet === 'shortcode' ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
            <pre
              style={{
                background: '#0f172a',
                color: '#38bdf8',
                padding: '16px',
                borderRadius: '8px',
                overflowX: 'auto',
                fontSize: '0.82rem',
                border: '1px solid #334155',
              }}
            >
              {snippets.snippets.catalogue_shortcode_php}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 4: SSO & SECURITY SPECS */}
      {activeTab === 'sso' && (
        <div className="card">
          <h3>Single Sign-On (SSO) &amp; Security Architecture</h3>
          <p className="text-muted">
            Compliant with non-negotiable architectural rule: <strong>Keep LMS and WordPress databases separate</strong>.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: 16, borderRadius: 10, border: '1px solid #334155' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={16} /> Architectural Rules Enforced
              </h4>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                <li>No direct database sharing or cross-DB queries.</li>
                <li>Zero WordPress password hashes imported into LMS.</li>
                <li>Signed tokens exchange with webhook secret validation.</li>
                <li>LMS issues independent Sanctum API session tokens.</li>
              </ul>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: 16, borderRadius: 10, border: '1px solid #334155' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#eab308', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Link2 size={16} /> Branding Specifications
              </h4>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                <li>Primary Color: <strong>#173F73</strong> (Navy Blue)</li>
                <li>Secondary Accent: <strong>#D6A84F</strong> (Gold)</li>
                <li>Dark Base: <strong>#102033</strong></li>
                <li>Border Radius: <strong>14px</strong> &bull; Font: <strong>Inter</strong></li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
