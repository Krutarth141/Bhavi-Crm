'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Brand, SubCategory, SubCategoryForm, emptySubCategoryForm } from '@/types/masters';
import { importSubCategories } from '@/services/masterService';

interface Props {
    brands: Brand[];
    subcategories: SubCategory[];
    onAdd: (form: SubCategoryForm) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onRefresh: () => Promise<void>;
}

export default function SubCategoriesTab({ brands, subcategories, onAdd, onDelete, onRefresh }: Props) {
    const [form, setForm] = useState<SubCategoryForm>(emptySubCategoryForm);
    const [saving, setSaving] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleAdd = async () => {
        if (!form.name.trim()) { alert('Enter sub-category name'); return; }
        if (!form.brand_id) { alert('Select a brand'); return; }
        setSaving(true);
        try { await onAdd(form); setForm(emptySubCategoryForm); }
        catch (e: any) { alert(e.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this sub-category?')) return;
        try { await onDelete(id); }
        catch (e: any) { alert(e.message); }
    };

    const handleImport = async () => {
        const file = fileRef.current?.files?.[0];
        if (!file) { alert('Select a file'); return; }
        const reader = new FileReader();
        reader.onload = async (e) => {
            const wb = XLSX.read(e.target?.result, { type: 'binary' });
            const data = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]]);
            const rows = data.map((r: any) => ({ brand: r['Brand'] || '', name: r['Sub-Category'] || r['name'] || '' }));
            const count = await importSubCategories(rows, brands);
            alert(`Imported ${count} sub-categories`);
            await onRefresh();
            if (fileRef.current) fileRef.current.value = '';
        };
        reader.readAsBinaryString(file);
    };

    const downloadTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet([['Brand', 'Sub-Category'], ['Samsung', 'Washing Machine']]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'SubCategories');
        XLSX.writeFile(wb, 'subcategories_template.xlsx');
    };

    return (
        <div>
            <div className="card" style={{ marginBottom: 12 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 10, fontSize: 14, marginTop: 0 }}>Add Sub-Category</h3>
                <div className="master-add-row">
                    <select
                        value={form.brand_id}
                        onChange={e => setForm({ ...form, brand_id: e.target.value })}
                        style={{ maxWidth: 180 }}
                    >
                        <option value="">Select Brand *</option>
                        {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <input
                        type="text"
                        placeholder="Sub-category name"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    />
                    <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={saving}>
                        {saving ? 'Adding...' : '+ Add'}
                    </button>
                </div>
                <div className="master-add-row" style={{ marginTop: 8 }}>
                    <input type="file" ref={fileRef} accept=".xlsx,.xls,.csv" style={{ flex: 1 }} />
                    <button className="btn btn-outline btn-sm" onClick={handleImport}>📥 Import</button>
                    <button className="btn btn-outline btn-sm" onClick={downloadTemplate}>📄 Template</button>
                </div>
            </div>

            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <strong>Sub-Categories List</strong>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total: {subcategories.length}</span>
                </div>
                {!subcategories.length ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No sub-categories yet</p>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead><tr><th>#</th><th>Sub-Category</th><th>Brand</th><th>Action</th></tr></thead>
                            <tbody>
                                {subcategories.map((sc, i) => (
                                    <tr key={sc.id}>
                                        <td>{i + 1}</td>
                                        <td><strong>{sc.name}</strong></td>
                                        <td>{sc.brand?.name || '—'}</td>
                                        <td>
                                            <button className="btn-icon" onClick={() => handleDelete(sc.id)} style={{ color: 'var(--danger)' }}>🗑️</button>
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