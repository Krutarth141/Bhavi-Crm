'use client';

import { useState } from 'react';
import { Ticket } from '@/types/tickets';
import Modal from '@/components/Modal';
import { markInvoiceDone } from '@/services/ticketService';

interface Props {
    ticket: Ticket;
    updatedBy: string;
    onClose: () => void;
    onDone: (invoiceNo: string) => void;
}

export default function InvoiceModal({ ticket, updatedBy, onClose, onDone }: Props) {
    const [invoiceNo, setInvoiceNo] = useState(ticket.invoice_no || '');
    const [saving, setSaving] = useState(false);

    const svc = Number(ticket.service_charges || ticket.labor || 0);
    const parts = Number(ticket.parts_cost || 0);
    const other = Number(ticket.other_charge || 0);
    const final = Number(ticket.final_charges || 0);
    const total = final > 0 ? final : svc + parts + other;

    const handleSave = async () => {
        if (!invoiceNo.trim()) { alert('⚠️ Invoice Number is required'); return; }
        setSaving(true);
        const r = await markInvoiceDone(ticket, invoiceNo.trim(), updatedBy);
        setSaving(false);
        if (r.success) onDone(invoiceNo.trim());
        else alert('Error: ' + r.error);
    };

    const footer = (
        <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '8px 14px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : '💾 Save & Mark Done'}
            </button>
            <button onClick={onClose} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
        </div>
    );

    return (
        <Modal isOpen title={`🧾 Invoice Entry — ${ticket.id}`} onClose={onClose} footer={footer}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>{ticket.cname}{ticket.model ? ` | ${ticket.model}` : ''}</div>
            <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 13 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>💰 Charge Details</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ color: '#6b7280' }}>Service Charge (incl. GST)</span><b>₹{svc.toFixed(0)}</b></div>
                {parts > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ color: '#6b7280' }}>Parts Cost</span><b>₹{parts.toFixed(0)}</b></div>}
                {other > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ color: '#6b7280' }}>Other Charge</span><b>₹{other.toFixed(0)}</b></div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', paddingTop: 6, marginTop: 4 }}><span style={{ fontWeight: 700 }}>Total</span><b style={{ color: '#0d9488', fontSize: 15 }}>₹{total.toFixed(0)}</b></div>
            </div>
            <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Invoice Number *</label>
                <input type="text" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} placeholder="e.g. INV-2026-001" style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} autoFocus />
            </div>
        </Modal>
    );
}