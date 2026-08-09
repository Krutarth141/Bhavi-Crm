'use client';

import { useRef } from 'react';
import SignatureCanvas, { SignatureCanvasHandle } from '@/components/shared/SignatureCanvas';

interface Props {
    onConfirm: (customerSig: string, managerSig: string) => void;
    onClose: () => void;
}

export default function DCSignatureModal({ onConfirm, onClose }: Props) {
    const custRef = useRef<SignatureCanvasHandle>(null);
    const mgrRef = useRef<SignatureCanvasHandle>(null);

    const handlePrint = () => {
        const custSig = custRef.current?.isEmpty() ? '' : (custRef.current?.getDataUrl() || '');
        const mgrSig = mgrRef.current?.isEmpty() ? '' : (mgrRef.current?.getDataUrl() || '');
        onConfirm(custSig, mgrSig);
    };

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>✍️ Capture Signatures</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#374151' }}>Customer Signature</div>
                        <SignatureCanvas ref={custRef} width={300} height={100} />
                        <button onClick={() => custRef.current?.clear()} style={{ marginTop: 4, fontSize: 11, padding: '3px 8px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer' }}>🔄 Clear</button>
                    </div>
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#374151' }}>Site Manager / Engineer</div>
                        <SignatureCanvas ref={mgrRef} width={300} height={100} />
                        <button onClick={() => mgrRef.current?.clear()} style={{ marginTop: 4, fontSize: 11, padding: '3px 8px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer' }}>🔄 Clear</button>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                    <button onClick={onClose} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                    <button onClick={handlePrint} style={{ flex: 1, padding: '8px 14px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>🖨️ Print DC</button>
                </div>
            </div>
        </div>
    );
}