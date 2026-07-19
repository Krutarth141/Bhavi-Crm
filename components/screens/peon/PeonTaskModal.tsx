'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';

interface Props {
    label: string;
    glabel: string;
    icon: string;
    onConfirm: (time: string) => void;
    onClose: () => void;
}

export default function PeonTaskModal({ label, glabel, icon, onConfirm, onClose }: Props) {
    const [time, setTime] = useState(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));

    const footer = (
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            <button onClick={onClose} style={{ flex: 1, padding: 12, border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontWeight: 700, background: '#fff', color: '#64748b', cursor: 'pointer' }}>❌ Cancel</button>
            <button onClick={() => onConfirm(time)} style={{ flex: 2, padding: 12, border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 800, background: '#22c55e', color: '#fff', cursor: 'pointer' }}>✅ Yes, Done!</button>
        </div>
    );

    return (
        <Modal isOpen title={`${icon} ${label}`} onClose={onClose} footer={footer}>
            <div style={{ textAlign: 'center' }}>
                {glabel && <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>{glabel}</div>}
                <div style={{ background: '#f0fdf4', border: '2px solid #bbf7d0', borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 13, color: '#15803d', fontWeight: 700, marginBottom: 8 }}>⏰ What time did you complete this?</div>
                    <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ width: '100%', padding: 12, border: '2px solid #22c55e', borderRadius: 10, fontSize: 20, fontWeight: 700, textAlign: 'center', color: '#15803d', boxSizing: 'border-box' }} />
                </div>
            </div>
        </Modal>
    );
}