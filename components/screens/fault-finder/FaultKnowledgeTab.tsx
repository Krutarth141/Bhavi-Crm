'use client';

import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { FaultKnowledge, FaultKnowledgeForm, emptyFaultForm, SEVERITIES } from '@/types/faultFinder';
import { bulkImportFaultKnowledge } from '@/services/faultFinderService';

interface Props {
    faults: FaultKnowledge[];
    isAdmin: boolean;
    currentUserName?: string;
    onAdd: (form: FaultKnowledgeForm, byUser?: string) => Promise<{ success: boolean; error?: string }>;
    onEdit: (id: string, form: FaultKnowledgeForm) => Promise<{ success: boolean; error?: string }>;
    onDelete: (id: string) => Promise<{ success: boolean; error?: string }>;
    onRefetch: () => Promise<void>;
}

// index.html:28464,28477 — plain colored text, no background pill.
const SeverityBadge = ({ s }: { s?: string }) => {
    const map: Record<string, string> = { Low: '#059669', Medium: '#d97706', High: '#dc2626', Critical: '#7c3aed' };
    return s ? <span style={{ fontSize: 12, fontWeight: 700, color: map[s] || '#374151' }}>{s}</span> : null;
};

const fieldStyle = { width: '100%', padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' as const, fontFamily: 'inherit' };

export default function FaultKnowledgeTab({ faults, isAdmin, currentUserName, onAdd, onEdit, onDelete, onRefetch }: Props) {
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<FaultKnowledgeForm>(emptyFaultForm);
    const [saving, setSaving] = useState(false);
    const importRef = useRef<HTMLInputElement>(null);

    const startAdd = () => { setEditingId(null); setForm(emptyFaultForm); setShowForm(true); };
    const startEdit = (f: FaultKnowledge) => {
        setEditingId(f.id);
        setForm({
            model_name: f.model_name || '', fault_type: f.fault_type || '',
            description: f.description || '', solution: f.solution || '',
            part_required: f.part_required || '', severity: f.severity || 'Medium',
        });
        setShowForm(true);
    };
    const cancelForm = () => { setShowForm(false); setEditingId(null); setForm(emptyFaultForm); };

    const handleSave = async () => {
        if (!form.model_name.trim() || !form.fault_type.trim()) { alert('Model name and fault type required'); return; }
        setSaving(true);
        const result = editingId ? await onEdit(editingId, form) : await onAdd(form, currentUserName);
        if (result.success) cancelForm();
        else alert('Error: ' + result.error);
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this fault entry?')) return;
        const result = await onDelete(id);
        if (!result.success) alert('Error: ' + result.error);
    };

    const downloadTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet([
            ['model_name', 'fault_type', 'description', 'solution', 'part_required', 'severity'],
            ['Canon G3010', 'Paper Jam', 'Paper gets stuck in paper feed path', '1. Open back cover\n2. Remove jammed paper\n3. Check roller for wear\n4. Clean roller with damp cloth', 'CNX-Roller-Kit', 'Medium'],
            ['Canon G3010', 'No Print / Blank Page', 'Printer prints but page comes out blank', '1. Check ink tanks - refill if empty\n2. Run head cleaning 2-3 times\n3. Print nozzle check pattern', '', 'Low'],
            ['Epson L3110', 'Ink Not Recognized', 'Ink tank shows error even after refilling', '1. Remove and reinsert ink tanks\n2. Check ink tube for air bubbles\n3. Run ink charge cycle', '', 'High'],
        ]);
        ws['!cols'] = [{ wch: 18 }, { wch: 20 }, { wch: 30 }, { wch: 50 }, { wch: 20 }, { wch: 12 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Fault Knowledge');
        XLSX.writeFile(wb, 'fault_knowledge_template.xlsx');
    };

    const handleImport = () => {
        const file = importRef.current?.files?.[0];
        if (!file) { alert('Select a file first'); return; }
        const reader = new FileReader();
        reader.onload = async (e) => {
            const wb = XLSX.read(e.target?.result, { type: 'binary' });
            const data = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]], { defval: '' });
            if (!data.length) { alert('File has no data'); return; }
            const rows = data.map(r => ({
                model_name: String(r.model_name || r['Model Name'] || '').trim(),
                fault_type: String(r.fault_type || r['Fault Type'] || '').trim(),
                description: String(r.description || r['Description'] || '').trim(),
                solution: String(r.solution || r['Solution'] || '').trim(),
                part_required: String(r.part_required || r['Part Required'] || '').trim(),
                severity: String(r.severity || r['Severity'] || 'Medium').trim(),
            }));
            const { ok, fail } = await bulkImportFaultKnowledge(rows, currentUserName);
            alert(`✅ Import complete!\nSuccess: ${ok}\nFailed: ${fail}`);
            if (importRef.current) importRef.current.value = '';
            await onRefetch();
        };
        reader.readAsBinaryString(file);
    };

    if (!faults.length && !showForm) {
        return (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <p style={{ color: '#6b7280', marginBottom: 12 }}>No fault knowledge entries yet</p>
                <button onClick={startAdd} style={{ padding: '7px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>➕ Add First Entry</button>
            </div>
        );
    }

    return (
        <div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>📚 Knowledge Base ({faults.length} entries)</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <button onClick={downloadTemplate} style={{ padding: '7px 14px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>📄 Template</button>
                {/* index.html:28314 — Import Excel is admin-only; Add Fault/Template
                    stay open to every engineer (canManage = isAdmin||isEng there). */}
                {isAdmin && (
                    <>
                        <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" style={{ fontSize: 12, maxWidth: 160 }} />
                        <button onClick={handleImport} style={{ padding: '7px 14px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>📥 Import Excel</button>
                    </>
                )}
                <button onClick={showForm ? cancelForm : startAdd} style={{ padding: '7px 14px', background: showForm ? '#f3f4f6' : '#185FA5', color: showForm ? '#374151' : '#fff', border: showForm ? '1px solid #e5e7eb' : 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
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
                    <button onClick={handleSave} disabled={saving} style={{ padding: '7px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                        {saving ? 'Saving...' : editingId ? '💾 Update' : '💾 Save'}
                    </button>
                </div>
            )}

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                            {(isAdmin
                                ? ['#', 'Model', 'Fault Type', 'Description', 'Solution', 'Part Required', 'Severity', 'Actions']
                                : ['#', 'Model', 'Fault Type', 'Description', 'Solution', 'Part Required', 'Severity']
                            ).map(h => (
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
                                {/* index.html:28478 — Edit/Delete are strictly admin-only. */}
                                {isAdmin && (
                                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                                        <button onClick={() => startEdit(f)} style={{ padding: '3px 8px', border: '1px solid #7c3aed', color: '#7c3aed', background: '#fff', borderRadius: 5, fontSize: 11, cursor: 'pointer', marginRight: 4 }}>✏️</button>
                                        <button onClick={() => handleDelete(f.id)} style={{ padding: '3px 8px', border: '1px solid #ef4444', color: '#ef4444', background: '#fff', borderRadius: 5, fontSize: 11, cursor: 'pointer' }}>🗑️</button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}