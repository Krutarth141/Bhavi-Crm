'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { SalesOrder } from '@/types/sales';

interface Props {
    order: SalesOrder;
    onClose: () => void;
    onSave: (note: string) => Promise<{ success: boolean; error?: string }>;
}

export default function DeliveryModal({ order, onClose, onSave }: Props) {
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        const r = await onSave(note.trim());
        setSaving(false);
        if (r.success) onClose();
        else alert('Error: ' + r.error);
    };

    const footer = (
        <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '9px 18px', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, opacity: saving ? 0.6 : 1 }}>✅ Confirm Delivered</button>
            <button onClick={onClose} style={{ padding: '9px 18px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
        </div>
    );

    return (
        <Modal isOpen title={`Confirm Delivery — ${order.customer_name}`} onClose={onClose} footer={footer}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: '#d1fae5', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 36, marginBottom: 6 }}>🎉</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#065f46' }}>Mark order as Delivered?</div>
                    <div style={{ fontSize: 12, color: '#059669', marginTop: 4 }}>A WhatsApp thank-you message will be sent to the customer.</div>
                </div>
                <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>Delivery Note (optional)</label>
                    <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Delivered to John at door, left with security..." style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
            </div>
        </Modal>
    );
}