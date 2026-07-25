'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { Brand, SubCategory, SubCategoryForm } from '@/types/masters';

interface Props {
    subcategory: SubCategory;
    brands: Brand[];
    onSave: (id: string, form: SubCategoryForm) => Promise<void>;
    onClose: () => void;
}

export default function SubCategoryEditModal({ subcategory, brands, onSave, onClose }: Props) {
    const [name, setName] = useState(subcategory.name);
    const [brandId, setBrandId] = useState(subcategory.brand_id || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) { alert('Enter name'); return; }
        setSaving(true);
        try { await onSave(subcategory.id, { name, brand_id: brandId }); onClose(); }
        catch (e: any) { alert(e.message); }
        finally { setSaving(false); }
    };

    return (
        <Modal isOpen title="Edit Sub-Category" onClose={onClose} footer={
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>{saving ? 'Saving...' : '💾 Save'}</button>
            </div>
        }>
            <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Brand</label>
                <select value={brandId} onChange={e => setBrandId(e.target.value)} style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none' }}>
                    <option value="">-- No Brand --</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
            </div>
            <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none' }} />
            </div>
        </Modal>
    );
}