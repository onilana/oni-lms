import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Bot,
  User as UserIcon,
  Send,
  BookOpen,
  HelpCircle,
  FileText,
  Clock,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  MessageSquare,
  Bookmark,
  Database,
  ExternalLink
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { AiConversation, AiMessage, AiUsage } from '../types/ai';
import { Course } from '../types/course';
import { User as AuthUser } from '../types/auth';

interface AIAssistantViewProps {
  currentUser: AuthUser | null;
}

export const AIAssistantView: React.FC<AIAssistantViewProps> = ({ currentUser }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<AiConversation | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [loadingConv, setLoadingConv] = useState<boolean>(false);
  const [usage, setUsage] = useState<AiUsage | null>(null);
  const [isIndexing, setIsIndexing] = useState<boolean>(false);
  const [indexSuccess, setIndexSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isStaff = currentUser?.roles?.some(r =>
    ['teacher', 'dept_admin', 'college_admin', 'super_admin'].includes(r.name)
  );

  useEffect(() => {
    loadCourses();
    loadUsage();
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const loadCourses = async () => {
    try {
      const res = await apiRequest<{ data?: Course[]; courses?: Course[] }>('/courses');
      const list = res.data || res.courses || [];
      setCourses(list);
      if (list.length > 0 && !selectedCourseId) {
        setSelectedCourseId(list[0].id);
      }
    } catch (err) {}
  };

  const loadUsage = async () => {
    try {
      const res = await apiRequest<{ data: AiUsage }>('/ai/usage');
      setUsage(res.data);
    } catch (err) {}
  };

  const loadConversations = async () => {
    try {
      const res = await apiRequest<{ data: AiConversation[] }>('/ai/conversations');
      const list = res.data || [];
      setConversations(list);
      if (list.length > 0 && !currentConversation) {
        selectConversation(list[0].id);
      }
    } catch (err) {}
  };

  const selectConversation = async (conversationId: string) => {
    setLoadingConv(true);
    setError(null);
    try {
      const res = await apiRequest<{ data: AiConversation }>(`/ai/conversations/${conversationId}`);
      setCurrentConversation(res.data);
      setMessages(res.data.messages || []);
      setSelectedCourseId(res.data.course_id);
    } catch (err: any) {
      setError(err.message || 'Failed to load conversation history.');
    } finally {
      setLoadingConv(false);
    }
  };

  const handleStartNewSession = async (courseIdOverride?: string) => {
    const courseId = courseIdOverride || selectedCourseId;
    if (!courseId) {
      setError('Please select an enrolled course first.');
      return;
    }

    setLoadingConv(true);
    setError(null);
    try {
      const course = courses.find(c => c.id === courseId);
      const res = await apiRequest<{ data: AiConversation }>('/ai/conversations', {
        method: 'POST',
        body: JSON.stringify({
          course_id: courseId,
          title: `Study Session: ${course?.code || 'Course'}`,
        }),
      });

      setConversations(prev => [res.data, ...prev]);
      setCurrentConversation(res.data);
      setMessages(res.data.messages || []);
      loadUsage();
    } catch (err: any) {
      setError(err.message || 'Unable to start AI study session.');
    } finally {
      setLoadingConv(false);
    }
  };

  const handleSendMessage = async (promptToSend?: string) => {
    const text = (promptToSend || inputPrompt).trim();
    if (!text) return;

    if (!currentConversation) {
      if (!selectedCourseId) {
        setError('Please select a course to start a study session.');
        return;
      }
      await handleStartNewSession();
    }

    if (!currentConversation) return;

    // Optimistically add user message
    const tempUserMsg: AiMessage = {
      id: 'temp-' + Date.now(),
      conversation_id: currentConversation.id,
      role: 'user',
      content: text,
      tokens_count: Math.ceil(text.length / 4),
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, tempUserMsg]);
    setInputPrompt('');
    setIsSending(true);
    setError(null);

    try {
      const res = await apiRequest<{ data: AiMessage }>(
        `/ai/conversations/${currentConversation.id}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ message: text }),
        }
      );

      setMessages(prev => [...prev, res.data]);
      loadUsage();
    } catch (err: any) {
      setError(err.message || 'Failed to generate response from AI Assistant.');
    } finally {
      setIsSending(false);
    }
  };

  const handleIndexCourse = async () => {
    if (!selectedCourseId) return;
    setIsIndexing(true);
    setIndexSuccess(null);
    setError(null);
    try {
      const res = await apiRequest<{ message: string; indexed_documents_count: number }>(
        '/ai/documents/index',
        {
          method: 'POST',
          body: JSON.stringify({ course_id: selectedCourseId }),
        }
      );
      setIndexSuccess(`${res.message} (${res.indexed_documents_count} total documents indexed)`);
    } catch (err: any) {
      setError(err.message || 'Failed to index course documents.');
    } finally {
      setIsIndexing(false);
    }
  };

  const quickPrompts = [
    '📝 Generate 3 practice exam questions based on our course topics.',
    '📌 Summarize the core theoretical concepts and learning outcomes.',
    '💡 Explain the key formulas and step-by-step methodologies.',
  ];

  const currentCourse = courses.find(c => c.id === selectedCourseId);

  return (
    <div className="ai-assistant-workspace">
      {/* Top Banner */}
      <div className="section-header">
        <div>
          <span className="badge badge-accent">Milestone 12 &bull; Intelligence &amp; RAG</span>
          <h1 className="section-title">AI Learning Assistant</h1>
          <p className="section-subtitle">
            Course-aware academic tutor grounded in verified syllabus, lecture notes, and learning materials.
            Permission-gated retrieval ensures students only access authorized course content.
          </p>
        </div>

        <div className="header-actions">
          {usage && (
            <div className="stat-pill" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--card-bg, #1e293b)', borderRadius: 8, border: '1px solid #334155' }}>
              <Sparkles size={16} color="#eab308" />
              <div style={{ fontSize: '0.8rem' }}>
                <strong>{usage.total_tokens_consumed.toLocaleString()}</strong> / {usage.quota_limit.toLocaleString()} tokens used
              </div>
            </div>
          )}

          {isStaff && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleIndexCourse}
              disabled={isIndexing || !selectedCourseId}
              title="Parse and index syllabus & lessons into vector search chunks"
            >
              <Database size={15} />
              <span>{isIndexing ? 'Indexing...' : 'Index Course Materials'}</span>
            </button>
          )}

          <button
            className="btn btn-primary btn-sm"
            onClick={() => handleStartNewSession()}
            disabled={!selectedCourseId}
          >
            <Plus size={16} />
            <span>New Study Session</span>
          </button>
        </div>
      </div>

      {indexSuccess && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          <CheckCircle size={18} />
          <span>{indexSuccess}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 16 }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="ai-grid" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        {/* Left Column: Course Selector & Conversation History */}
        <div className="ai-sidebar card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Current Course
            </label>
            <select
              value={selectedCourseId}
              onChange={e => {
                setSelectedCourseId(e.target.value);
                handleStartNewSession(e.target.value);
              }}
              className="form-control"
              style={{ marginTop: 6 }}
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.code} &mdash; {c.title}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
                Study Sessions ({conversations.length})
              </span>
              <button
                className="btn-icon"
                onClick={loadConversations}
                title="Refresh history"
              >
                <RefreshCw size={13} />
              </button>
            </div>

            {conversations.length === 0 ? (
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>No previous conversations. Start a new session above!</p>
            ) : (
              <div className="conv-list" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {conversations.map(c => (
                  <button
                    key={c.id}
                    className={`conv-item ${currentConversation?.id === c.id ? 'active' : ''}`}
                    onClick={() => selectConversation(c.id)}
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: 6,
                      background: currentConversation?.id === c.id ? '#1e3a8a' : 'transparent',
                      color: currentConversation?.id === c.id ? '#ffffff' : 'inherit',
                      border: '1px solid ' + (currentConversation?.id === c.id ? '#3b82f6' : 'rgba(255,255,255,0.08)'),
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: '0.85rem',
                      width: '100%',
                    }}
                  >
                    <MessageSquare size={14} />
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.title}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Security & Governance Box */}
          <div className="governance-box" style={{ padding: 12, background: 'rgba(15, 23, 42, 0.6)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.78rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, color: '#38bdf8' }}>
              <ShieldCheck size={14} />
              <strong>Institutional Governance</strong>
            </div>
            <p className="text-muted" style={{ margin: 0 }}>
              AI retrieval is restricted to course curriculum documents. Student queries and answers are logged for academic integrity.
            </p>
          </div>
        </div>

        {/* Right Column: Chat Arena */}
        <div className="ai-chat-area card" style={{ display: 'flex', flexDirection: 'column', height: '650px', padding: 0, overflow: 'hidden' }}>
          {/* Chat Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(30, 41, 59, 0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={20} color="#fff" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>
                  {currentConversation?.title || (currentCourse ? `AI Tutor · ${currentCourse.code}` : 'AI Academic Tutor')}
                </h3>
                <small className="text-muted">
                  Model: oni-rag-tutor-v1 &bull; Grounded in Course Content
                </small>
              </div>
            </div>

            {currentCourse && (
              <span className="badge badge-accent">
                {currentCourse.code}
              </span>
            )}
          </div>

          {/* Messages Stream */}
          <div className="messages-stream" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {loadingConv ? (
              <div className="empty-state">
                <RefreshCw className="animate-spin" size={32} />
                <p>Loading session transcript...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="empty-state">
                <Bot size={48} className="text-muted" />
                <h4>How can I help you study today?</h4>
                <p>Ask a conceptual question, request a summary of recent lectures, or ask for practice questions.</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16, width: '100%', maxWidth: 450 }}>
                  {quickPrompts.map((qp, idx) => (
                    <button
                      key={idx}
                      className="btn btn-outline btn-sm"
                      onClick={() => handleSendMessage(qp)}
                      style={{ textAlign: 'left', padding: '8px 12px', fontSize: '0.85rem' }}
                    >
                      {qp}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map(msg => (
                <div
                  key={msg.id}
                  className={`message-row ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`}
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                  }}
                >
                  {msg.role !== 'user' && (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Bot size={18} color="#fff" />
                    </div>
                  )}

                  <div
                    style={{
                      background: msg.role === 'user' ? '#2563eb' : '#1e293b',
                      color: '#ffffff',
                      padding: '14px 18px',
                      borderRadius: 12,
                      border: '1px solid ' + (msg.role === 'user' ? '#3b82f6' : '#334155'),
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                    }}
                  >
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                      {msg.content}
                    </div>

                    {/* Citations Box */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="citation-container" style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                          <BookOpen size={12} /> Verified Sources Cited
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {msg.citations.map((c, i) => (
                            <span
                              key={i}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 8px',
                                background: 'rgba(56, 189, 248, 0.15)',
                                color: '#38bdf8',
                                borderRadius: 4,
                                fontSize: '0.75rem',
                              }}
                            >
                              <Bookmark size={11} />
                              {c.reference || c.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: 8, textAlign: 'right' }}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  {msg.role === 'user' && (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <UserIcon size={18} color="#fff" />
                    </div>
                  )}
                </div>
              ))
            )}

            {isSending && (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                <Bot size={20} className="animate-spin" />
                <span>Searching course documents &amp; synthesizing academic answer...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Bar */}
          {messages.length > 0 && (
            <div style={{ padding: '8px 20px', background: 'rgba(15, 23, 42, 0.6)', borderTop: '1px solid #334155', display: 'flex', gap: 8, overflowX: 'auto' }}>
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  className="btn btn-outline btn-sm"
                  onClick={() => handleSendMessage(qp)}
                  style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', padding: '4px 10px' }}
                >
                  {qp}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{ padding: '16px 20px', borderTop: '1px solid #334155', display: 'flex', gap: 12, background: '#1e293b' }}
          >
            <input
              type="text"
              placeholder={`Ask a question about ${currentCourse?.code || 'your course'} (concepts, practice questions, summaries)...`}
              value={inputPrompt}
              onChange={e => setInputPrompt(e.target.value)}
              className="form-control"
              style={{ flex: 1 }}
              disabled={isSending}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSending || !inputPrompt.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Send size={16} />
              <span>Ask Tutor</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
