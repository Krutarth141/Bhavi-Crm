'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { Brand, SubCategory, Model, ModelForm } from '@/types/masters';

interface Props {
    model: Model;
    brands: Brand[];
    subcategories: SubCategory[];
    onSave: (id: string, form: ModelForm) => Promise<void>;
    onClose: () => void;
}

const PRINTER_TYPES = [
    { value: '', label: 'Type' },
    { value: 'laser', label: '🖨️ Laser' },
    { value: 'inkjet', label: '💧 Inkjet' },
    { value: 'photo', label: '📸 Photo' },
    { value: 'scanner', label: '🖷 Scanner' },
    { value: 'camera', label: '📷 Camera' },
    { value: 'other', label: 'Other' },
];

const fieldStyle = { width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const };
const labelStyle = { fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 };

export default function ModelEditModal({ model, brands, subcategories, onSave, onClose }: Props) {
    const [modelNo, setModelNo] = useState(model.model_no);
    const [modelName, setModelName] = useState(model.model_name || '');
    const [brandId, setBrandId] = useState(model.brand_id || '');
    const [subcatId, setSubcatId] = useState(model.subcategory_id || '');
    const [printerType, setPrinterType] = useState(model.printer_type || '');
    const [salePrice, setSalePrice] = useState(model.sale_price != null ? String(model.sale_price) : '');
    const [saving, setSaving] = useState(false);

    const filteredSubcats = brandId ? subcategories.filter(s => s.brand_id === brandId) : subcategories;

    const handleSave = async () => {
        if (!modelNo.trim()) { alert('Enter model no'); return; }
        setSaving(true);
        try {
            await onSave(model.id, { model_no: modelNo, model_name: modelName, brand_id: brandId, subcategory_id: subcatId, printer_type: printerType, sale_price: salePrice });
            onClose();
        } catch (e: any) { alert('Error: ' + e.message); }
        finally { setSaving(false); }
    };

    return (
        <Modal isOpen title={`Edit Model — ${model.model_no}`} onClose={onClose} footer={
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>{saving ? 'Saving...' : '💾 Save'}</button>
            </div>
        }>
            <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Model No</label>
                <input type="text" value={modelNo} onChange={e => setModelNo(e.target.value)} style={fieldStyle} />
            </div>
            <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Model Name</label>
                <input type="text" value={modelName} onChange={e => setModelName(e.target.value)} style={fieldStyle} />
            </div>
            <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Brand</label>
                <select value={brandId} onChange={e => { setBrandId(e.target.value); setSubcatId(''); }} style={fieldStyle}>
                    <option value="">-- No Brand --</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
            </div>
            <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Sub-Category</label>
                <select value={subcatId} onChange={e => setSubcatId(e.target.value)} style={fieldStyle}>
                    <option value="">-- All / General --</option>
                    {filteredSubcats.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
            <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Printer / Product Type</label>
                <select value={printerType} onChange={e => setPrinterType(e.target.value)} style={fieldStyle}>
                    {PRINTER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
            </div>
            <div>
                <label style={labelStyle}>Sale Price (₹)</label>
                <input type="number" min={0} value={salePrice} onChange={e => setSalePrice(e.target.value)} placeholder="e.g. 12500" style={fieldStyle} />
            </div>
        </Modal>
    );
}