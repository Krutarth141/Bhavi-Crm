'use client';

import { WorkLog } from '@/types/myCalls';
import { formatWorkLogWA } from '@/utils/formatWorkLogShare';

interface Props {
    date: string;
    logs: WorkLog[];
    name: string;
    onClose: () => void;
}

export default function WorkLogShareModal({ date, logs, name, onClose }: Props) {
    const text = formatWorkLogWA(date, logs, name);

    const handleCopy = () => {
        navigator.clipboard?.writeText(text);
        alert('Copied!');
    };

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
                <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 16, fontWeight: 700 }}>🕐 Work Log Share</span>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
                </div>
                <div style={{ padding: '14px 18px', flex: 1, overflowY: 'auto' }}>
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, margin: 0, fontFamily: 'inherit', lineHeight: 1.6 }}>{text}</pre>
                </div>
                <div style={{ padding: '12px 18px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 10 }}>
                    <button onClick={handleCopy} style={{ flex: 1, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>📋 Copy</button>
                    <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" style={{ flex: 2, background: '#25D366', color: '#fff', border: 'none', borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>📲 WhatsApp Share</a>
                </div>
            </div>
        </div>
    );
}