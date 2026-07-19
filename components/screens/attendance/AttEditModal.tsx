'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { PunchLog } from '@/types/attendance';
import { EmployeeShift } from '@/types/settings';
import { to24h } from '@/utils/attendanceCalc';
import { saveAttendanceEdit } from '@/services/attendanceService';

interface Props {
    log: PunchLog;
    shift?: EmployeeShift;
    onClose: () => void;
    onDone: () => void;
}

const fieldStyle = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const };
const labelStyle = { fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 };

export default function AttEditModal({ log, shift, onClose, onDone }: Props) {
    const [inTime, setInTime] = useState(to24h(log.punch_in_time));
    const [outTime, setOutTime] = useState(to24h(log.punch_out_time));
    const [remark, setRemark] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        const r = await saveAttendanceEdit(log, inTime, outTime, remark.trim(), shift);
        setSaving(false);
        if (r.success) onDone();
        else alert('Error: ' + r.error);
    };

    const footer = (
        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: 10, background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : '💾 Save'}</button>
            <button onClick={onClose} style={{ flex: 1, padding: 10, background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
        </div>
    );

    return (
        <Modal isOpen title="✏️ Edit Attendance" onClose={onClose} footer={footer}>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>{log.eng_name} — {log.punch_in_date}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                    <label style={labelStyle}>Punch In Time</label>
                    <input type="time" value={inTime} onChange={e => setInTime(e.target.value)} style={fieldStyle} />
                </div>
                <div>
                    <label style={labelStyle}>Punch Out Time</label>
                    <input type="time" value={outTime} onChange={e => setOutTime(e.target.value)} style={fieldStyle} />
                </div>
                <div>
                    <label style={labelStyle}>Remark</label>
                    <input type="text" value={remark} onChange={e => setRemark(e.target.value)} placeholder="Admin correction reason..." style={fieldStyle} />
                </div>
            </div>
        </Modal>
    );
}