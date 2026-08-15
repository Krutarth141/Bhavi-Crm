'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { Ticket } from '@/types/tickets';
import { backdateCloseTicket } from '@/services/ticketService';

interface EngineerOption { id: string; user_id: string; name: string; }

interface Props {
    ticket: Ticket;
    engineers: EngineerOption[];
    byUser: string;
    onClose: () => void;
    onDone: () => void;
}

const todayStr = () => new Date().toLocaleDateString('en-CA');

export default function BackdateCloseModal({ ticket, engineers, byUser, onClose, onDone }: Props) {
    const [date, setDate] = useState(todayStr());
    const [engineerId, setEngineerId] = useState(ticket.assigned_to || '');
    const [reason, setReason] = useState('');
    const [workDone, setWorkDone] = useState(ticket.work_done || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!date) { alert('Please select a close date'); return; }
        if (!engineerId) { alert('Please select the engineer'); return; }
        if (!reason.trim()) { alert('⚠️ Reason is required!'); return; }
        const eng = engineers.find((e) => e.user_id === engineerId);
        setSaving(true);
        const r = await backdateCloseTicket(ticket, { date, engineerId, engineerName: eng?.name || '', reason: reason.trim(), workDone: workDone.trim() }, byUser);
        setSaving(false);
        if (r.success) {
            alert('✅ Call closed successfully with back-date: ' + date);
            onDone();
        } else {
            alert('Error: ' + r.error);
        }
    };

    const footer = (
        <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: 10, background: '#374151', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : '✅ Close Call'}
            </button>
            <button onClick={onClose} style={{ flex: 1, padding: 10, background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
        </div>
    );

    return (
        <Modal isOpen title="📅 Back-Date Close Call" onClose={onClose} footer={footer}>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>{ticket.id} — {ticket.cname} | {ticket.model}</p>
            <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Close Date <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Engineer <span style={{ color: '#dc2626' }}>*</span></label>
                <select value={engineerId} onChange={(e) => setEngineerId(e.target.value)} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' }}>
                    <option value="">-- Select Engineer --</option>
                    {engineers.map((e) => (<option key={e.id} value={e.user_id}>{e.name}</option>))}
                </select>
            </div>
            <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Reason / Remark <span style={{ color: '#dc2626' }}>*</span></label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="e.g. Call was completed but not closed in system..." style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Work Done</label>
                <input type="text" value={workDone} onChange={(e) => setWorkDone(e.target.value)} placeholder="Describe work done..." style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
        </Modal>
    );
}