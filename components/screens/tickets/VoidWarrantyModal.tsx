'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { voidWarranty, WarrantyTicketLike } from '@/services/warrantyClaimService';

interface Props {
    ticket: WarrantyTicketLike;
    byUser: string;
    onClose: () => void;
    onDone: () => void;
}

export default function VoidWarrantyModal({ ticket, byUser, onClose, onDone }: Props) {
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!reason.trim()) { alert('Reason is required.'); return; }
        setSaving(true);
        const r = await voidWarranty(ticket, reason.trim(), byUser);
        setSaving(false);
        if (r.success) onDone();
        else alert('Error: ' + r.error);
    };

    const footer = (
        <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '8px 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : '🚫 Void Warranty'}
            </button>
            <button onClick={onClose} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
        </div>
    );

    return (
        <Modal isOpen title={`🚫 Void Warranty — ${ticket.id}`} onClose={onClose} footer={footer}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Reason (required) *</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} autoFocus />
        </Modal>
    );
}