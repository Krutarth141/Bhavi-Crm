'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import '@/styles/auth.css';

export default function ErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div className="auth-container">
      <div className="login-card">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h1 style={{ marginBottom: '8px', color: 'var(--text)' }}>
            Authentication Error
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
            {error || 'An error occurred. Please try again.'}
          </p>
          <Link href="/login" className="btn btn-primary">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}