import React, { useState } from 'react';
import { KeyRound, Lock, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError, apiRequest } from '../api/client';

export const ForcePasswordChangeModal: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || !user.must_change_password) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setLoading(true);
    try {
      await apiRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          new_password_confirmation: confirmPassword,
        }),
      });
      await refreshUser();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to update password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Password Change Required</h3>
            <p>You must update your initial password before continuing.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className="alert alert-error">
              <ShieldAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="current-password">Current Password</label>
            <div className="input-wrap">
              <Lock size={16} className="input-icon" />
              <input
                id="current-password"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="new-password">New Password</label>
            <div className="input-wrap">
              <Lock size={16} className="input-icon" />
              <input
                id="new-password"
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password">Confirm New Password</label>
            <div className="input-wrap">
              <Lock size={16} className="input-icon" />
              <input
                id="confirm-password"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            <KeyRound size={16} />
            <span>{loading ? 'Updating Password...' : 'Update Password'}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={() => logout()}
            style={{ marginTop: 8 }}
          >
            Sign Out
          </button>
        </form>
      </div>
    </div>
  );
};
