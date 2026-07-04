'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Brand, SubCategory, Model, ModelForm, emptyModelForm } from '@/types/masters';
import { importModels } from '@/services/masterService';

interface Props {
    brands: Brand[];
    subcategories: SubCategory[];
    models: Model[];
    onAdd: (form: ModelForm) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onRefresh: () => Promise<void>;
}

export default function ModelsTab({ brands, subcategories, models, onAdd, onDelete, onRefresh }: Props) {
    const [form, setForm] = useState<ModelForm>(emptyModelForm);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    // Filter subcategories by selected brand
    const filteredSubcats = form.brand_id
        ? subcategories.filter(s => s.brand_id === form.brand_id)
        : subcategories;

    const handleBrandChange = (brand_id: string) => {
        setForm({ ...form, brand_id, subcategory_id: '' });
    };

    const handleAdd = async () => {
        if (!form.model_no.trim()) { alert('Enter model number'); return; }
        setSaving(true);
        try { await onAdd(form); setForm(emptyModelForm); }
        catch (e: any) { alert(e.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this model?')) return;
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
            const rows = data.map((r: any) => ({
                model_no: r['Model No'] || r['model_no'] || '',
                model_name: r['Model Name'] || r['model_name'] || '',
                brand: r['Brand'] || '',
                sale_price: r['Sale Price'] || null,
            }));
            const count = await importModels(rows, brands);
            alert(`Imported ${count} models`);
            await onRefresh();
            if (fileRef.current) fileRef.current.value = '';
        };
        reader.readAsBinaryString(file);
    };

    const downloadTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet([
            ['Model No', 'Model Name', 'Brand', 'Sale Price'],
            ['WM-1234', 'WashPro 7kg', 'Samsung', 25000],
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Models');
        XLSX.writeFile(wb, 'models_template.xlsx');
    };

    const filteredModels = search.trim()
        ? models.filter(m =>
            m.model_no.toLowerCase().includes(search.toLowerCase()) ||
            m.model_name?.toLowerCase().includes(search.toLowerCase()) ||
            m.brand?.name?.toLowerCase().includes(search.toLowerCase())
        )
        : models;

    return (
        <div>
            <div className="card" style={{ marginBottom: 12 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 10, fontSize: 14, marginTop: 0 }}>Add Model</h3>
                <div className="master-add-row">
                    <select value={form.brand_id} onChange={e => handleBrandChange(e.target.value)} style={{ maxWidth: 160 }}>
                        <option value="">Select Brand</option>
                        {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <select value={form.subcategory_id} onChange={e => setForm({ ...form, subcategory_id: e.target.value })} style={{ maxWidth: 160 }}>
                        <option value="">Sub-Category</option>
                        {filteredSubcats.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <input
                        type="text"
                        placeholder="Model No. *"
                        value={form.model_no}
                        onChange={e => setForm({ ...form, model_no: e.target.value })}
                    />
                    <input
                        type="text"
                        placeholder="Model Name"
                        value={form.model_name}
                        onChange={e => setForm({ ...form, model_name: e.target.value })}
                    />
                    <input
                        type="number"
                        placeholder="Sale Price ₹"
                        value={form.sale_price}
                        onChange={e => setForm({ ...form, sale_price: e.target.value })}
                        style={{ maxWidth: 120 }}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <strong>Models List</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                            type="text"
                            placeholder="Search model..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ width: 180, fontSize: 13 }}
                        />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {filteredModels.length}/{models.length}
                        </span>
                    </div>
                </div>
                {!filteredModels.length ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No models found</p>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr><th>#</th><th>Model No.</th><th>Model Name</th><th>Brand</th><th>Sub-Category</th><th>Sale Price</th><th>Action</th></tr>
                            </thead>
                            <tbody>
                                {filteredModels.map((m, i) => (
                                    <tr key={m.id}>
                                        <td>{i + 1}</td>
                                        <td><strong>{m.model_no}</strong></td>
                                        <td>{m.model_name || '—'}</td>
                                        <td>{m.brand?.name || '—'}</td>
                                        <td>{m.subcategory?.name || '—'}</td>
                                        <td>{m.sale_price ? `₹${m.sale_price.toLocaleString()}` : '—'}</td>
                                        <td>
                                            <button className="btn-icon" onClick={() => handleDelete(m.id)} style={{ color: 'var(--danger)' }}>🗑️</button>
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