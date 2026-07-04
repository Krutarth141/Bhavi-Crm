'use client';

import { useState } from 'react';
import { useMSCCenters } from '@/hooks/useMSCCenters';
import { MSCCenterForm, emptyMSCCenterForm } from '@/types/settings';

const fieldStyle = {
    width: '100%', padding: '8px 12px', border: '1px solid var(--border)',
    borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' as const,
};
const labelStyle = {
    display: 'block', marginBottom: '4px', fontWeight: 600,
    fontSize: '11px', color: 'var(--text-muted)',
    textTransform: 'uppercase' as const, letterSpacing: '0.5px',
};

export default function MSCCentersTab() {
    const { centers, loading, error, add, remove } = useMSCCenters();
    const [form, setForm] = useState<MSCCenterForm>(emptyMSCCenterForm);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const showMsg = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 3000); };

    const handleAdd = async () => {
        if (!form.name.trim()) { showMsg('❌ MSC Name is required'); return; }
        setSaving(true);
        try {
            await add(form);
            setForm(emptyMSCCenterForm);
            showMsg('✅ MSC Center added!');
        } catch (e: any) {
            showMsg('❌ ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`Delete "${name}"?`)) return;
        try { await remove(id); }
        catch (e: any) { showMsg('❌ ' + e.message); }
    };

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>📊 MSC CENTERS</h3>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    ADD MASTER SERVICE CENTERS — THESE APPEAR AS OPTIONS WHEN SENDING A PRODUCT TO MSC FOR REPAIR.
                </p>
            </div>

            {(message || error) && (
                <div style={{ padding: '8px 12px', borderRadius: 6, fontSize: 13, marginBottom: 12, background: (message || error || '').startsWith('✅') ? '#d1fae5' : '#fee2e2', color: (message || error || '').startsWith('✅') ? '#065f46' : '#dc2626' }}>
                    {message || error}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                    <label style={labelStyle}>MSC NAME *</label>
                    <input type="text" placeholder="e.g. Fujifilm Service Center Mumbai" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={fieldStyle} />
                </div>
                <div>
                    <label style={labelStyle}>CITY</label>
                    <input type="text" placeholder="e.g. Mumbai" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} style={fieldStyle} />
                </div>
                <div>
                    <label style={labelStyle}>CONTACT PERSON</label>
                    <input type="text" placeholder="Name / Phone" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} style={fieldStyle} />
                </div>
                <div>
                    <label style={labelStyle}>ADDRESS</label>
                    <input type="text" placeholder="Full address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} style={fieldStyle} />
                </div>
            </div>

            <button onClick={handleAdd} disabled={saving} style={{ padding: '8px 18px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, marginBottom: 20, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Adding...' : '+ Add MSC Center'}
            </button>

            {loading ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>Loading...</p>
            ) : centers.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No MSC centers added yet</p>
            ) : (
                <div className="table-wrap">
                    <table>
                        <thead><tr><th>NAME</th><th>CITY</th><th>CONTACT</th><th>ADDRESS</th><th>ACTION</th></tr></thead>
                        <tbody>
                            {centers.map(c => (
                                <tr key={c.id}>
                                    <td><strong>{c.name}</strong></td>
                                    <td>{c.city || '—'}</td>
                                    <td style={{ color: 'var(--primary)' }}>{c.contact || '—'}</td>
                                    <td>{c.address || '—'}</td>
                                    <td>
                                        <button onClick={() => handleDelete(c.id, c.name)} style={{ padding: '4px 12px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                                            🗑️ Delete
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