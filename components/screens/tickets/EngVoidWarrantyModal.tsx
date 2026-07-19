'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { engVoidWarranty, WarrantyTicketLike } from '@/services/warrantyClaimService';

interface Props {
    ticket: WarrantyTicketLike;
    byUser: string;
    onClose: () => void;
    onDone: () => void;
}

export default function EngVoidWarrantyModal({ ticket, byUser, onClose, onDone }: Props) {
    const [reason, setReason] = useState('');
    const [charges, setCharges] = useState('300');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!reason.trim()) { alert('Reason is mandatory!'); return; }
        setSaving(true);
        const r = await engVoidWarranty(ticket, reason.trim(), Number(charges) || 0, byUser);
        setSaving(false);
        if (r.success) onDone();
        else alert('Error: ' + r.error);
    };

    const footer = (
        <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '8px 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : '⚠️ Mark Out of Coverage'}
            </button>
            <button onClick={onClose} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
        </div>
    );

    return (
        <Modal isOpen title={`⚠️ Out of Coverage — ${ticket.id}`} onClose={onClose} footer={footer}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>This will be final; additional parts will be added on top.</div>
            <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Reason *</label>
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Why is this out of coverage?" style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} autoFocus />
            </div>
            <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Service / Labour Charges (₹)</label>
                <input type="number" value={charges} onChange={e => setCharges(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
        </Modal>
    );
}