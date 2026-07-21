'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { AutoSiteItem, DISPATCH_MODES } from '@/types/autoSites';

interface Props {
    siteName: string;
    pendingItems: AutoSiteItem[];
    onClose: () => void;
    onSave: (params: { date: string; mode: string; deliveredBy: string; receiverName: string; notes: string; items: { item: AutoSiteItem; qty: number }[] }) => Promise<{ success: boolean; error?: string }>;
}

const fieldStyle = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const };
const labelStyle = { fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 };

export default function DispatchModal({ siteName, pendingItems, onClose, onSave }: Props) {
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [mode, setMode] = useState(DISPATCH_MODES[0]);
    const [deliveredBy, setDeliveredBy] = useState('');
    const [receiverName, setReceiverName] = useState('');
    const [notes, setNotes] = useState('');
    const [checked, setChecked] = useState<Record<number, boolean>>(() => Object.fromEntries(pendingItems.map(it => [it.id, true])));
    const [qtys, setQtys] = useState<Record<number, string>>(() => Object.fromEntries(pendingItems.map(it => [it.id, String(Math.max(0, (it.qty || 0) - (it.delivered_qty || 0)))])));
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        const items = pendingItems
            .filter(it => checked[it.id])
            .map(it => ({ item: it, qty: Number(qtys[it.id]) || 0 }))
            .filter(d => d.qty > 0);
        if (!items.length) { alert('Koi item select nahi karyu!'); return; }
        if (!date) { alert('Date required!'); return; }
        setSaving(true);
        const r = await onSave({ date, mode, deliveredBy: deliveredBy.trim(), receiverName: receiverName.trim(), notes: notes.trim(), items });
        setSaving(false);
        if (r.success) onClose();
        else alert('Error: ' + r.error);
    };

    const footer = (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : '📤 Dispatch & Generate DC'}</button>
        </div>
    );

    return (
        <Modal isOpen title={`📤 Material Dispatch — ${siteName}`} onClose={onClose} footer={footer} size="lg">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div><label style={labelStyle}>Dispatch Date *</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Delivery Mode</label>
                    <select value={mode} onChange={e => setMode(e.target.value)} style={fieldStyle}>
                        {DISPATCH_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div><label style={labelStyle}>Delivered By / Docket No</label><input value={deliveredBy} onChange={e => setDeliveredBy(e.target.value)} placeholder="Name or Docket No..." style={fieldStyle} /></div>
                <div><label style={labelStyle}>Receiver Name</label><input value={receiverName} onChange={e => setReceiverName(e.target.value)} placeholder="Site par receive karnaru naam..." style={fieldStyle} /></div>
            </div>
            <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Note</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Koi note..." style={fieldStyle} />
            </div>

            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>📦 Pending Items — Select items to dispatch</h3>
            {pendingItems.map(it => {
                const remaining = Math.max(0, (it.qty || 0) - (it.delivered_qty || 0));
                const statusColor = it.delivery_status === 'partial' ? '#d97706' : '#dc2626';
                const statusTxt = it.delivery_status === 'partial' ? `🟡 Partial (${it.delivered_qty || 0}/${it.qty})` : '🔴 Pending';
                return (
                    <div key={it.id} style={{ background: '#f8fafc', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto 100px', gap: 10, alignItems: 'center' }}>
                            <input type="checkbox" checked={!!checked[it.id]} onChange={e => setChecked(c => ({ ...c, [it.id]: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                            <div><b style={{ fontSize: 13 }}>{it.item_name}</b><span style={{ fontSize: 11, color: statusColor, marginLeft: 8 }}>{statusTxt}</span></div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>BOQ: {it.qty}{it.unit ? ` ${it.unit}` : ''}</div>
                            <div style={{ textAlign: 'center' }}>
                                <label style={{ fontSize: 10, display: 'block', color: '#6b7280' }}>Dispatch Qty</label>
                                <input type="number" min={0.01} max={it.qty} step="any" value={qtys[it.id] ?? String(remaining)} onChange={e => setQtys(q => ({ ...q, [it.id]: e.target.value }))} style={{ width: 90, border: '1px solid #e5e7eb', borderRadius: 6, padding: '5px 8px', fontSize: 13, textAlign: 'center', outline: 'none' }} />
                            </div>
                        </div>
                    </div>
                );
            })}
        </Modal>
    );
}