'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Brand, ProblemType, ProblemTypeForm, emptyProblemTypeForm } from '@/types/masters';
import { importProblemTypes } from '@/services/masterService';

interface Props {
    brands: Brand[];
    problemTypes: ProblemType[];
    onAdd: (form: ProblemTypeForm) => Promise<void>;
    onEdit: (id: string, problem: string) => Promise<void>;
    onToggle: (id: string, is_active: boolean) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onRefresh: () => Promise<void>;
}

export default function ProblemTypesTab({ brands, problemTypes, onAdd, onEdit, onToggle, onDelete, onRefresh }: Props) {
    const [form, setForm] = useState<ProblemTypeForm>(emptyProblemTypeForm);
    const [saving, setSaving] = useState(false);
    const [showInactive, setShowInactive] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleImport = async () => {
        const file = fileRef.current?.files?.[0];
        if (!file) { alert('Select a file first'); return; }
        const reader = new FileReader();
        reader.onload = async (e) => {
            const wb = XLSX.read(e.target?.result, { type: 'binary' });
            const data = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]]);
            const rows = data.map((r: any) => ({ problem: r['Problem Type'] || r['problem'] || '', brand: r['Brand'] || r['brand'] || '' }));
            const count = await importProblemTypes(rows, brands);
            alert(`Imported ${count} problem types`);
            await onRefresh();
            if (fileRef.current) fileRef.current.value = '';
        };
        reader.readAsBinaryString(file);
    };

    const downloadTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet([['Problem Type', 'Brand'], ['Example Problem', 'Example Brand']]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Problem Types');
        XLSX.writeFile(wb, 'problem_types_template.xlsx');
    };

    const handleAdd = async () => {
        if (!form.problem.trim()) { alert('Enter problem type'); return; }
        setSaving(true);
        try { await onAdd(form); setForm(emptyProblemTypeForm); }
        catch (e: any) { alert(e.message); }
        finally { setSaving(false); }
    };

    const handleEdit = async (p: ProblemType) => {
        const newProb = prompt('Edit Problem Type:', p.problem);
        if (!newProb || newProb === p.problem) return;
        try { await onEdit(p.id, newProb); }
        catch (e: any) { alert(e.message); }
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
                {/* Import row */}
                <div className="master-add-row" style={{ marginTop: 8 }}>
                    <input type="file" ref={fileRef} accept=".xlsx,.xls,.csv" style={{ flex: 1 }} />
                    <button className="btn btn-outline btn-sm" onClick={handleImport}>📥 Import</button>
                    <button className="btn btn-outline btn-sm" onClick={downloadTemplate}>📄 Template</button>
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
                                            <button className="btn-icon" onClick={() => handleEdit(p)}>✏️</button>
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