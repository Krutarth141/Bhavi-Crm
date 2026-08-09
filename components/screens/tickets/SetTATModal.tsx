'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { Ticket } from '@/types/tickets';
import { saveTAT } from '@/services/ticketService';

interface Props {
    ticket: Ticket;
    byUser: string;
    onClose: () => void;
    onDone: () => void;
}

const toLocalInput = (iso: string): string => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    const isDayOnly = /T00:00:00/.test(iso);
    if (isDayOnly) return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T23:59`;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function SetTATModal({ ticket, byUser, onClose, onDone }: Props) {
    const [received, setReceived] = useState('');
    const [tatValue, setTatValue] = useState(ticket.tat_date ? toLocalInput(ticket.tat_date) : '');
    const [saving, setSaving] = useState(false);

    const existingDisplay = ticket.tat_date
        ? new Date(ticket.tat_date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
        : '';

    const handleReceivedChange = (v: string) => {
        setReceived(v);
        if (!v) return;
        const d = new Date(v);
        d.setDate(d.getDate() + 1); // next day, same time
        const pad = (n: number) => String(n).padStart(2, '0');
        setTatValue(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    };

    const handleSave = async () => {
        setSaving(true);
        const tatIso = tatValue ? new Date(tatValue).toISOString() : null;
        const recvIso = received ? new Date(received).toISOString() : null;
        const r = await saveTAT(ticket.id, tatIso, recvIso, byUser);
        setSaving(false);
        if (r.success) {
            alert(tatIso ? `✅ TAT deadline set: ${new Date(tatIso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}` : '✅ TAT cleared.');
            onDone();
        } else {
            alert('Error: ' + r.error);
        }
    };

    const footer = (
        <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '8px 14px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : '💾 Save TAT'}
            </button>
        </div>
    );

    return (
        <Modal isOpen title="⏱ Set TAT Deadline" onClose={onClose} footer={footer}>
            {existingDisplay && (
                <div style={{ fontSize: 12, color: '#1d4ed8', background: '#eff6ff', borderRadius: 6, padding: '6px 10px', marginBottom: 12 }}>
                    Current TAT: <b>{existingDisplay}</b>
                </div>
            )}
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 6 }}>📅 Canon Portal — Call Received Date &amp; Time</div>
                <input type="datetime-local" value={received} onChange={(e) => handleReceivedChange(e.target.value)} style={{ border: '1px solid #86efac', borderRadius: 8, padding: '8px 12px', fontSize: 13, width: '100%', boxSizing: 'border-box' }} />
                <div style={{ fontSize: 11, color: '#166534', marginTop: 5 }}>Enter exact time from Canon system → TAT deadline auto-set to next day same time</div>
            </div>
            <div>
                <label style={{ fontSize: 13, fontWeight: 500 }}>TAT Deadline Date &amp; Time <span style={{ fontSize: 11, color: '#6b7280' }}>(auto-filled above, or set manually)</span></label>
                <input type="datetime-local" value={tatValue} onChange={(e) => setTatValue(e.target.value)} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 14, width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>⚠️ Overdue = red | &lt;24h left = yellow with countdown | Leave blank to clear.</div>
        </Modal>
    );
}