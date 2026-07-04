'use client';

import { useState } from 'react';

interface Props {
    currentUserName: string;
    onChangePassword: (password: string) => Promise<void>;
}

const fieldStyle = {
    width: '100%', padding: '8px 12px', border: '1px solid var(--border)',
    borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' as const,
};
const labelStyle = { display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '14px' };

export default function AdminProfileTab({ currentUserName, onChangePassword }: Props) {
    const [newPass, setNewPass] = useState('');
    const [confirm, setConfirm] = useState('');
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const handleChange = async () => {
        if (!newPass) { setError('Enter new password'); return; }
        if (newPass !== confirm) { setError('Passwords do not match'); return; }
        setSaving(true);
        setError('');
        try {
            await onChangePassword(newPass);
            setSuccess('✅ Password changed successfully!');
            setNewPass('');
            setConfirm('');
            setTimeout(() => setSuccess(''), 3000);
        } catch (e: any) {
            setError(e.message || 'Failed to change password');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="card" style={{ maxWidth: 480 }}>
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>👑 Admin Profile</h3>

            {/* Current user info */}
            <div style={{ background: 'var(--bg, #f8fafc)', borderRadius: 8, padding: 14, marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{currentUserName}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Administrator</div>
            </div>

            <h4 style={{ marginTop: 0, marginBottom: 12, fontSize: 14 }}>🔑 Change Password</h4>

            {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '8px 12px', borderRadius: 6, fontSize: 13, marginBottom: 10 }}>{error}</div>}
            {success && <div style={{ background: '#d1fae5', color: '#065f46', padding: '8px 12px', borderRadius: 6, fontSize: 13, marginBottom: 10 }}>{success}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                    <label style={labelStyle}>New Password *</label>
                    <input
                        type="password" placeholder="Enter new password"
                        value={newPass} onChange={e => setNewPass(e.target.value)}
                        style={fieldStyle}
                    />
                </div>
                <div>
                    <label style={labelStyle}>Confirm Password *</label>
                    <input
                        type="password" placeholder="Confirm new password"
                        value={confirm} onChange={e => setConfirm(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleChange()}
                        style={fieldStyle}
                    />
                </div>
                <button
                    onClick={handleChange}
                    disabled={saving}
                    style={{
                        padding: '8px 16px', background: 'var(--primary)', color: '#fff',
                        border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer',
                        fontSize: 14, opacity: saving ? 0.6 : 1, alignSelf: 'flex-start',
                    }}
                >
                    {saving ? 'Saving...' : '💾 Change Password'}
                </button>
            </div>
        </div>
    );
}