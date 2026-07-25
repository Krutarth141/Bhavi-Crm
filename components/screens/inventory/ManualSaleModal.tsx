'use client';

import { useState } from 'react';
import { InventoryItem } from '@/types/inventory';
import { saveManualSale } from '@/services/inventorySaleService';

interface Props {
    inventory: InventoryItem[];
    addedBy: string;
    onClose: () => void;
    onSaved: () => void;
}

const fieldStyle = { width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' as const };
const labelStyle = { fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 4 };

export default function ManualSaleModal({ inventory, addedBy, onClose, onSaved }: Props) {
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [saleType, setSaleType] = useState<'dealer' | 'customer'>('dealer');
    const [customer, setCustomer] = useState('');
    const [mobile, setMobile] = useState('');
    const [partCode, setPartCode] = useState('');
    const [qty, setQty] = useState('1');
    const [price, setPrice] = useState('0');
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    const availableItems = inventory.filter(i => i.qty_in_stock > 0);
    const selectedItem = availableItems.find(i => i.part_code === partCode);
    const availStock = selectedItem?.qty_in_stock || 0;
    const total = (Number(qty) || 0) * (Number(price) || 0);

    const handlePartChange = (code: string) => {
        setPartCode(code);
        const item = availableItems.find(i => i.part_code === code);
        if (item) setPrice(String(item.unit_price || 0));
    };

    const handleSave = async () => {
        if (!date || !customer.trim() || !partCode || !qty || !price) { alert('Please fill all required fields'); return; }
        const q = Number(qty) || 0;
        if (q > availStock) { alert(`Insufficient stock! Available: ${availStock}`); return; }

        setSaving(true);
        const r = await saveManualSale({
            date, saleType, customer: customer.trim(), mobile: mobile.trim(),
            partCode, partName: selectedItem?.item_name || '', availStock,
            qty: q, price: Number(price) || 0, note: note.trim(),
            inventory, addedBy,
        });
        setSaving(false);
        if (r.success) {
            alert('✅ Sale saved! Stock updated.');
            onSaved();
            onClose();
        } else alert('Error: ' + r.error);
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
            <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
                    <h2 style={{ margin: 0, fontSize: 18 }}>💰 Manual Sale Entry</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ padding: 20 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div><label style={labelStyle}>Date *</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={fieldStyle} /></div>
                        <div>
                            <label style={labelStyle}>Sale Type *</label>
                            <select value={saleType} onChange={e => setSaleType(e.target.value as 'dealer' | 'customer')} style={fieldStyle}>
                                <option value="dealer">Dealer</option>
                                <option value="customer">Direct Customer</option>
                            </select>
                        </div>
                        <div><label style={labelStyle}>Customer / Dealer Name *</label><input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Name" style={fieldStyle} /></div>
                        <div><label style={labelStyle}>Mobile</label><input type="tel" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="Optional" style={fieldStyle} /></div>
                        <div>
                            <label style={labelStyle}>Part *</label>
                            <select value={partCode} onChange={e => handlePartChange(e.target.value)} style={fieldStyle}>
                                <option value="">-- Select Part --</option>
                                {availableItems.map(i => (
                                    <option key={i.id} value={i.part_code || ''}>{i.part_code || ''} — {i.item_name} (Stock: {i.qty_in_stock})</option>
                                ))}
                            </select>
                        </div>
                        <div><label style={labelStyle}>Qty *</label><input type="number" min={1} value={qty} onChange={e => setQty(e.target.value)} style={fieldStyle} /></div>
                        <div><label style={labelStyle}>Unit Price ₹ *</label><input type="number" min={0} value={price} onChange={e => setPrice(e.target.value)} style={fieldStyle} /></div>
                    </div>
                    <div style={{ marginTop: 10 }}><label style={labelStyle}>Note</label><input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" style={fieldStyle} /></div>
                    <div style={{ marginTop: 12, background: '#f9fafb', borderRadius: 8, padding: 10, fontSize: 13 }}>
                        Total: <b>₹{total.toFixed(0)}</b> &nbsp;|&nbsp; Available Stock: <b>{partCode ? availStock : '-'}</b>
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 20px', borderTop: '1px solid #e5e7eb' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
                    <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : '💾 Save Sale'}</button>
                </div>
            </div>
        </div>
    );
}