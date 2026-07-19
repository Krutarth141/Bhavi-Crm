'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { EmployeeShift } from '@/types/settings';
import { addAttendance } from '@/services/attendanceService';

interface Props {
    employees: { user_id: string; name: string; role: string }[];
    shiftMap: Record<string, EmployeeShift>;
    onClose: () => void;
    onDone: () => void;
}

const fieldStyle = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const };
const labelStyle = { fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 };

export default function AttAddModal({ employees, shiftMap, onClose, onDone }: Props) {
    const [empId, setEmpId] = useState('');
    const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [inTime, setInTime] = useState('');
    const [outTime, setOutTime] = useState('');
    const [remark, setRemark] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!empId) { alert('Select an employee'); return; }
        if (!date) { alert('Select a date'); return; }
        if (!inTime) { alert('Punch In time is required'); return; }
        if (!remark.trim()) { alert('Reason is required — this is a manual admin entry'); return; }
        const emp = employees.find(e => e.user_id === empId);
        setSaving(true);
        const r = await addAttendance({
            empId, empName: emp?.name || '', date,
            inTime24: inTime, outTime24: outTime, remark: remark.trim(),
            shift: shiftMap[empId],
        });
        setSaving(false);
        if (r.success) onDone();
        else alert(r.error);
    };

    const footer = (
        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: 10, background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : '💾 Save'}</button>
            <button onClick={onClose} style={{ flex: 1, padding: 10, background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
        </div>
    );

    return (
        <Modal isOpen title="➕ Add Attendance" onClose={onClose} footer={footer}>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Manual entry — use only when a real punch in/out failed to save (app/GPS issue etc.)</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                    <label style={labelStyle}>Employee</label>
                    <select value={empId} onChange={e => setEmpId(e.target.value)} style={fieldStyle}>
                        <option value="">Select employee...</option>
                        {employees.map(e => <option key={e.user_id} value={e.user_id}>{e.name}</option>)}
                    </select>
                </div>
                <div>
                    <label style={labelStyle}>Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} style={fieldStyle} />
                </div>
                <div>
                    <label style={labelStyle}>Punch In Time</label>
                    <input type="time" value={inTime} onChange={e => setInTime(e.target.value)} style={fieldStyle} />
                </div>
                <div>
                    <label style={labelStyle}>Punch Out Time <span style={{ color: '#64748b', fontWeight: 400 }}>(optional)</span></label>
                    <input type="time" value={outTime} onChange={e => setOutTime(e.target.value)} style={fieldStyle} />
                </div>
                <div>
                    <label style={labelStyle}>Reason (required)</label>
                    <input type="text" value={remark} onChange={e => setRemark(e.target.value)} placeholder="e.g. App GPS issue - manually added" style={fieldStyle} />
                </div>
            </div>
        </Modal>
    );
}