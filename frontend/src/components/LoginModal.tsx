import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, Lock, Mail, ShieldAlert, Sparkles, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@onilms.edu');
  const [password, setPassword] = useState('OniAdmin@2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(email, password);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to connect to the LMS backend service.');
      }
    } finally {
      setLoading(false);
    }
  };

  const setPreset = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setError(null);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Sign in to ONI LMS</h3>
            <p>Access your courses, grades, and academic administration</p>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className="alert alert-error">
              <ShieldAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="login-email">Email Address</label>
            <div className="input-wrap">
              <Mail size={16} className="input-icon" />
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@college.edu"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <div className="input-wrap">
              <Lock size={16} className="input-icon" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
              />
              <button
                type="button"
                className="btn-toggle-pw"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px', color: '#64748b' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            <KeyRound size={16} />
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
          </button>

          <div className="dev-presets">
            <span className="dev-presets-label">
              <Sparkles size={13} /> Quick Test Credentials (1-Click Fill)
            </span>
            <div className="preset-buttons">
              <button
                type="button"
                className="btn-chip"
                onClick={() => setPreset('admin@onilms.edu', 'OniAdmin@2026!')}
              >
                Super Admin
              </button>
              <button
                type="button"
                className="btn-chip"
                onClick={() => setPreset('student@onilms.edu', 'OniStudent@2026!')}
              >
                Student (Aarav)
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
