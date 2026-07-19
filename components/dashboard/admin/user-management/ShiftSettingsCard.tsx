'use client';

import { useState } from 'react';
import { useShiftSettings } from '@/hooks/useShiftSettings';
import { WEEKLY_OFF_OPTIONS } from '@/types/settings';

const inputStyle = {
    border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px',
    fontSize: 13, outline: 'none',
};

export default function ShiftSettingsCard() {
    const { shifts, loaded, loading, savingId, error, load, updateShift, saveShift } = useShiftSettings();
    const [message, setMessage] = useState('');

    const showMsg = (msg: string) => {
        setMessage(msg);
        setTimeout(() => setMessage(''), 3000);
    };

    const handleSave = async (empId: string) => {
        const r = await saveShift(empId);
        showMsg(r.success ? '✅ Shift saved!' : '❌ ' + r.error);
    };

    return (
        <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: loaded ? 16 : 0 }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>🕐 SHIFT / WORKING HOURS SETTINGS</h3>
                    {!loaded && (
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            CLICK LOAD TO VIEW EMPLOYEE SHIFT SETTINGS
                        </p>
                    )}
                </div>
                <button onClick={load} disabled={loading} style={{ padding: '6px 16px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: loading ? 0.6 : 1 }}>
                    {loading ? 'Loading...' : loaded ? '🔄 Reload' : '📂 Load'}
                </button>
            </div>

            {message && (
                <div style={{ padding: '8px 12px', borderRadius: 6, fontSize: 13, marginBottom: 12, background: message.startsWith('✅') ? '#d1fae5' : '#fee2e2', color: message.startsWith('✅') ? '#065f46' : '#dc2626' }}>
                    {message}
                </div>
            )}
            {error && !message && (
                <div style={{ padding: '8px 12px', borderRadius: 6, fontSize: 13, marginBottom: 12, background: '#fee2e2', color: '#dc2626' }}>
                    Error: {error}
                </div>
            )}

            {loaded && (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: 'var(--bg)' }}>
                                <th style={{ padding: 8, textAlign: 'left' }}>Employee</th>
                                <th style={{ padding: 8 }}>Shift Start</th>
                                <th style={{ padding: 8 }}>Shift End</th>
                                <th style={{ padding: 8 }}>Weekly Off</th>
                                <th style={{ padding: 8 }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {shifts.map(s => (
                                <tr key={s.emp_id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: 8, fontWeight: 600 }}>
                                        {s.emp_name}
                                        <br /><span style={{ fontSize: 11, color: '#64748b' }}>{s.emp_role}</span>
                                    </td>
                                    <td style={{ padding: 8, textAlign: 'center' }}>
                                        <input type="time" value={s.shift_start} onChange={e => updateShift(s.emp_id, { shift_start: e.target.value })} style={inputStyle} />
                                    </td>
                                    <td style={{ padding: 8, textAlign: 'center' }}>
                                        <input type="time" value={s.shift_end} onChange={e => updateShift(s.emp_id, { shift_end: e.target.value })} style={inputStyle} />
                                    </td>
                                    <td style={{ padding: 8, textAlign: 'center' }}>
                                        <select value={s.weekly_off} onChange={e => updateShift(s.emp_id, { weekly_off: e.target.value })} style={inputStyle}>
                                            {WEEKLY_OFF_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </td>
                                    <td style={{ padding: 8, textAlign: 'center' }}>
                                        <button onClick={() => handleSave(s.emp_id)} disabled={savingId === s.emp_id} style={{ padding: '5px 14px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, opacity: savingId === s.emp_id ? 0.6 : 1 }}>
                                            {savingId === s.emp_id ? 'Saving...' : 'Save'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}