'use client';

import { useState, useEffect } from 'react';
import { useUsers } from '@/hooks/useUsers';
import { WC_NAV_ITEMS, ENGINEER_NAV_ITEMS } from '@/types/navPermissions';
import { fetchNavPermissions, saveNavPermissionsForUser, resetNavPermissionsForUser } from '@/services/navPermissionsService';

export default function NavPermissionsTab() {
    const { workControllers, engineers } = useUsers();
    const employees = [...engineers, ...workControllers].filter((u) => u.is_active);

    const [selectedId, setSelectedId] = useState('');
    const [checks, setChecks] = useState<Record<string, boolean>>({});
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const selected = employees.find((u) => String(u.id) === selectedId);
    const isEng = selected?.role_type === 'engineer';
    const items = isEng ? ENGINEER_NAV_ITEMS : WC_NAV_ITEMS;

    useEffect(() => {
        if (!selected) { setChecks({}); return; }
        fetchNavPermissions().then((perms) => {
            const userOverride = perms.users[String(selected.id)];
            const next: Record<string, boolean> = {};
            items.forEach((item) => { next[item.id] = userOverride ? userOverride[item.id] !== false : true; });
            setChecks(next);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedId]);

    const showMsg = (m: string) => { setMessage(m); setTimeout(() => setMessage(''), 3000); };

    const handleSave = async () => {
        if (!selected) { alert('Select an employee first'); return; }
        setSaving(true);
        try {
            await saveNavPermissionsForUser(String(selected.id), checks);
            showMsg(`✅ Saved for ${selected.name}! Changes apply on next login.`);
        } catch (e: any) {
            showMsg('❌ ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!selected) { alert('Select an employee first'); return; }
        if (!confirm('Reset to role defaults?')) return;
        await resetNavPermissionsForUser(String(selected.id));
        const next: Record<string, boolean> = {};
        items.forEach((item) => { next[item.id] = true; });
        setChecks(next);
        showMsg('↩ Reset to default!');
    };

    return (
        <div className="card">
            <h3 style={{ marginTop: 0 }}>🔐 Nav Permissions — Per Employee</h3>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
                Select an employee, uncheck any tab to hide it for them specifically, then Save. Everything is visible by default.
            </p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13, minWidth: 220 }}>
                    <option value="">-- Select Employee --</option>
                    {employees.map((u) => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role_type === 'engineer' ? 'Eng' : 'WC'})</option>
                    ))}
                </select>
                <button onClick={handleSave} disabled={!selected || saving} className="btn btn-primary btn-sm">💾 Save</button>
                <button onClick={handleReset} disabled={!selected} className="btn btn-outline btn-sm" style={{ color: '#dc2626' }}>↩ Reset to Default</button>
                {message && <span style={{ fontSize: 12, color: '#166534' }}>{message}</span>}
            </div>
            {selected && (
                <div style={{ maxWidth: 420 }}>
                    {items.map((item) => (
                        <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', fontSize: 13 }}>
                            <input
                                type="checkbox"
                                checked={checks[item.id] !== false}
                                onChange={(e) => setChecks((prev) => ({ ...prev, [item.id]: e.target.checked }))}
                                style={{ width: 16, height: 16, cursor: 'pointer' }}
                            />
                            {item.label}
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}