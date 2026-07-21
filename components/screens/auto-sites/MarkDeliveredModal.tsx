'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { AutoSiteItem } from '@/types/autoSites';

interface Props {
    item: AutoSiteItem;
    onClose: () => void;
    onSave: (params: { deliveredQty: number; date: string; via: string; by: string; note: string }) => Promise<{ success: boolean; error?: string }>;
}

const fieldStyle = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const };
const labelStyle = { fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 };

export default function MarkDeliveredModal({ item, onClose, onSave }: Props) {
    const totalQty = item.qty || 0;
    const [qty, setQty] = useState(String(totalQty));
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [via, setVia] = useState('By Hand');
    const [by, setBy] = useState('');
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        const r = await onSave({ deliveredQty: Number(qty) || 0, date, via, by: by.trim(), note: note.trim() });
        setSaving(false);
        if (r.success) onClose();
        else alert('Error: ' + r.error);
    };

    const footer = (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : '✅ Save Delivery'}</button>
        </div>
    );

    return (
        <Modal isOpen title="📦 Mark Delivered" onClose={onClose} footer={footer} size="sm">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div><label style={labelStyle}>Delivered Qty (Total: {totalQty})</label><input type="number" min={0.01} max={totalQty} step="any" value={qty} onChange={e => setQty(e.target.value)} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Delivery Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={fieldStyle} /></div>
            </div>
            <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>Delivered Via</label>
                <select value={via} onChange={e => setVia(e.target.value)} style={fieldStyle}>
                    {['By Hand', 'Courier', 'Porter', 'Company Vehicle', 'Other'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
            </div>
            <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>Delivered By / Docket No</label>
                <input value={by} onChange={e => setBy(e.target.value)} placeholder="Name or Docket No..." style={fieldStyle} />
            </div>
            <div>
                <label style={labelStyle}>Note (optional)</label>
                <input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note..." style={fieldStyle} />
            </div>
        </Modal>
    );
}