'use client';

import { useState } from 'react';
import { Brand, ProblemType, ProblemTypeForm, emptyProblemTypeForm } from '@/types/masters';

interface Props {
    brands: Brand[];
    problemTypes: ProblemType[];
    onAdd: (form: ProblemTypeForm) => Promise<void>;
    onToggle: (id: string, is_active: boolean) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

export default function ProblemTypesTab({ brands, problemTypes, onAdd, onToggle, onDelete }: Props) {
    const [form, setForm] = useState<ProblemTypeForm>(emptyProblemTypeForm);
    const [saving, setSaving] = useState(false);
    const [showInactive, setShowInactive] = useState(false);

    const handleAdd = async () => {
        if (!form.problem.trim()) { alert('Enter problem type'); return; }
        setSaving(true);
        try { await onAdd(form); setForm(emptyProblemTypeForm); }
        catch (e: any) { alert(e.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this problem type?')) return;
        try { await onDelete(id); }
        catch (e: any) { alert(e.message); }
    };

    const displayed = showInactive ? problemTypes : problemTypes.filter(p => p.is_active);

    return (
        <div>
            <div className="card" style={{ marginBottom: 12 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 10, fontSize: 14, marginTop: 0 }}>Add Problem Type</h3>
                <div className="master-add-row">
                    <select
                        value={form.brand_id}
                        onChange={e => setForm({ ...form, brand_id: e.target.value })}
                        style={{ maxWidth: 180 }}
                    >
                        <option value="">All Brands</option>
                        {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <input
                        type="text"
                        placeholder="Problem type name *"
                        value={form.problem}
                        onChange={e => setForm({ ...form, problem: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    />
                    <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={saving}>
                        {saving ? 'Adding...' : '+ Add'}
                    </button>
                </div>
            </div>

            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <strong>Problem Types List</strong>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <label style={{ fontSize: 12, display: 'flex', gap: 4, alignItems: 'center', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={showInactive}
                                onChange={e => setShowInactive(e.target.checked)}
                            />
                            Show inactive
                        </label>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {displayed.length}/{problemTypes.length}
                        </span>
                    </div>
                </div>

                {!displayed.length ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No problem types yet</p>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead><tr><th>#</th><th>Problem Type</th><th>Brand</th><th>Status</th><th>Action</th></tr></thead>
                            <tbody>
                                {displayed.map((p, i) => (
                                    <tr key={p.id} style={!p.is_active ? { opacity: 0.6 } : {}}>
                                        <td>{i + 1}</td>
                                        <td><strong>{p.problem}</strong></td>
                                        <td>{p.brand?.name || 'All'}</td>
                                        <td>
                                            <span
                                                style={{
                                                    background: p.is_active ? '#d1fae5' : '#fee2e2',
                                                    color: p.is_active ? '#065f46' : '#991b1b',
                                                    borderRadius: 4, padding: '2px 8px', fontSize: 11,
                                                    cursor: 'pointer', fontWeight: 500,
                                                }}
                                                onClick={() => onToggle(p.id, !p.is_active)}
                                                title="Click to toggle"
                                            >
                                                {p.is_active ? '✅ Active' : '❌ Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            <button className="btn-icon" onClick={() => handleDelete(p.id)} style={{ color: 'var(--danger)' }}>🗑️</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}