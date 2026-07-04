'use client';

import { useState } from 'react';
import { useShiftSettings } from '@/hooks/useShiftSettings';

const fieldStyle = {
    width: '100%', padding: '8px 12px', border: '1px solid var(--border)',
    borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' as const,
};
const labelStyle = { display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '13px' };

const TIME_FIELDS = [
    { key: 'punch_in_start', label: 'Punch In Start' },
    { key: 'punch_in_end', label: 'Punch In End' },
    { key: 'late_punch_in_after', label: 'Late After' },
    { key: 'punch_out_time', label: 'Punch Out Time' },
] as const;

export default function ShiftSettingsCard() {
    const { settings, setSettings, loaded, saving, error, load, save } = useShiftSettings();
    const [message, setMessage] = useState('');

    const showMsg = (msg: string) => {
        setMessage(msg);
        setTimeout(() => setMessage(''), 3000);
    };

    const handleSave = async () => {
        try {
            await save();
            showMsg('✅ Shift settings saved!');
        } catch {
            showMsg('❌ ' + (error || 'Save failed'));
        }
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
                {!loaded ? (
                    <button onClick={load} style={{ padding: '6px 16px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                        📂 Load
                    </button>
                ) : (
                    <button onClick={handleSave} disabled={saving} style={{ padding: '6px 16px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
                        {saving ? 'Saving...' : '💾 Save'}
                    </button>
                )}
            </div>

            {message && (
                <div style={{ padding: '8px 12px', borderRadius: 6, fontSize: 13, marginBottom: 12, background: message.startsWith('✅') ? '#d1fae5' : '#fee2e2', color: message.startsWith('✅') ? '#065f46' : '#dc2626' }}>
                    {message}
                </div>
            )}

            {loaded && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    {TIME_FIELDS.map(({ key, label }) => (
                        <div key={key}>
                            <label style={labelStyle}>{label}</label>
                            <input
                                type="time"
                                value={settings[key]}
                                onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
                                style={fieldStyle}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}