'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Brand, BrandForm, emptyBrandForm } from '@/types/masters';
import { importBrands } from '@/services/masterService';

interface Props {
    brands: Brand[];
    onAdd: (form: BrandForm) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onRefresh: () => Promise<void>;
}

export default function BrandsTab({ brands, onAdd, onDelete, onRefresh }: Props) {
    const [form, setForm] = useState<BrandForm>(emptyBrandForm);
    const [saving, setSaving] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleAdd = async () => {
        if (!form.name.trim()) { alert('Enter brand name'); return; }
        setSaving(true);
        try { await onAdd(form); setForm(emptyBrandForm); }
        catch (e: any) { alert(e.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this brand?')) return;
        try { await onDelete(id); }
        catch (e: any) { alert(e.message); }
    };

    const handleImport = async () => {
        const file = fileRef.current?.files?.[0];
        if (!file) { alert('Select a file first'); return; }
        const reader = new FileReader();
        reader.onload = async (e) => {
            const wb = XLSX.read(e.target?.result, { type: 'binary' });
            const data = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]]);
            const rows = data.map((r: any) => ({ name: r['Brand Name'] || r['name'] || '' }));
            const count = await importBrands(rows);
            alert(`Imported ${count} brands`);
            await onRefresh();
            if (fileRef.current) fileRef.current.value = '';
        };
        reader.readAsBinaryString(file);
    };

    const downloadTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet([['Brand Name'], ['Example Brand']]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Brands');
        XLSX.writeFile(wb, 'brands_template.xlsx');
    };

    return (
        <div>
            {/* Add form */}
            <div className="card" style={{ marginBottom: 12 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 10, fontSize: 14, marginTop: 0 }}>Add Brand</h3>
                <div className="master-add-row">
                    <input
                        type="text"
                        placeholder="Brand name"
                        value={form.name}
                        onChange={e => setForm({ name: e.target.value })}
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

            {/* Table */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <strong>Brand List</strong>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total: {brands.length}</span>
                </div>
                {!brands.length ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No brands yet</p>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead><tr><th>#</th><th>Brand Name</th><th>Action</th></tr></thead>
                            <tbody>
                                {brands.map((b, i) => (
                                    <tr key={b.id}>
                                        <td>{i + 1}</td>
                                        <td><strong>{b.name}</strong></td>
                                        <td>
                                            <button className="btn-icon" onClick={() => handleDelete(b.id)} style={{ color: 'var(--danger)' }} title="Delete">🗑️</button>
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