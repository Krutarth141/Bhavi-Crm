'use client';

import { useRef, useState } from 'react';
import Modal from '@/components/Modal';
import { SalesProduct } from '@/types/sales';

interface Props {
    product: SalesProduct | null;
    onClose: () => void;
    onSave: (id: string | null, data: Partial<SalesProduct>) => Promise<{ success: boolean; error?: string }>;
}

export default function ProductFormModal({ product, onClose, onSave }: Props) {
    const [name, setName] = useState(product?.name || '');
    const [model, setModel] = useState(product?.model || '');
    const [category, setCategory] = useState(product?.category || '');
    const [price, setPrice] = useState(String(product?.price || ''));
    const [gstPct, setGstPct] = useState(String(product?.gst_percent ?? 18));
    const [stockStatus, setStockStatus] = useState<'available' | 'out_of_stock'>(product?.stock_status || 'available');
    const [description, setDescription] = useState(product?.description || '');
    const [featuresText, setFeaturesText] = useState((product?.features || []).join('; '));
    const [specsText, setSpecsText] = useState(Object.entries(product?.specifications || {}).map(([k, v]) => `${k}: ${v}`).join(' ; '));
    const [imageUrl, setImageUrl] = useState(product?.image_url || '');
    const fileRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleImageUpload = async () => {
        const file = fileRef.current?.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            setImageUrl(base64);
        } catch (e: any) {
            alert('Upload failed: ' + e.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!name.trim() || !Number(price)) { alert('Product name and selling price are required.'); return; }
        const features = featuresText.split(';').map(s => s.trim()).filter(Boolean);
        const specifications: Record<string, string> = {};
        specsText.split(';').forEach(s => {
            const kv = s.split(':');
            if (kv.length >= 2) specifications[kv[0].trim()] = kv.slice(1).join(':').trim();
        });
        setSaving(true);
        const r = await onSave(product?.id || null, {
            name: name.trim(), model: model.trim(), category: category.trim(),
            price: Number(price), gst_percent: Number(gstPct) || 18, stock_status: stockStatus,
            description: description.trim(), features, specifications, image_url: imageUrl.trim(),
        });
        setSaving(false);
        if (r.success) onClose();
        else alert('Error: ' + r.error);
    };

    const footer = (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontWeight: 600, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : 'Save Product'}</button>
        </div>
    );

    return (
        <Modal isOpen title={product ? 'Edit Product' : 'Add New Product'} onClose={onClose} footer={footer}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>Product Name *</label>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Canon GI-790 BK Ink Bottle" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>Model No.</label>
                        <input value={model} onChange={e => setModel(e.target.value)} placeholder="GI-790-BK" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>Category</label>
                        <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Ink / Printer" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                    </div>
                </div>
                <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>Selling Price (₹) * <span style={{ fontWeight: 400, color: '#10b981', fontSize: 11 }}>— Customer pays this exact amount (all taxes included)</span></label>
                    <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="595" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>GST % <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: 10 }}>(invoice only)</span></label>
                        <input type="number" value={gstPct} onChange={e => setGstPct(e.target.value)} placeholder="18" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>Stock Status</label>
                        <select value={stockStatus} onChange={e => setStockStatus(e.target.value as any)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }}>
                            <option value="available">In Stock</option>
                            <option value="out_of_stock">Out of Stock</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>Description</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Brief product description..." style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
                <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>Key Features <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: 10 }}>(semicolons)</span></label>
                    <input value={featuresText} onChange={e => setFeaturesText(e.target.value)} placeholder="WiFi Enabled; Duplex; High Yield" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>Specifications <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: 10 }}>(Key: Value ; Key: Value)</span></label>
                    <input value={specsText} onChange={e => setSpecsText(e.target.value)} placeholder="Speed: 9ipm ; Resolution: 4800x1200" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                {imageUrl && <img src={imageUrl} style={{ width: 100, height: 100, objectFit: 'contain', border: '1px solid #e2e8f0', borderRadius: 8 }} />}
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, padding: 10, cursor: 'pointer' }}>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                    <span style={{ fontSize: 13, color: '#475569' }}>{uploading ? 'Uploading...' : '📷 Upload Product Image'}</span>
                </label>
            </div>
        </Modal>
    );
}