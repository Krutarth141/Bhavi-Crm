'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { deviceCall, getDeviceId, getDeviceLabel } from '@/lib/deviceSecurity';
import '@/styles/auth.css';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(error || '');
  const [devicePreview, setDevicePreview] = useState<Record<string, unknown> | null>(null);
  const [deviceMessage, setDeviceMessage] = useState('');
  const [deviceLoading, setDeviceLoading] = useState(false);
  const [deviceToken, setDeviceToken] = useState('');

  useEffect(() => {
    const action = searchParams.get('device_action');
    const token = searchParams.get('t');
    if (!token || (action !== 'allow' && action !== 'block')) return;

    window.history.replaceState(null, '', window.location.pathname);
    const timer = window.setTimeout(() => {
      setDeviceToken(token);
      setDeviceLoading(true);
      deviceCall({ action: 'preview', token }, 10000).then((preview) => {
        setDeviceLoading(false);
        if (!preview || preview.error) {
          setDevicePreview(null);
          setDeviceMessage(preview?.error || 'Server error. Please try again later.');
          return;
        }
        setDevicePreview(preview);
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [searchParams]);

  const respondToDeviceAction = async (decision: 'allow' | 'block') => {
    if (!deviceToken) return;
    setDeviceLoading(true);
    const result = await deviceCall({ action: 'respond', token: deviceToken, decision }, 10000);
    setDeviceLoading(false);
    setDevicePreview(null);
    if (result?.status === 'blocked') setDeviceMessage('🚫 Device blocked. It will be logged out immediately.');
    else if (result?.status === 'trusted') setDeviceMessage('✅ Device allowed. It can continue to sign in.');
    else setDeviceMessage(result?.error || 'Failed. Please try again.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const deviceStatus = await deviceCall({
        action: 'status',
        user_id: email,
        device_id: getDeviceId(),
      }, 5000);
      if (deviceStatus?.status === 'blocked') {
        setErrorMsg('🚫 This device is blocked. Please contact the Admin.');
        setLoading(false);
        return;
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setErrorMsg(result.error || 'Invalid email or password');
      } else if (result?.ok) {
        deviceCall({
          action: 'register',
          user_id: email,
          device_id: getDeviceId(),
          label: getDeviceLabel(),
          ua: navigator.userAgent,
          app_url: `${window.location.origin}/login`,
        }, 10000);
        router.push('/dashboard');
      }
    } catch {
      setErrorMsg('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {(deviceToken || deviceMessage) && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'linear-gradient(135deg,#1e2a3a,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 30, width: 380, maxWidth: '100%', boxShadow: '0 30px 80px rgba(0,0,0,.3)', textAlign: 'center' }}>
            <div style={{ fontSize: 38 }}>🔐</div>
            <div style={{ fontSize: 18, fontWeight: 800, margin: '6px 0 14px' }}>New device login</div>
            {deviceLoading ? (
              <div style={{ color: '#374151' }}>Please wait...</div>
            ) : devicePreview ? (
              <>
                <div style={{ color: '#374151', lineHeight: 1.7 }}>
                  <div><b>{String(devicePreview.name || '')}</b></div>
                  <div>Device: {String(devicePreview.label || 'Unknown')} | IP: {String(devicePreview.ip || '-')}</div>
                  {devicePreview.when ? <div style={{ color: '#6b7280', fontSize: 12 }}>{new Date(String(devicePreview.when)).toLocaleString('en-IN')}</div> : null}
                  <div style={{ marginTop: 8, fontWeight: 700 }}>
                    {devicePreview.status === 'blocked' ? 'Current status: 🚫 Blocked' : devicePreview.status === 'trusted' ? 'Current status: ✅ Allowed' : 'Current status: ⏳ Awaiting your decision'}
                  </div>
                </div>
                <div style={{ marginTop: 18 }}>
                  <button type="button" onClick={() => respondToDeviceAction('allow')} style={{ width: '100%', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 8 }}>✅ Yes, it is me — allow it</button>
                  <button type="button" onClick={() => respondToDeviceAction('block')} style={{ width: '100%', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>🚫 Block this device</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ color: '#374151', lineHeight: 1.7 }}>{deviceMessage}</div>
                <button type="button" onClick={() => { setDeviceToken(''); setDeviceMessage(''); setDevicePreview(null); }} style={{ marginTop: 14, background: 'none', border: 'none', color: '#1d4ed8', fontWeight: 700, cursor: 'pointer' }}>Open Login →</button>
              </>
            )}
          </div>
        </div>
      )}
      <div className="login-card">
        <div className="login-logo">
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔧</div>
          <div className="company">BHAVI ELECTRONICS</div>
          <div className="tagline">& Automation — Service CRM</div>
        </div>

        {errorMsg && (
          <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">User ID</label>
            <input
              id="email"
              type="text"
              placeholder="ADMIN"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="form-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '8px' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
          Powered by BHAVI Electronics
        </div>
      </div>
    </div>
  );
}