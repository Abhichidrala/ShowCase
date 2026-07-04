import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiService from '../services/api';
import { Mail, Lock, User, CheckCircle } from 'lucide-react';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gender, setGender] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [simulatedLink, setSimulatedLink] = useState('');

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSimulatedLink('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { data } = await apiService.auth.register(username, email, password, gender);
      setSuccess(data.message);
      if (data.verifyLink) {
        setSimulatedLink(data.verifyLink);
      }
      // Reset form fields
      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setGender('');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex items-center justify-center relative" style={{ minHeight: '90vh', maxWidth: '520px', paddingTop: '60px', paddingBottom: '60px' }}>
      {/* Decorative gradient background orbs */}
      <div className="animate-float-blob" style={{ position: 'absolute', top: '5%', right: '-10%', width: '240px', height: '240px', background: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none', filter: 'blur(35px)' }}></div>
      <div className="animate-float-blob-slow" style={{ position: 'absolute', bottom: '5%', left: '-10%', width: '220px', height: '220px', background: 'radial-gradient(circle, rgba(255, 255, 255, 0.06) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none', filter: 'blur(30px)' }}></div>

      <div className="glass-panel w-full animate-fade-in" style={{ padding: '36px' }}>
        
        <div className="text-center" style={{ marginBottom: '36px' }}>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '10px', letterSpacing: '-0.03em' }}>Create Account</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Join the community and build your developer identity.</p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '24px' }}>
            {error}
          </div>
        )}

        {success ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <CheckCircle size={56} style={{ color: 'var(--success)', marginBottom: '20px' }} />
            <h3 style={{ marginBottom: '10px', fontSize: '1.4rem' }}>Registration Successful!</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '28px', lineHeight: 1.6 }}>
              {success}
            </p>
            {simulatedLink && (
              <div className="alert alert-warning" style={{ marginBottom: '24px', fontSize: '0.85rem' }}>
                <p style={{ marginBottom: '6px' }}><strong>Simulated Verification Link:</strong></p>
                <a href={simulatedLink} style={{ textDecoration: 'underline', color: 'inherit', fontWeight: 'bold' }}>Verify Email Now</a>
              </div>
            )}
            <Link to="/login" className="btn btn-primary w-full" style={{ height: '48px', fontSize: '1rem' }}>
              Proceed to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleRegisterSubmit}>
            <div className="form-group">
              <label>Username</label>
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

            <div className="form-group">
              <label>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  placeholder="e.g. abhi@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ paddingLeft: '44px', height: '48px' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Gender</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  required
                  style={{ paddingLeft: '44px', height: '48px' }}
                >
                  <option value="" disabled>Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingLeft: '44px', height: '48px' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '32px' }}>
              <label>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  style={{ paddingLeft: '44px', height: '48px' }}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full" style={{ height: '48px', fontSize: '1rem' }} disabled={loading}>
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>
        )}

        {!success && (
          <div style={{ marginTop: '28px', textAlign: 'center', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--text-primary)', fontWeight: 700, marginLeft: '4px', textDecoration: 'underline' }}>Login here</Link>
          </div>
        )}
      </div>
    </div>
  );
}
