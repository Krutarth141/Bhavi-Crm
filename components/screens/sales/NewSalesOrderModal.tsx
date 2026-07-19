'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { SalesProduct } from '@/types/sales';

interface OrderItemRow { productId: string; qty: number; }

interface Props {
    products: SalesProduct[];
    createdBy: string;
    onClose: () => void;
    onSave: (form: { customer_name: string; customer_mobile: string; customer_address: string; notes: string; items: { product_id: string; name: string; price: number; gst_percent: number; qty: number }[]; createdBy: string }) => Promise<{ success: boolean; error?: string; order?: any }>;
}

export default function NewSalesOrderModal({ products, createdBy, onClose, onSave }: Props) {
    const [cname, setCname] = useState('');
    const [mobile, setMobile] = useState('');
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');
    const [rows, setRows] = useState<OrderItemRow[]>([{ productId: '', qty: 1 }]);
    const [saving, setSaving] = useState(false);

    const addRow = () => setRows(r => [...r, { productId: '', qty: 1 }]);
    const removeRow = (idx: number) => setRows(r => r.filter((_, i) => i !== idx));
    const updateRow = (idx: number, patch: Partial<OrderItemRow>) => setRows(r => r.map((row, i) => i === idx ? { ...row, ...patch } : row));

    const total = rows.reduce((sum, row) => {
        const p = products.find(pr => pr.id === row.productId);
        return sum + (p ? p.price * row.qty : 0);
    }, 0);

    const handleSave = async () => {
        if (!cname.trim() || !mobile.trim()) { alert('Customer name and mobile number are required.'); return; }
        const items = rows.filter(r => r.productId).map(r => {
            const p = products.find(pr => pr.id === r.productId)!;
            return { product_id: p.id, name: p.name + (p.model ? ` (${p.model})` : ''), price: p.price, gst_percent: p.gst_percent || 18, qty: r.qty };
        });
        if (!items.length) { alert('Please select at least one product.'); return; }
        setSaving(true);
        const r = await onSave({ customer_name: cname.trim(), customer_mobile: mobile.trim(), customer_address: address.trim(), notes: notes.trim(), items, createdBy });
        setSaving(false);
        if (r.success) { alert(`Order ${r.order?.order_no} created!`); onClose(); }
        else alert('Error: ' + r.error);
    };

    const footer = (
        <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '9px 18px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : 'Save Order'}</button>
            <button onClick={onClose} style={{ padding: '9px 18px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
        </div>
    );

    return (
        <Modal isOpen title="Create New Order" onClose={onClose} footer={footer}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>Customer Name *</label>
                        <input value={cname} onChange={e => setCname(e.target.value)} placeholder="Full Name" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>Mobile No. *</label>
                        <input value={mobile} onChange={e => setMobile(e.target.value)} placeholder="10-digit mobile" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                    </div>
                </div>
                <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>Delivery Address</label>
                    <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
                <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>Notes</label>
                    <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Special instructions..." style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                </div>

                {rows.map((row, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <select value={row.productId} onChange={e => updateRow(idx, { productId: e.target.value })} style={{ flex: 3, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }}>
                            <option value="">— Select Product —</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}{p.model ? ` (${p.model})` : ''} — ₹{p.price.toLocaleString('en-IN')}</option>)}
                        </select>
                        <input type="number" min={1} value={row.qty} onChange={e => updateRow(idx, { qty: Number(e.target.value) || 1 })} style={{ width: 64, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }} />
                        {rows.length > 1 && <button onClick={() => removeRow(idx)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '7px 10px', cursor: 'pointer', fontWeight: 700 }}>✕</button>}
                    </div>
                ))}
                <button onClick={addRow} style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 7, padding: '7px 12px', fontSize: 13, cursor: 'pointer', alignSelf: 'flex-start' }}>+ Add Item</button>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <b style={{ fontSize: 16 }}>Total: ₹{Math.round(total).toLocaleString('en-IN')}</b>
                    <span style={{ fontSize: 11, color: '#10b981' }}>All taxes included</span>
                </div>
            </div>
        </Modal>
    );
}