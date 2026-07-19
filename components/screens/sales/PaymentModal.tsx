'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { SalesOrder, PAYMENT_METHODS, BHAVI_PAYMENT } from '@/types/sales';

interface Props {
    order: SalesOrder;
    upiQrUrl?: string | null;
    onClose: () => void;
    onSave: (method: string, reference: string, date: string) => Promise<{ success: boolean; error?: string }>;
}

export default function PaymentModal({ order, upiQrUrl, onClose, onSave }: Props) {
    const [method, setMethod] = useState(PAYMENT_METHODS[0]);
    const [reference, setReference] = useState('');
    const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        const r = await onSave(method, reference.trim(), date);
        setSaving(false);
        if (r.success) onClose();
        else alert('Error: ' + r.error);
    };

    const footer = (
        <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '9px 18px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, opacity: saving ? 0.6 : 1 }}>✅ Confirm Payment</button>
            <button onClick={onClose} style={{ padding: '9px 18px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
        </div>
    );

    return (
        <Modal isOpen title={`Record Payment — ${order.customer_name}`} onClose={onClose} footer={footer}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ background: '#d1fae5', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#065f46' }}>Amount to Collect</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#065f46' }}>₹{(order.total_amount || 0).toLocaleString('en-IN')}</div>
                    <div style={{ fontSize: 11, color: '#10b981' }}>All taxes included</div>
                </div>
                {upiQrUrl && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>📱 UPI QR Code — Customer can scan directly</div>
                        <img src={upiQrUrl} style={{ width: 170, height: 170, objectFit: 'contain', border: '2px solid #e2e8f0', borderRadius: 12 }} />
                    </div>
                )}
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: 10, fontSize: 12 }}>
                    <b>Bank Transfer:</b> {BHAVI_PAYMENT.bank} | A/c: <b>{BHAVI_PAYMENT.account}</b> | IFSC: <b>{BHAVI_PAYMENT.ifsc}</b>
                </div>
                <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>Payment Method *</label>
                    <select value={method} onChange={e => setMethod(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }}>
                        {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>Transaction / UTR No.</label>
                    <input value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. UTR123456789" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>Payment Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
            </div>
        </Modal>
    );
}