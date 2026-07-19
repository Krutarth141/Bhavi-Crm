'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { AutoInventoryItem, StockTxnType } from '@/types/autoInventory';

interface Props {
    item: AutoInventoryItem;
    onClose: () => void;
    onSave: (params: { type: StockTxnType; qty: number; date: string; dealer?: string; purchasePrice?: number; customer?: string; invoiceNo?: string; sellPrice?: number; note?: string }) => Promise<{ success: boolean; error?: string }>;
}

const fieldStyle = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const };
const labelStyle = { fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 };

const TYPE_STYLES: Record<StockTxnType, { bg: string; color: string; label: string }> = {
    in: { bg: '#dcfce7', color: '#065f46', label: '⬇️ Stock IN' },
    out: { bg: '#fee2e2', color: '#dc2626', label: '⬆️ Stock OUT' },
    sell: { bg: '#fef3c7', color: '#92400e', label: '💰 Sell' },
};

export default function StockModal({ item, onClose, onSave }: Props) {
    const [type, setType] = useState<StockTxnType>('in');
    const [qty, setQty] = useState('1');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [dealer, setDealer] = useState('');
    const [purchasePrice, setPurchasePrice] = useState(String(item.purchase_price || 0));
    const [customer, setCustomer] = useState('');
    const [invoiceNo, setInvoiceNo] = useState('');
    const [sellPrice, setSellPrice] = useState(String(item.selling_price || 0));
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        const q = Number(qty) || 0;
        if (q <= 0) { alert('Please enter a valid quantity!'); return; }
        if (type === 'sell' && !customer.trim()) { alert('Customer name required for Sell!'); return; }
        setSaving(true);
        const r = await onSave({
            type, qty: q, date,
            dealer: type === 'in' ? dealer.trim() : undefined,
            purchasePrice: type === 'in' ? (Number(purchasePrice) || undefined) : undefined,
            customer: type === 'sell' ? customer.trim() : undefined,
            invoiceNo: type === 'sell' ? invoiceNo.trim() : undefined,
            sellPrice: type === 'sell' ? (Number(sellPrice) || undefined) : undefined,
            note: note.trim() || undefined,
        });
        setSaving(false);
        if (r.success) onClose();
        else alert('Error: ' + r.error);
    };

    const footer = (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : '💾 Save'}</button>
        </div>
    );

    return (
        <Modal isOpen title="📦 Stock Update" onClose={onClose} footer={footer}>
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
                <b style={{ color: '#185FA5' }}>{item.item_name}</b>{item.brand ? <> &nbsp;·&nbsp; <span style={{ color: '#7c3aed' }}>{item.brand}</span></> : null}<br />
                <span style={{ color: '#6b7280' }}>Current Stock: <b style={{ color: (item.stock_qty || 0) > 0 ? '#065f46' : '#dc2626' }}>{item.stock_qty || 0} {item.unit || 'pcs'}</b></span>
            </div>

            <div style={{ display: 'flex', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', marginBottom: 14 }}>
                {(['in', 'out', 'sell'] as StockTxnType[]).map(t => (
                    <button key={t} onClick={() => setType(t)} style={{ flex: 1, padding: 9, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: type === t ? TYPE_STYLES[t].bg : '#f3f4f6', color: type === t ? TYPE_STYLES[t].color : '#6b7280', borderLeft: t !== 'in' ? '1px solid #e5e7eb' : 'none' }}>
                        {TYPE_STYLES[t].label}
                    </button>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div><label style={labelStyle}>Quantity *</label><input type="number" min={1} value={qty} onChange={e => setQty(e.target.value)} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={fieldStyle} /></div>
            </div>

            {type === 'in' && (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                        <div><label style={labelStyle}>Dealer / Supplier</label><input value={dealer} onChange={e => setDealer(e.target.value)} placeholder="e.g. Rashmi Traders" style={fieldStyle} /></div>
                        <div><label style={labelStyle}>Purchase Price / Unit ₹</label><input type="number" min={0} value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} style={fieldStyle} /></div>
                    </div>
                    <div><label style={labelStyle}>Note</label><input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. New stock arrived" style={fieldStyle} /></div>
                </>
            )}
            {type === 'out' && (
                <div><label style={labelStyle}>Purpose / Note</label><input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Used in site ABC, Damaged" style={fieldStyle} /></div>
            )}
            {type === 'sell' && (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                        <div><label style={labelStyle}>Customer Name *</label><input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="e.g. Rajesh Patel" style={fieldStyle} /></div>
                        <div><label style={labelStyle}>Invoice No</label><input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} placeholder="e.g. INV-2026-001" style={fieldStyle} /></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div><label style={labelStyle}>Selling Price / Unit ₹</label><input type="number" min={0} value={sellPrice} onChange={e => setSellPrice(e.target.value)} style={fieldStyle} /></div>
                        <div><label style={labelStyle}>Note</label><input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" style={fieldStyle} /></div>
                    </div>
                </>
            )}
        </Modal>
    );
}