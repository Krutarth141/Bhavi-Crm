'use client';

import { useRef, useState } from 'react';
import Modal from '@/components/Modal';
import SignatureCanvas, { SignatureCanvasHandle } from '@/components/shared/SignatureCanvas';
import { saveSignature } from '@/services/ticketService';

interface Props {
    ticketId: string;
    isCarryIn: boolean;
    byUser: string;
    onClose: () => void;
    onDone: () => void;
}

export default function SignatureModal({ ticketId, isCarryIn, byUser, onClose, onDone }: Props) {
    const padRef = useRef<SignatureCanvasHandle>(null);
    const [saving, setSaving] = useState(false);

    const handleClear = () => padRef.current?.clear();

    const handleSave = async () => {
        if (padRef.current?.isEmpty()) { alert('Please sign before saving.'); return; }
        const dataUrl = padRef.current?.getDataUrl() || '';
        setSaving(true);
        const r = await saveSignature(ticketId, dataUrl, byUser);
        setSaving(false);
        if (r.success) onDone();
        else alert('Error: ' + r.error);
    };

    const footer = (
        <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Skip</button>
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '8px 14px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : `💾 Save ${isCarryIn ? 'Engineer' : 'Customer'} Signature`}
            </button>
        </div>
    );

    return (
        <Modal isOpen title={isCarryIn ? 'Engineer Signature' : 'Customer Signature'} onClose={onClose} footer={footer}>
            <div style={{ fontSize: 13, marginBottom: 10, color: '#6b7280' }}>Sign below to confirm service</div>
            <SignatureCanvas ref={padRef} width={420} height={160} />
            <button onClick={handleClear} style={{ marginTop: 8, padding: '6px 12px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>🔄 Clear</button>
        </Modal>
    );
}