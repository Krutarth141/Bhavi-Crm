'use client';

import { useState } from 'react';
import { Ticket } from '@/types/tickets';
import { submitReportEdit, REPORT_EDIT_FIELDS } from '@/services/ticketService';

interface Props {
    ticket: Ticket;
    requestedBy: string;
    wcId: string;
    onClose: () => void;
    onSubmitted: () => void;
}

const fieldStyle = { width: '100%', padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' as const };

export default function ReportEditRequestModal({ ticket, requestedBy, wcId, onClose, onSubmitted }: Props) {
    const [values, setValues] = useState<Record<string, string>>(() => {
        const init: Record<string, string> = {};
        REPORT_EDIT_FIELDS.forEach(f => { init[f.key as string] = String((ticket as any)[f.key] || ''); });
        return init;
    });
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);

    const setVal = (key: string, v: string) => setValues(prev => ({ ...prev, [key]: v }));

    const handleSubmit = async () => {
        if (!reason.trim()) { alert('⚠️ Please provide a reason for editing the report.'); return; }
        setSaving(true);
        const r = await submitReportEdit(ticket, values, reason.trim(), requestedBy, wcId);
        setSaving(false);
        if (r.success) { alert('✅ Edit request submitted! Admin will review and approve/reject.'); onSubmitted(); onClose(); }
        else alert(r.error || 'No changes detected.');
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
            <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                    <h2 style={{ margin: 0, fontSize: 17 }}>✏️ Edit Report — {ticket.id}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ padding: 20 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {REPORT_EDIT_FIELDS.map(f => (
                            <div key={f.key as string}>
                                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>{f.label}</label>
                                <input type="text" value={values[f.key as string] || ''} onChange={e => setVal(f.key as string, e.target.value)} style={fieldStyle} />
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: 16, background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 10, padding: '12px 16px' }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>REASON FOR EDIT *</label>
                        <textarea value={reason} onChange={e => setReason(e.target.value)} style={{ display: 'block', width: '100%', marginTop: 6, padding: '8px 12px', border: '1px solid #fbbf24', borderRadius: 8, fontSize: 13, minHeight: 60, boxSizing: 'border-box' }} placeholder="Explain why this report needs to be corrected..." />
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 20px', borderTop: '1px solid #e2e8f0' }}>
                    <button onClick={onClose} style={{ padding: '9px 20px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: '#fff' }}>Cancel</button>
                    <button onClick={handleSubmit} disabled={saving} style={{ padding: '9px 22px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Submitting...' : '📨 Submit for Approval'}</button>
                </div>
            </div>
        </div>
    );
}