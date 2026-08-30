'use client';

import { useRef, useState } from 'react';
import SignatureCanvas, { SignatureCanvasHandle } from '@/components/shared/SignatureCanvas';
import { DISPATCH_MODES } from '@/types/autoSites';

interface Props {
    initial: { deliveryMode: string; courierDetail: string; receiverName: string };
    onConfirm: (result: {
        receiverName: string; receiverMobile: string; deliveryMode: string; courierDetail: string;
        customerSig: string; managerSig: string;
    }) => void;
    onClose: () => void;
}

const fieldStyle = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const };
const labelStyle = { fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 };

export default function DCSignatureModal({ initial, onConfirm, onClose }: Props) {
    const custRef = useRef<SignatureCanvasHandle>(null);
    const mgrRef = useRef<SignatureCanvasHandle>(null);
    const [custSkipped, setCustSkipped] = useState(false);
    const [mgrSkipped, setMgrSkipped] = useState(false);

    // index.html:22190-22235 — these are editable right before print, not
    // fixed at dispatch-creation time.
    const [deliveryMode, setDeliveryMode] = useState(initial.deliveryMode || DISPATCH_MODES[0]);
    const [receiverName, setReceiverName] = useState(initial.receiverName || '');
    const [receiverMobile, setReceiverMobile] = useState('');
    const [courierDetail, setCourierDetail] = useState(initial.courierDetail || '');

    const handlePrint = () => {
        const custSig = custRef.current?.isEmpty() ? '' : (custRef.current?.getDataUrl() || '');
        const mgrSig = mgrRef.current?.isEmpty() ? '' : (mgrRef.current?.getDataUrl() || '');
        onConfirm({ receiverName, receiverMobile, deliveryMode, courierDetail, customerSig: custSig, managerSig: mgrSig });
    };

    const skipSig = (which: 'cust' | 'mgr') => {
        if (which === 'cust') { custRef.current?.skip(); setCustSkipped(true); }
        else { mgrRef.current?.skip(); setMgrSkipped(true); }
    };

    const clearSig = (which: 'cust' | 'mgr') => {
        if (which === 'cust') { custRef.current?.clear(); setCustSkipped(false); }
        else { mgrRef.current?.clear(); setMgrSkipped(false); }
    };

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>✍️ Capture Signatures</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                    <div>
                        <label style={labelStyle}>Delivery Mode</label>
                        <select value={deliveryMode} onChange={e => setDeliveryMode(e.target.value)} style={fieldStyle}>
                            {DISPATCH_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Receiver Name</label>
                        <input value={receiverName} onChange={e => setReceiverName(e.target.value)} placeholder="Name" style={fieldStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Receiver Mobile</label>
                        <input type="tel" value={receiverMobile} onChange={e => setReceiverMobile(e.target.value)} style={fieldStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Tracking / Details</label>
                        <input value={courierDetail} onChange={e => setCourierDetail(e.target.value)} style={fieldStyle} />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#374151' }}>Customer Signature</div>
                        <SignatureCanvas ref={custRef} width={300} height={100} />
                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                            <button onClick={() => clearSig('cust')} style={{ fontSize: 11, padding: '3px 8px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer' }}>🔄 Clear</button>
                            <button onClick={() => skipSig('cust')} style={{ fontSize: 11, padding: '3px 8px', border: '1px solid #e5e7eb', background: 'white', color: '#6b7280', borderRadius: 6, cursor: 'pointer' }}>{custSkipped ? '✓ Skipped' : 'Skip'}</button>
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#374151' }}>Site Manager / Engineer</div>
                        <SignatureCanvas ref={mgrRef} width={300} height={100} />
                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                            <button onClick={() => clearSig('mgr')} style={{ fontSize: 11, padding: '3px 8px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer' }}>🔄 Clear</button>
                            <button onClick={() => skipSig('mgr')} style={{ fontSize: 11, padding: '3px 8px', border: '1px solid #e5e7eb', background: 'white', color: '#6b7280', borderRadius: 6, cursor: 'pointer' }}>{mgrSkipped ? '✓ Skipped' : 'Skip'}</button>
                        </div>
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