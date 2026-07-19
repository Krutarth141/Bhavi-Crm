'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { SalesOrder } from '@/types/sales';

interface Props {
    order: SalesOrder;
    onClose: () => void;
    onSave: (courier: string, awb: string, date: string, trackUrl: string, notes: string) => Promise<{ success: boolean; error?: string }>;
}

export default function DispatchModal({ order, onClose, onSave }: Props) {
    const [courier, setCourier] = useState('');
    const [awb, setAwb] = useState('');
    const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [trackUrl, setTrackUrl] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!courier.trim() || !awb.trim()) { alert('Courier name and AWB number are required.'); return; }
        setSaving(true);
        const r = await onSave(courier.trim(), awb.trim(), date, trackUrl.trim(), notes.trim());
        setSaving(false);
        if (r.success) onClose();
        else alert('Error: ' + r.error);
    };

    const footer = (
        <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '9px 18px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, opacity: saving ? 0.6 : 1 }}>🚚 Dispatch & Notify Customer</button>
            <button onClick={onClose} style={{ padding: '9px 18px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
        </div>
    );

    return (
        <Modal isOpen title={`Dispatch Details — ${order.customer_name}`} onClose={onClose} footer={footer}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>Courier / Logistics Partner *</label>
                    <input value={courier} onChange={e => setCourier(e.target.value)} placeholder="e.g. DTDC, Blue Dart, Delhivery" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>AWB / Tracking Number *</label>
                    <input value={awb} onChange={e => setAwb(e.target.value)} placeholder="e.g. 1234567890" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>Dispatch Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>Tracking URL (optional)</label>
                    <input value={trackUrl} onChange={e => setTrackUrl(e.target.value)} placeholder="https://tracking.dtdc.com/..." style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>Notes (optional)</label>
                    <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Packed securely, fragile item..." style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div style={{ background: '#fffbeb', borderRadius: 8, padding: 10, fontSize: 12, color: '#92400e' }}>📲 A WhatsApp message with tracking details will be sent to the customer automatically.</div>
            </div>
        </Modal>
    );
}