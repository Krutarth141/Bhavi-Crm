'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { PaymentForm, emptyPaymentForm, PAYMENT_MODES } from '@/types/autoSites';

interface Props {
    siteName: string;
    quotationTotal: number;
    paidSoFar: number;
    onClose: () => void;
    onSave: (form: PaymentForm) => Promise<{ success: boolean; error?: string }>;
}

const fieldStyle = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const };
const labelStyle = { fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 };

export default function SitePaymentModal({ siteName, quotationTotal, paidSoFar, onClose, onSave }: Props) {
    const [form, setForm] = useState<PaymentForm>(emptyPaymentForm());
    const [saving, setSaving] = useState(false);

    const set = (patch: Partial<PaymentForm>) => setForm(f => ({ ...f, ...patch }));
    const pending = quotationTotal - paidSoFar;

    const handleSave = async () => {
        if (!form.amount || !form.payment_mode) { alert('Amount and Payment Mode are required!'); return; }
        setSaving(true);
        const r = await onSave(form);
        setSaving(false);
        if (r.success) onClose();
        else alert('Error saving payment: ' + r.error);
    };

    const footer = (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : '💰 Save & Print Receipt'}</button>
        </div>
    );

    return (
        <Modal isOpen title="💰 Add Payment" onClose={onClose} footer={footer}>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
                <b>Site:</b> {siteName}<br />
                <b>Quotation Total:</b> ₹{quotationTotal.toLocaleString('en-IN')}<br />
                <b>Paid:</b> ₹{paidSoFar.toLocaleString('en-IN')}<br />
                <b style={{ color: '#d97706' }}>Pending: ₹{Math.max(0, pending).toLocaleString('en-IN')}</b>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div><label style={labelStyle}>Amount *</label><input type="number" min={0} value={form.amount} onChange={e => set({ amount: e.target.value })} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Payment Mode *</label>
                    <select value={form.payment_mode} onChange={e => set({ payment_mode: e.target.value })} style={fieldStyle}>
                        <option value="">Select...</option>
                        {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                <div><label style={labelStyle}>Date</label><input type="date" value={form.payment_date} onChange={e => set({ payment_date: e.target.value })} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Reference No</label><input value={form.reference_no} onChange={e => set({ reference_no: e.target.value })} placeholder="UTR / Cheque No" style={fieldStyle} /></div>
            </div>
            <div><label style={labelStyle}>Note</label><input value={form.note} onChange={e => set({ note: e.target.value })} placeholder="Optional" style={fieldStyle} /></div>
        </Modal>
    );
}