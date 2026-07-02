import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 2FA state
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const { login, login2FA } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(username, password);
      if (res.twoFactorRequired) {
        setTwoFactorRequired(true);
        setTempToken(res.tempToken);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to authenticate. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login2FA(tempToken, twoFactorCode);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid 2FA code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex items-center justify-between" style={{ minHeight: '80vh', maxWidth: '480px', paddingTop: '40px' }}>
      <div className="card w-full animate-fade-in">
        
        {/* Header */}
        <div className="text-center" style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>
            {twoFactorRequired ? 'Two-Factor Authentication' : 'Account Login'}
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            {twoFactorRequired 
              ? 'Enter the verification code from your authenticator app.' 
              : 'Access your career dashboard and portfolio settings.'}
          </p>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', marginBottom: '20px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            {error}
          </div>
        )}

        {/* --- STANDARD LOGIN FORM --- */}
        {!twoFactorRequired ? (
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label>Username or Email Address</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="e.g. abhiiii"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingLeft: '40px', paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full" style={{ marginTop: '12px' }} disabled={loading}>
              {loading ? 'Logging in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          /* --- 2FA CODE FORM --- */
          <form onSubmit={handle2FASubmit}>
            <div className="form-group">
              <label>Authenticator Code (6-digits)</label>
              <div style={{ position: 'relative' }}>
                <ShieldCheck size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  required
                  style={{ paddingLeft: '40px', letterSpacing: '0.3em', textAlign: 'center', fontSize: '1.2rem' }}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full" style={{ marginTop: '12px' }} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>

            <button 
              type="button" 
              className="btn btn-secondary w-full" 
              style={{ marginTop: '12px' }}
              onClick={() => {
                setTwoFactorRequired(false);
                setTwoFactorCode('');
              }}
            >
              Back to Login
            </button>
          </form>
        )}

        {/* Footer */}
        {!twoFactorRequired && (
          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Don't have an account? <Link to="/register" style={{ color: 'var(--accent-color)', fontWeight: 600 }}>Create one</Link>
          </div>
        )}
      </div>
    </div>
  );
}
