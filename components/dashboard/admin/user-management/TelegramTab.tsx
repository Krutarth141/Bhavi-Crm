'use client';

import { useState } from 'react';
import { useTelegramSettings } from '@/hooks/useTelegramSettings';

const fieldStyle = { width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' as const, fontFamily: 'monospace' };
const labelStyle = { display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.5px' };

export default function TelegramTab() {
    const { settings, setSettings, saving, testing, error, save, test } = useTelegramSettings();
    const [showToken, setShowToken] = useState(false);
    const [message, setMessage] = useState('');

    const showMsg = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 4000); };

    const handleSave = async () => {
        if (!settings.bot_token.trim()) { showMsg('❌ Bot Token is required'); return; }
        if (!settings.chat_id.trim()) { showMsg('❌ Chat ID is required'); return; }
        try { await save(); showMsg('✅ Telegram settings saved!'); }
        catch (e: any) { showMsg('❌ ' + e.message); }
    };

    const handleTest = async () => {
        if (!settings.bot_token || !settings.chat_id) { showMsg('❌ Save settings first'); return; }
        try { await test(); showMsg('✅ Test message sent to Telegram!'); }
        catch (e: any) { showMsg('❌ ' + e.message); }
    };

    const CheckRow = ({ label, field }: { label: string; field: 'notify_new_ticket' | 'notify_status_change' | 'notify_punch_in' }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-secondary, #f8fafc)', borderRadius: 6, marginBottom: 8 }}>
            <input type="checkbox" id={field} checked={settings[field]} onChange={e => setSettings(s => ({ ...s, [field]: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
            <label htmlFor={field} style={{ fontSize: 14, cursor: 'pointer', margin: 0 }}>{label}</label>
        </div>
    );

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>📱 TELEGRAM NOTIFICATIONS</h3>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CONFIGURE TELEGRAM BOT TO RECEIVE CRM NOTIFICATIONS.</p>
            </div>

            {(message || error) && (
                <div style={{ padding: '8px 12px', borderRadius: 6, fontSize: 13, marginBottom: 12, background: (message || '').startsWith('✅') ? '#d1fae5' : '#fee2e2', color: (message || '').startsWith('✅') ? '#065f46' : '#dc2626' }}>
                    {message || error}
                </div>
            )}

            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#1e40af' }}>
                <strong>How to setup:</strong> Open Telegram → Search <code>@BotFather</code> → Send <code>/newbot</code> → Get Bot Token. For Chat ID → Send message to bot → Visit <code>https://api.telegram.org/bot[TOKEN]/getUpdates</code>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                <div>
                    <label style={labelStyle}>BOT TOKEN *</label>
                    <div style={{ position: 'relative' }}>
                        <input type={showToken ? 'text' : 'password'} placeholder="1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ" value={settings.bot_token} onChange={e => setSettings(s => ({ ...s, bot_token: e.target.value }))} style={fieldStyle} />
                        <button type="button" onClick={() => setShowToken(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>
                            {showToken ? '🙈' : '👁️'}
                        </button>
                    </div>
                </div>
                <div>
                    <label style={labelStyle}>CHAT ID *</label>
                    <input type="text" placeholder="-1001234567890 or 1234567890" value={settings.chat_id} onChange={e => setSettings(s => ({ ...s, chat_id: e.target.value }))} style={fieldStyle} />
                    <small style={{ color: 'var(--text-muted)', fontSize: 11 }}>Use negative number for group chats</small>
                </div>
            </div>

            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Notification Preferences</h4>
            <CheckRow label="🎫 Notify on New Ticket" field="notify_new_ticket" />
            <CheckRow label="🔄 Notify on Status Change" field="notify_status_change" />
            <CheckRow label="🕐 Notify on Punch In/Out" field="notify_punch_in" />

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
                    {saving ? 'Saving...' : '💾 Save Settings'}
                </button>
                <button onClick={handleTest} disabled={testing} style={{ padding: '8px 20px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, cursor: testing ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, opacity: testing ? 0.6 : 1 }}>
                    {testing ? 'Sending...' : '📤 Send Test Message'}
                </button>
            </div>
        </div>
    );
}