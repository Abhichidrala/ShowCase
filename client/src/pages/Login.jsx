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
    <div className="container flex items-center justify-center relative" style={{ minHeight: '85vh', maxWidth: '520px', paddingTop: '60px', paddingBottom: '60px' }}>
      {/* Dynamic Background decorative orbs */}
      <div className="animate-float-blob" style={{ position: 'absolute', top: '10%', left: '-10%', width: '220px', height: '220px', background: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none', filter: 'blur(30px)' }}></div>
      <div className="animate-float-blob-slow" style={{ position: 'absolute', bottom: '10%', right: '-10%', width: '260px', height: '260px', background: 'radial-gradient(circle, rgba(255, 255, 255, 0.06) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none', filter: 'blur(40px)' }}></div>

      <div className="glass-panel w-full animate-fade-in" style={{ padding: '36px' }}>
        
        {/* Header */}
        <div className="text-center" style={{ marginBottom: '36px' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '10px', letterSpacing: '-0.03em' }}>
            {twoFactorRequired ? 'Two-Factor Auth' : 'Welcome Back'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            {twoFactorRequired 
              ? 'Enter the code from your authenticator app.' 
              : 'Sign in to access your platform builder tools.'}
          </p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '24px' }}>
            {error}
          </div>
        )}

        {/* --- STANDARD LOGIN FORM --- */}
        {!twoFactorRequired ? (
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label>Username or Email</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="e.g. abhiiii"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  style={{ paddingLeft: '44px', height: '48px' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '28px' }}>
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingLeft: '44px', paddingRight: '44px', height: '48px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '16px', top: '14px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full" style={{ height: '48px', fontSize: '1rem', marginTop: '8px' }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          /* --- 2FA CODE FORM --- */
          <form onSubmit={handle2FASubmit}>
            <div className="form-group" style={{ marginBottom: '28px' }}>
              <label>Authenticator Code</label>
              <div style={{ position: 'relative' }}>
                <ShieldCheck size={16} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  required
                  style={{ paddingLeft: '44px', letterSpacing: '0.4em', textAlign: 'center', fontSize: '1.25rem', height: '48px' }}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full" style={{ height: '48px', fontSize: '1rem' }} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>

            <button 
              type="button" 
              className="btn btn-secondary w-full" 
              style={{ marginTop: '14px', height: '48px' }}
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
          <div style={{ marginTop: '28px', textAlign: 'center', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            Don't have an account? <Link to="/register" style={{ color: 'var(--text-primary)', fontWeight: 700, marginLeft: '4px', textDecoration: 'underline' }}>Create one</Link>
          </div>
        )}
      </div>
    </div>
  );
}
