'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { PunchLog } from '@/types/attendance';
import { to24h } from '@/utils/attendanceCalc';
import { submitAttEditRequest } from '@/services/attendanceService';

interface Props {
    log: PunchLog;
    requestedBy: string;
    onClose: () => void;
    onDone: () => void;
}

const fieldStyle = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const };
const labelStyle = { fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 };

export default function AttEditRequestModal({ log, requestedBy, onClose, onDone }: Props) {
    const [inTime, setInTime] = useState(to24h(log.punch_in_time));
    const [outTime, setOutTime] = useState(to24h(log.punch_out_time));
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async () => {
        if (!reason.trim()) { alert('Please enter a reason'); return; }
        setSaving(true);
        const r = await submitAttEditRequest(log.id, requestedBy, reason.trim(), inTime, outTime);
        setSaving(false);
        if (r.success) { alert('✅ Edit request sent! Admin will review and approve.'); onDone(); }
        else alert('Error: ' + r.error);
    };

    const footer = (
        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <button onClick={handleSubmit} disabled={saving} style={{ flex: 1, padding: 10, background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Sending...' : '📤 Send Request'}</button>
            <button onClick={onClose} style={{ flex: 1, padding: 10, background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
        </div>
    );

    return (
        <Modal isOpen title="📝 Request Attendance Edit" onClose={onClose} footer={footer}>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>{log.punch_in_date} — Fill only what needs to be changed</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                    <label style={labelStyle}>New Punch In Time <span style={{ color: '#64748b', fontWeight: 400 }}>(leave blank if correct)</span></label>
                    <input type="time" value={inTime} onChange={e => setInTime(e.target.value)} style={fieldStyle} />
                </div>
                <div>
                    <label style={labelStyle}>New Punch Out Time <span style={{ color: '#64748b', fontWeight: 400 }}>(leave blank if correct)</span></label>
                    <input type="time" value={outTime} onChange={e => setOutTime(e.target.value)} style={fieldStyle} />
                </div>
                <div>
                    <label style={labelStyle}>Reason <span style={{ color: '#dc2626' }}>*</span></label>
                    <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Forgot to punch out, system error..." style={fieldStyle} />
                </div>
            </div>
        </Modal>
    );
}