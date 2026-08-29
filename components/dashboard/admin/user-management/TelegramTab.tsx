'use client';

import { useState } from 'react';
import { useTelegramSettings } from '@/hooks/useTelegramSettings';
import { useEngineers } from '@/hooks/useEngineers';
import { sendDailyTelegramReport } from '@/services/settingsService';
import { sendDailyReportEmail, sendWeeklyReportEmail } from '@/services/brightActionService';

const fieldStyle = { width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' as const, fontFamily: 'monospace' };
const labelStyle = { display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.5px' };

const mondayOf = (d: Date) => { const day = d.getDay(); const diff = day === 0 ? 6 : day - 1; const m = new Date(d); m.setDate(d.getDate() - diff); return m.toISOString().slice(0, 10); };

export default function TelegramTab() {
    const { settings, setSettings, loading, error, saveToken, saveAdminChat, saveOwnerChat, saveEngChat, savePreferences, test, getBotContacts } = useTelegramSettings();
    const { engineers } = useEngineers();
    const [showToken, setShowToken] = useState(false);
    const [tokenInput, setTokenInput] = useState('');
    const [adminInput, setAdminInput] = useState('');
    const [ownerInput, setOwnerInput] = useState('');
    const [engInputs, setEngInputs] = useState<Record<string, string>>({});
    const [contacts, setContacts] = useState<{ id: string; name: string; username: string }[] | null>(null);
    const [contactsLoading, setContactsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [sendingDailyTG, setSendingDailyTG] = useState(false);
    const [sendingDailyEmail, setSendingDailyEmail] = useState(false);
    const [sendingWeeklyEmail, setSendingWeeklyEmail] = useState(false);
    const [weekFrom, setWeekFrom] = useState(mondayOf(new Date()));
    const [weekTo, setWeekTo] = useState(new Date().toLocaleDateString('en-CA'));

    const showMsg = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 5000); };

    const engChatVal = (uid: string) => engInputs[uid] ?? (settings.eng_map[uid] || '');

    const handleSaveToken = async () => {
        if (!tokenInput.trim()) { showMsg('❌ Enter a token'); return; }
        try { await saveToken(tokenInput); setTokenInput(''); showMsg('✅ Bot Token saved!'); }
        catch (e: any) { showMsg('❌ ' + e.message); }
    };
    const handleSaveAdmin = async () => {
        try { await saveAdminChat(adminInput || settings.admin_chat); showMsg('✅ Admin Chat ID saved!'); }
        catch (e: any) { showMsg('❌ ' + e.message); }
    };
    const handleSaveOwner = async () => {
        try { await saveOwnerChat(ownerInput || settings.owner_chat); showMsg('✅ Office Chat ID saved! All notifications will reach it too.'); }
        catch (e: any) { showMsg('❌ ' + e.message); }
    };
    const handleSaveEng = async (uid: string) => {
        try { await saveEngChat(uid, engChatVal(uid)); showMsg('✅ Saved!'); }
        catch (e: any) { showMsg('❌ Save failed: ' + e.message); }
    };
    const handleTest = async (chatId: string, label: string) => {
        if (!chatId) { showMsg('❌ Enter a Chat ID first'); return; }
        try { await test(chatId, label); showMsg('✅ Test message sent!'); }
        catch (e: any) { showMsg('❌ ' + e.message); }
    };
    const handleFetchContacts = async () => {
        setContactsLoading(true);
        try { setContacts(await getBotContacts()); }
        catch (e: any) { showMsg('❌ ' + e.message); }
        finally { setContactsLoading(false); }
    };
    const handleSendDailyTG = async () => {
        setSendingDailyTG(true);
        try { await sendDailyTelegramReport(); showMsg('✅ Daily summary sent to Admin Telegram!'); }
        catch (e: any) { showMsg('❌ ' + e.message); }
        finally { setSendingDailyTG(false); }
    };
    const handleSendDailyEmail = async () => {
        setSendingDailyEmail(true);
        const r = await sendDailyReportEmail();
        setSendingDailyEmail(false);
        showMsg(r.success ? '✅ Daily report emailed!' : '❌ ' + r.error);
    };
    const handleSendWeeklyEmail = async () => {
        if (!weekFrom || !weekTo) { showMsg('❌ Select a date range'); return; }
        setSendingWeeklyEmail(true);
        const r = await sendWeeklyReportEmail(weekFrom, weekTo);
        setSendingWeeklyEmail(false);
        showMsg(r.success ? `✅ Weekly report emailed! (${weekFrom} → ${weekTo})` : '❌ ' + r.error);
    };
    const handleSavePrefs = async (patch: Partial<{ notify_new_ticket: boolean; notify_punch_in: boolean }>) => {
        const next = { notify_new_ticket: settings.notify_new_ticket, notify_punch_in: settings.notify_punch_in, ...patch };
        setSettings(s => ({ ...s, ...next }));
        try { await savePreferences(next); } catch (e: any) { showMsg('❌ ' + e.message); }
    };

    if (loading) return <p style={{ color: 'var(--text-muted)' }}>Loading Telegram settings...</p>;

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
                <strong>How to setup:</strong> Open Telegram → Search <code>@BotFather</code> → Send <code>/newbot</code> → Get Bot Token. For Chat ID → Send message to bot → Visit <code>@userinfobot</code>.
            </div>

            <div style={{ marginBottom: 16, padding: 14, background: '#f8fafc', borderRadius: 8, border: '1px solid var(--border)' }}>
                <label style={{ fontWeight: 700, fontSize: 13 }}>🤖 Bot Token {settings.bot_token ? <span style={{ color: '#059669' }}>✅ Token Set</span> : <span style={{ color: '#dc2626' }}>❌ Token not set</span>}</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <input type={showToken ? 'text' : 'password'} placeholder={settings.bot_token ? 'Token already set — paste to change' : '1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ'} value={tokenInput} onChange={e => setTokenInput(e.target.value)} style={fieldStyle} />
                    <button type="button" onClick={() => setShowToken(v => !v)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontSize: 16, padding: '0 10px' }}>{showToken ? '🙈' : '👁️'}</button>
                    <button onClick={handleSaveToken} style={{ padding: '8px 16px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>Save</button>
                </div>
            </div>

            <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>👑 Admin Chat ID</label>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input type="text" defaultValue={settings.admin_chat} onChange={e => setAdminInput(e.target.value)} placeholder="Your Telegram Chat ID..." style={fieldStyle} />
                    <button onClick={handleSaveAdmin} style={{ padding: '8px 16px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Save</button>
                    <button onClick={() => handleTest(adminInput || settings.admin_chat, 'Admin')} style={{ padding: '8px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Test</button>
                </div>
            </div>

            <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>📱 Office / Second Chat ID <span style={{ fontWeight: 400, textTransform: 'none' }}>(receives every notification too)</span></label>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input type="text" defaultValue={settings.owner_chat} onChange={e => setOwnerInput(e.target.value)} placeholder="Office Telegram Chat ID..." style={fieldStyle} />
                    <button onClick={handleSaveOwner} style={{ padding: '8px 16px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Save</button>
                    <button onClick={() => handleTest(ownerInput || settings.owner_chat, 'Office')} style={{ padding: '8px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Test</button>
                </div>
            </div>

            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>👷 Engineer Chat IDs</h4>
            <div style={{ marginBottom: 10, padding: '10px 14px', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 10, fontSize: 12 }}>
                <b style={{ color: '#1d4ed8' }}>💡 Engineers who sent /start to the bot:</b><br />
                <button onClick={handleFetchContacts} disabled={contactsLoading} style={{ marginTop: 6, padding: '6px 12px', border: '1px solid var(--border)', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>{contactsLoading ? 'Loading...' : '🔄 Fetch Recent Bot Contacts'}</button>
                {contacts && (
                    <div style={{ marginTop: 8 }}>
                        {contacts.length === 0 && <span style={{ color: '#6b7280' }}>No contacts found. Engineers must send /start to the bot first.</span>}
                        {contacts.map(c => (
                            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, padding: '6px 10px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                                <div style={{ flex: 1, fontSize: 12 }}><b>{c.name}</b>{c.username ? ` @${c.username}` : ''}<br /><span style={{ color: '#6b7280', fontFamily: 'monospace' }}>{c.id}</span></div>
                                <button onClick={() => { navigator.clipboard.writeText(c.id).catch(() => { }); showMsg(`Chat ID ${c.id} copied!`); }} style={{ padding: '6px 10px', border: '1px solid var(--border)', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>📋 Copy ID</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 8 }}>
                <thead><tr style={{ background: '#f1f5f9' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Engineer</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>ID</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Telegram Chat ID</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Action</th>
                </tr></thead>
                <tbody>
                    {engineers.map(e => (
                        <tr key={e.id}>
                            <td style={{ padding: '10px 12px', fontWeight: 600 }}>{e.name}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{e.user_id}</td>
                            <td style={{ padding: '10px 12px' }}>
                                <input type="text" defaultValue={settings.eng_map[e.user_id] || ''} onChange={ev => setEngInputs(s => ({ ...s, [e.user_id]: ev.target.value }))} placeholder="Chat ID..." style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, width: 140 }} />
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                                <button onClick={() => handleSaveEng(e.user_id)} style={{ padding: '4px 10px', border: '1px solid var(--border)', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 12, marginRight: 6 }}>Save</button>
                                <button onClick={() => handleTest(engChatVal(e.user_id), e.name)} style={{ padding: '4px 10px', border: '1px solid var(--border)', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Test</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <h4 style={{ fontSize: 13, fontWeight: 700, marginTop: 20, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Notification Preferences</h4>
            {[
                { label: '🎫 Notify on New Ticket', field: 'notify_new_ticket' as const },
                { label: '🕐 Notify on Punch In/Out', field: 'notify_punch_in' as const },
            ].map(row => (
                <div key={row.field} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f8fafc', borderRadius: 6, marginBottom: 8 }}>
                    <input type="checkbox" id={row.field} checked={settings[row.field]} onChange={e => handleSavePrefs({ [row.field]: e.target.checked })} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                    <label htmlFor={row.field} style={{ fontSize: 14, cursor: 'pointer', margin: 0 }}>{row.label}</label>
                </div>
            ))}

            <div style={{ marginTop: 20, padding: 14, background: '#f0fdf4', border: '1.5px solid #059669', borderRadius: 10 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#065f46' }}>📊 Daily Report (Telegram)</h4>
                <p style={{ fontSize: 12, color: '#065f46', marginBottom: 10 }}>Sends today's tickets/inquiries/walk-in summary to the Admin Telegram chat.</p>
                <button onClick={handleSendDailyTG} disabled={sendingDailyTG} style={{ padding: '8px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: sendingDailyTG ? 0.6 : 1 }}>{sendingDailyTG ? 'Sending...' : '📤 Send Report Now'}</button>
            </div>

            <div style={{ marginTop: 14, padding: 14, background: '#fffbeb', border: '1.5px solid #f59e0b', borderRadius: 10 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#92400e' }}>📧 Email Reports (Daily / Weekly)</h4>
                <p style={{ fontSize: 12, color: '#92400e', marginBottom: 10 }}>Sends a full Daily or Weekly report to your registered email.</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <button onClick={handleSendDailyEmail} disabled={sendingDailyEmail} style={{ padding: '8px 16px', background: '#d97706', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: sendingDailyEmail ? 0.6 : 1 }}>{sendingDailyEmail ? 'Sending...' : '📧 Send Daily Email'}</button>
                    <div>
                        <label style={{ ...labelStyle, marginBottom: 2 }}>From</label>
                        <input type="date" value={weekFrom} onChange={e => setWeekFrom(e.target.value)} style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12 }} />
                    </div>
                    <div>
                        <label style={{ ...labelStyle, marginBottom: 2 }}>To</label>
                        <input type="date" value={weekTo} onChange={e => setWeekTo(e.target.value)} style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12 }} />
                    </div>
                    <button onClick={handleSendWeeklyEmail} disabled={sendingWeeklyEmail} style={{ padding: '8px 16px', background: '#d97706', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: sendingWeeklyEmail ? 0.6 : 1 }}>{sendingWeeklyEmail ? 'Sending...' : '📊 Send Weekly Email'}</button>
                </div>
            </div>
        </div>
    );
}