'use client';

import { useState } from 'react';
import { FaultKnowledge, FaultKnowledgeForm, emptyFaultForm, SEVERITIES } from '@/types/faultFinder';

interface Props {
    faults: FaultKnowledge[];
    onAdd: (form: FaultKnowledgeForm) => Promise<{ success: boolean; error?: string }>;
}

const SeverityBadge = ({ s }: { s?: string }) => {
    const map: Record<string, { bg: string; color: string }> = {
        Low: { bg: '#d1fae5', color: '#065f46' }, Medium: { bg: '#fef3c7', color: '#92400e' },
        High: { bg: '#fee2e2', color: '#991b1b' }, Critical: { bg: '#fce7f3', color: '#9d174d' },
    };
    const st = map[s || ''] || { bg: '#f3f4f6', color: '#374151' };
    return s ? <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: st.bg, color: st.color }}>{s}</span> : null;
};

const fieldStyle = { width: '100%', padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' as const, fontFamily: 'inherit' };

export default function FaultKnowledgeTab({ faults, onAdd }: Props) {
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<FaultKnowledgeForm>(emptyFaultForm);
    const [saving, setSaving] = useState(false);

    const handleAdd = async () => {
        if (!form.model_name.trim() || !form.fault_type.trim()) { alert('Model name and fault type required'); return; }
        setSaving(true);
        const result = await onAdd(form);
        if (result.success) { setForm(emptyFaultForm); setShowForm(false); }
        else alert('Error: ' + result.error);
        setSaving(false);
    };

    if (!faults.length && !showForm) {
        return (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <p style={{ color: '#6b7280', marginBottom: 12 }}>No fault knowledge entries yet</p>
                <button onClick={() => setShowForm(true)} style={{ padding: '7px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>➕ Add First Entry</button>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button onClick={() => setShowForm(!showForm)} style={{ padding: '7px 14px', background: showForm ? '#f3f4f6' : '#185FA5', color: showForm ? '#374151' : '#fff', border: showForm ? '1px solid #e5e7eb' : 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    {showForm ? '✕ Cancel' : '➕ Add Fault'}
                </button>
            </div>

            {showForm && (
                <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                        <div><label style={{ fontSize: 12, display: 'block', marginBottom: 3, fontWeight: 500 }}>Model Name *</label><input style={fieldStyle} value={form.model_name} onChange={e => setForm(f => ({ ...f, model_name: e.target.value }))} placeholder="e.g. EOS R50" /></div>
                        <div><label style={{ fontSize: 12, display: 'block', marginBottom: 3, fontWeight: 500 }}>Fault Type *</label><input style={fieldStyle} value={form.fault_type} onChange={e => setForm(f => ({ ...f, fault_type: e.target.value }))} placeholder="e.g. Shutter Error" /></div>
                        <div><label style={{ fontSize: 12, display: 'block', marginBottom: 3, fontWeight: 500 }}>Severity</label>
                            <select style={fieldStyle} value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
                                {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div><label style={{ fontSize: 12, display: 'block', marginBottom: 3, fontWeight: 500 }}>Description</label><input style={fieldStyle} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Fault description" /></div>
                        <div><label style={{ fontSize: 12, display: 'block', marginBottom: 3, fontWeight: 500 }}>Solution</label><input style={fieldStyle} value={form.solution} onChange={e => setForm(f => ({ ...f, solution: e.target.value }))} placeholder="How to fix" /></div>
                        <div><label style={{ fontSize: 12, display: 'block', marginBottom: 3, fontWeight: 500 }}>Part Required</label><input style={fieldStyle} value={form.part_required} onChange={e => setForm(f => ({ ...f, part_required: e.target.value }))} placeholder="e.g. Shutter Unit" /></div>
                    </div>
                    <button onClick={handleAdd} disabled={saving} style={{ padding: '7px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                        {saving ? 'Saving...' : '💾 Save'}
                    </button>
                </div>
            )}

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                            {['#', 'Model', 'Fault Type', 'Description', 'Solution', 'Part Required', 'Severity'].map(h => (
                                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#374151' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {faults.map((f, i) => (
                            <tr key={f.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: 12 }}>{i + 1}</td>
                                <td style={{ padding: '10px 12px', fontWeight: 600 }}>{f.model_name}</td>
                                <td style={{ padding: '10px 12px' }}>{f.fault_type}</td>
                                <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280', maxWidth: 180 }}>{f.description || '—'}</td>
                                <td style={{ padding: '10px 12px', fontSize: 12, color: '#059669', maxWidth: 180 }}>{f.solution || '—'}</td>
                                <td style={{ padding: '10px 12px', fontSize: 12 }}>{f.part_required || '—'}</td>
                                <td style={{ padding: '10px 12px' }}><SeverityBadge s={f.severity} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}