'use client';

import { useEffect, useState } from 'react';
import { MSCDispatch } from '@/types/mscDispatch';
import { fetchMSCDispatch, fetchMSCCenters, saveMSCDispatch, markMSCReceived } from '@/services/mscDispatchService';

interface Props {
    ticketId: string;
    readOnly: boolean;
    byUser: string;
    onUpdated?: () => void;
}

export default function MSCDispatchPanel({ ticketId, readOnly, byUser, onUpdated }: Props) {
    const [dispatch, setDispatch] = useState<MSCDispatch | null>(null);
    const [centers, setCenters] = useState<{ name: string; city?: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [mscName, setMscName] = useState('');
    const [dispatchDate, setDispatchDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [courierName, setCourierName] = useState('');
    const [docketNo, setDocketNo] = useState('');
    const [receivedDate, setReceivedDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        const [d, c] = await Promise.all([fetchMSCDispatch(ticketId), fetchMSCCenters()]);
        setDispatch(d);
        setCenters(c);
        setMscName(d?.msc_name || '');
        setDispatchDate(d?.dispatch_date || new Date().toLocaleDateString('en-CA'));
        setCourierName(d?.courier_name || '');
        setDocketNo(d?.docket_no || '');
        setLoading(false);
    };

    useEffect(() => { load(); }, [ticketId]);

    const handleSave = async () => {
        if (!mscName.trim()) { alert('Please enter MSC center name'); return; }
        if (!dispatchDate) { alert('Please select dispatch date'); return; }
        setSaving(true);
        const r = await saveMSCDispatch(ticketId, { mscName: mscName.trim(), dispatchDate, courierName: courierName.trim(), docketNo: docketNo.trim() }, byUser);
        setSaving(false);
        if (r.success) { alert(docketNo.trim() ? '✅ Dispatch details saved!' : '✅ Details saved — add docket when courier picks up.'); load(); onUpdated?.(); }
        else alert('Error: ' + r.error);
    };

    const handleMarkReceived = async () => {
        setSaving(true);
        const r = await markMSCReceived(ticketId, receivedDate, byUser);
        setSaving(false);
        if (r.success) { alert('✅ Received from MSC! Ticket moved to Pending for Delivery.'); onUpdated?.(); }
        else alert('Error: ' + r.error);
    };

    if (loading) return <div style={{ fontSize: 12, color: '#6b7280' }}>Loading MSC dispatch info...</div>;

    if (readOnly) {
        return (
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, fontSize: 13 }}>
                {dispatch?.msc_name ? (
                    <div>
                        MSC Center: <b>{dispatch.msc_name}</b>
                        {dispatch.dispatch_date && <> &nbsp;·&nbsp; Date: {dispatch.dispatch_date}</>}
                        {dispatch.docket_no ? <> &nbsp;·&nbsp; Docket: <b>{dispatch.docket_no}</b></> : <span style={{ color: '#d97706' }}> &nbsp;·&nbsp; Docket: Pending</span>}
                    </div>
                ) : (
                    <div style={{ color: '#6b7280' }}>WC will add dispatch details soon.</div>
                )}
            </div>
        );
    }

    const hasDocket = !!dispatch?.docket_no;

    return (
        <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12 }}>
            {!hasDocket && (
                <div style={{ background: '#fef9c3', border: '1px solid #fbbf24', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12 }}>
                    ⏳ Fill dispatch details — docket can be added later when courier picks up.
                </div>
            )}
            <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 600 }}>MSC Center *</label>
                <input type="text" list="msc-panel-datalist" value={mscName} onChange={(e) => setMscName(e.target.value)} placeholder="Search MSC center..." style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box' }} />
                <datalist id="msc-panel-datalist">
                    {centers.map((c) => (<option key={c.name} value={c.name}>{c.city ? `${c.name} — ${c.city}` : c.name}</option>))}
                </datalist>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                    <label style={{ fontSize: 12, fontWeight: 600 }}>Dispatch Date *</label>
                    <input type="date" value={dispatchDate} onChange={(e) => setDispatchDate(e.target.value)} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                    <label style={{ fontSize: 12, fontWeight: 600 }}>Courier Agency</label>
                    <input type="text" value={courierName} onChange={(e) => setCourierName(e.target.value)} placeholder="DTDC, Blue Dart, Speed Post..." style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
            </div>
            <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Docket / Tracking No</label>
                <input type="text" value={docketNo} onChange={(e) => setDocketNo(e.target.value)} placeholder="Add when courier picks up (optional)" style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <button onClick={handleSave} disabled={saving} style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', width: '100%', marginBottom: 10, opacity: saving ? 0.6 : 1 }}>
                💾 Save / Update Dispatch Details
            </button>
            {hasDocket ? (
                <>
                    <hr style={{ border: 'none', borderTop: '1px solid #bfdbfe', margin: '12px 0' }} />
                    <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 12, fontWeight: 600 }}>Received Date</label>
                        <input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box' }} />
                    </div>
                    <button onClick={handleMarkReceived} disabled={saving} style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', width: '100%', opacity: saving ? 0.6 : 1 }}>
                        📬 Mark Received → Pending for Delivery
                    </button>
                </>
            ) : (
                <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', padding: '8px 0' }}>📋 "Mark Received" appears after docket is saved.</div>
            )}
        </div>
    );
}