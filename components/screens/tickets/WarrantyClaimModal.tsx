'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { submitWarrantyClaim, WarrantyTicketLike } from '@/services/warrantyClaimService';

interface Props {
    ticket: WarrantyTicketLike;
    submittedBy: string;
    onClose: () => void;
    onDone: () => void;
}

export default function WarrantyClaimModal({ ticket, submittedBy, onClose, onDone }: Props) {
    const [invoice, setInvoice] = useState('');
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async () => {
        if (!invoice.trim()) { alert('Invoice number is required.'); return; }
        setSaving(true);
        const r = await submitWarrantyClaim(ticket, invoice.trim(), note.trim(), submittedBy);
        setSaving(false);
        if (r.success) { alert('✅ Warranty claim submitted — WC/Admin will review and approve.'); onDone(); }
        else alert('Error: ' + r.error);
    };

    const footer = (
        <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSubmit} disabled={saving} style={{ flex: 1, padding: '8px 14px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Submitting...' : '📤 Submit Claim'}
            </button>
            <button onClick={onClose} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
        </div>
    );

    return (
        <Modal isOpen title={`🔓 Warranty Claim — ${ticket.id}`} onClose={onClose} footer={footer}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>{ticket.cname} {ticket.model ? `| ${ticket.model}` : ''}</div>
            <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Invoice Number *</label>
                <input type="text" value={invoice} onChange={e => setInvoice(e.target.value)} placeholder="Purchase invoice / bill number" style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} autoFocus />
            </div>
            <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Note</label>
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Why should this be covered under warranty?" style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
        </Modal>
    );
}