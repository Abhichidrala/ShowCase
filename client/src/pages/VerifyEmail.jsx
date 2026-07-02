import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import apiService from '../services/api';
import { CheckCircle, AlertTriangle, Mail } from 'lucide-react';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState(token ? 'verifying' : 'check_email'); // check_email, verifying, success, error
  const [message, setMessage] = useState(token ? '' : 'Please check your email for the verification link.');
  const hasVerified = useRef(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    // Guard against React StrictMode double-invocation: only run the API call once
    if (hasVerified.current) return;
    hasVerified.current = true;

    const verify = async () => {
      try {
        const { data } = await apiService.auth.verifyEmail(token);
        setStatus('success');
        setMessage(data.message);
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Verification failed. The token may have expired.');
      }
    };
    verify();
  }, [token]);

  return (
    <div className="container flex items-center justify-center" style={{ minHeight: '80vh', maxWidth: '480px', paddingTop: '40px' }}>
      <div className="card w-full text-center animate-fade-in">
        {status === 'check_email' && (
          <div>
            <Mail size={48} style={{ color: 'var(--accent-color)', marginBottom: '16px' }} />
            <h3>Check your email</h3>
            <p style={{ color: 'var(--text-secondary)', margin: '12px 0 24px' }}>{message}</p>
          </div>
        )}

        {status === 'verifying' && (
          <div>
            <h3>Verifying Email Address...</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Checking verification tokens against active sessions.</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <CheckCircle size={48} style={{ color: 'var(--success)', marginBottom: '16px' }} />
            <h3>Verification Successful!</h3>
            <p style={{ color: 'var(--text-secondary)', margin: '12px 0 24px' }}>{message}</p>
            <Link to="/login" className="btn btn-primary w-full">Proceed to Sign In</Link>
          </div>
        )}

        {status === 'error' && (
          <div>
            <AlertTriangle size={48} style={{ color: 'var(--danger)', marginBottom: '16px' }} />
            <h3 style={{ color: 'var(--danger)' }}>Verification Failed</h3>
            <p style={{ color: 'var(--text-secondary)', margin: '12px 0 24px' }}>{message}</p>
            <div className="flex gap-2">
              <Link to="/login" className="btn btn-secondary w-full">Login Screen</Link>
              <Link to="/" className="btn btn-primary w-full">Platform Home</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
