'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Modal from '@/components/Modal';
import { AutoSite, AutoSiteVisit, AUTO_VISIT_ENG_IDS } from '@/types/autoSites';
import {
    fetchActiveVisit, fetchVisit, fetchSitesForPicker, checkOpenLogBlock,
    startNewVisit, visitAction, confirmHold, finishVisit,
    deriveVisitState, visitLabel, VisitState,
} from '@/services/siteVisitTrackerService';

type ViewState = 'closed' | 'picker' | 'tracker' | 'hold' | 'finish';

const readFileAsBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

export default function SiteVisitTracker() {
    const { data: session } = useSession();
    const roleType = (session?.user as any)?.roleType ?? '';
    const memberId = (session?.user as any)?.email ?? (session?.user as any)?.id ?? '';
    const memberName = (session?.user as any)?.name ?? '';
    const memberRole = roleType === 'work_controller' ? 'WC' : 'Engineer';

    const [view, setView] = useState<ViewState>('closed');
    const [visit, setVisit] = useState<AutoSiteVisit | null>(null);
    const [label, setLabel] = useState('');
    const [state, setState] = useState<VisitState | null>(null);
    const [busy, setBusy] = useState(false);

    const [sites, setSites] = useState<AutoSite[]>([]);
    const [isAdhoc, setIsAdhoc] = useState(false);
    const [siteId, setSiteId] = useState('');
    const [adhocClient, setAdhocClient] = useState('');
    const [adhocAddress, setAdhocAddress] = useState('');
    const [adhocArea, setAdhocArea] = useState('');
    const [adhocLabel, setAdhocLabel] = useState('');
    const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 10));

    const [holdRemark, setHoldRemark] = useState('');

    const [finishWork, setFinishWork] = useState('');
    const [finishMaterial, setFinishMaterial] = useState('');
    const [finishPhotos, setFinishPhotos] = useState<string[]>([]);

    const showButton = roleType === 'engineer' && AUTO_VISIT_ENG_IDS.includes(memberId);

    const refreshTracker = async (id: number) => {
        const v = await fetchVisit(id);
        if (!v) { setView('closed'); return; }
        setVisit(v);
        setState(deriveVisitState(v));
        setLabel(await visitLabel(v));
        setView('tracker');
    };

    const openQuick = async () => {
        if (!memberId) return;
        const active = await fetchActiveVisit(memberId);
        if (active) { await refreshTracker(active.id); return; }
        setIsAdhoc(false); setSiteId(''); setAdhocClient(''); setAdhocAddress(''); setAdhocArea(''); setAdhocLabel('');
        setVisitDate(new Date().toISOString().slice(0, 10));
        setSites(await fetchSitesForPicker());
        setView('picker');
    };

    const handleStartNew = async (kind: 'visit' | 'work') => {
        if (isAdhoc) {
            if (!adhocClient.trim()) { alert('Please enter client name!'); return; }
            if (!adhocLabel.trim()) { alert('Please enter the work to be done!'); return; }
        } else if (!siteId) { alert('Please select a site!'); return; }
        if (!visitDate) { alert('Date required!'); return; }

        setBusy(true);
        const blocked = await checkOpenLogBlock(memberId);
        if (blocked) {
            alert(`⚠️ A Work/Traveling log is already OPEN!\n\n"${blocked}"\n\nPlease close that first before starting a new Visit.`);
            setBusy(false);
            return;
        }
        const r = await startNewVisit({
            kind, siteId: isAdhoc ? null : Number(siteId),
            adhoc: isAdhoc ? { client: adhocClient.trim(), address: adhocAddress.trim(), area: adhocArea.trim(), label: adhocLabel.trim() } : null,
            date: visitDate, memberId, memberName, memberRole,
        });
        setBusy(false);
        if (r.success && r.id) await refreshTracker(r.id);
        else alert('Error: ' + r.error);
    };

    const handleAction = async (kind: 'visit' | 'work' | 'stop') => {
        if (!visit) return;
        setBusy(true);
        const r = await visitAction(visit.id, kind, memberName, memberId, memberRole);
        setBusy(false);
        if (r.success) await refreshTracker(visit.id);
        else alert('Error: ' + r.error);
    };

    const handleConfirmHold = async () => {
        if (!holdRemark.trim()) { alert('Reason is mandatory!'); return; }
        if (!visit) return;
        setBusy(true);
        const r = await confirmHold(visit.id, holdRemark.trim(), memberName, memberId, memberRole);
        setBusy(false);
        if (r.success) {
            alert('Visit paused ✅\nCome back and tap Visit Start / Work Start to resume.');
            setHoldRemark('');
            setView('closed');
        } else alert('Error: ' + r.error);
    };

    const openFinish = () => {
        if (!visit) return;
        setFinishWork(visit.work_done || '');
        setFinishMaterial(visit.material_delivered || '');
        setFinishPhotos([]);
        setView('finish');
    };

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []).slice(0, 4 - finishPhotos.length);
        const encoded = await Promise.all(files.map(readFileAsBase64));
        setFinishPhotos(p => [...p, ...encoded].slice(0, 4));
        e.target.value = '';
    };

    const handleFinish = async () => {
        if (!visit) return;
        setBusy(true);
        const r = await finishVisit(visit.id, finishWork.trim(), finishMaterial.trim(), finishPhotos, memberName);
        setBusy(false);
        if (r.success) {
            alert('✅ Visit completed!');
            setView('closed');
        } else alert('Error: ' + r.error);
    };

    if (!showButton) return null;

    return (
        <>
            <button onClick={openQuick} style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, padding: '5px 8px', cursor: 'pointer', fontWeight: 600 }}>🏗️ Site Visit</button>

            {/* New Visit picker */}
            <Modal isOpen={view === 'picker'} onClose={() => setView('closed')} title="🏗️ New Site Visit" size="sm" footer={
                <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                    <button onClick={() => setView('closed')} style={{ padding: '10px 16px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                    <button onClick={() => handleStartNew('visit')} disabled={busy} style={{ flex: 1, background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>🚗 Visit Start</button>
                    <button onClick={() => handleStartNew('work')} disabled={busy} style={{ flex: 1, background: '#059669', color: '#fff', border: 'none', borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>🔧 Work Start</button>
                </div>
            }>
                <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                        <input type="checkbox" checked={isAdhoc} onChange={e => setIsAdhoc(e.target.checked)} />
                        One-off visit — no ongoing site
                    </label>
                </div>
                {!isAdhoc ? (
                    <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 4 }}>Select Site *</label>
                        <select value={siteId} onChange={e => setSiteId(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }}>
                            <option value="">-- Select Site --</option>
                            {sites.map(s => <option key={s.id} value={s.id}>{s.site_name} — {s.client_name}</option>)}
                        </select>
                    </div>
                ) : (
                    <>
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 4 }}>Client Name *</label>
                            <input value={adhocClient} onChange={e => setAdhocClient(e.target.value)} placeholder="e.g. Ramesh Bhai" style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }} />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 4 }}>Address</label>
                            <input value={adhocAddress} onChange={e => setAdhocAddress(e.target.value)} placeholder="House/Society, Street..." style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }} />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 4 }}>Area</label>
                            <input value={adhocArea} onChange={e => setAdhocArea(e.target.value)} placeholder="e.g. Bodakdev" style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }} />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 4 }}>Work *</label>
                            <input value={adhocLabel} onChange={e => setAdhocLabel(e.target.value)} placeholder="e.g. Camera fault check" style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }} />
                        </div>
                    </>
                )}
                <div>
                    <label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 4 }}>Visit Date *</label>
                    <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }} />
                </div>
            </Modal>

            {/* Live tracker panel */}
            <Modal isOpen={view === 'tracker'} onClose={() => setView('closed')} title={`🏗️ ${label}`} size="sm" footer={
                <button onClick={() => setView('closed')} style={{ padding: '10px 16px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 8, cursor: 'pointer', fontSize: 13, width: '100%' }}>Close (Resume Later)</button>
            }>
                {state?.lastKind === 'workstart' && (
                    <div style={{ background: '#059669', color: '#fff', borderRadius: 10, padding: '12px 16px' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>
                            🔧 Work Started — {state.lastAt ? new Date(state.lastAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : ''}{state.wsCount > 1 ? ` (Session ${state.wsCount})` : ''}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => setView('hold')} disabled={busy} style={{ flex: 1, background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.6)', color: '#fff', borderRadius: 8, padding: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>⏸️ Work on Hold</button>
                            <button onClick={openFinish} disabled={busy} style={{ flex: 1, background: '#fff', color: '#059669', border: 'none', borderRadius: 8, padding: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>✅ Finish Visit</button>
                        </div>
                    </div>
                )}
                {state?.lastKind === 'visitstart' && (
                    <div style={{ background: '#f59e0b', color: '#fff', borderRadius: 10, padding: '12px 16px' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>
                            🚗 Visiting — {state.lastAt ? new Date(state.lastAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : ''}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => handleAction('stop')} disabled={busy} style={{ flex: 1, background: '#fff', color: '#b45309', border: 'none', borderRadius: 8, padding: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>🛑 Stop</button>
                            <button onClick={() => handleAction('work')} disabled={busy} style={{ flex: 1, background: '#fff', color: '#059669', border: 'none', borderRadius: 8, padding: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>🔧 Work Start</button>
                        </div>
                    </div>
                )}
                {(state?.lastKind === 'visitstop' || state?.lastKind === 'hold' || state?.lastKind == null) && (
                    <div style={{ background: '#fef9c3', border: '1.5px solid #fbbf24', borderRadius: 10, padding: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>
                            {state?.lastKind === 'hold' ? '⏸️ Work on Hold — Ready to resume' : '🛑 Travel Stopped — Ready to restart'}
                        </div>
                        {!!state?.wsCount && <div style={{ fontSize: 12, color: '#92400e', marginBottom: 8 }}>📋 {state.wsCount} session(s) done</div>}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => handleAction('visit')} disabled={busy} style={{ flex: 1, background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>🚗 Visit Start</button>
                            <button onClick={() => handleAction('work')} disabled={busy} style={{ flex: 1, background: '#059669', color: '#fff', border: 'none', borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>🔧 Work Start</button>
                        </div>
                        <button onClick={openFinish} disabled={busy} style={{ width: '100%', marginTop: 8, background: '#fff', border: '1.5px solid #fbbf24', color: '#92400e', borderRadius: 8, padding: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✅ Finish Visit</button>
                    </div>
                )}
            </Modal>

            {/* Hold reason modal */}
            <Modal isOpen={view === 'hold'} onClose={() => setView('tracker')} title="⏸️ Work on Hold" size="sm" footer={
                <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                    <button onClick={() => setView('tracker')} style={{ flex: 1, padding: 10, background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Cancel</button>
                    <button onClick={handleConfirmHold} disabled={busy} style={{ flex: 1, padding: 10, background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: busy ? 0.6 : 1 }}>⏸️ Put on Hold</button>
                </div>
            }>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Visit will be paused. You can attend something else and come back to resume.</div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Reason for hold *</label>
                <textarea value={holdRemark} onChange={e => setHoldRemark(e.target.value)} rows={3} placeholder="e.g. Going to another urgent job..." style={{ width: '100%', border: '1.5px solid #d1d5db', borderRadius: 8, padding: 10, fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
            </Modal>

            {/* Finish form */}
            <Modal isOpen={view === 'finish'} onClose={() => setView('tracker')} title={`✅ Finish — ${label}`} size="sm" footer={
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%' }}>
                    <button onClick={() => setView('tracker')} style={{ padding: '8px 16px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Back</button>
                    <button onClick={handleFinish} disabled={busy} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving...' : '💾 Complete Visit'}</button>
                </div>
            }>
                <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 4 }}>Work Done 🔧</label>
                    <textarea value={finishWork} onChange={e => setFinishWork(e.target.value)} rows={3} placeholder="Describe the work done..." style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 4 }}>Material Delivered 📦</label>
                    <textarea value={finishMaterial} onChange={e => setFinishMaterial(e.target.value)} rows={2} placeholder="e.g. 2x Camera, 10m Cable..." style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
                <div>
                    <label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 4 }}>📷 Photos <span style={{ fontWeight: 400, color: '#6b7280' }}>(optional, max 4)</span></label>
                    <input type="file" accept="image/*" multiple onChange={handlePhotoChange} disabled={finishPhotos.length >= 4} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                    {finishPhotos.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                            {finishPhotos.map((p, i) => (
                                <div key={i} style={{ position: 'relative' }}>
                                    <img src={p} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid #e5e7eb' }} />
                                    <button onClick={() => setFinishPhotos(ps => ps.filter((_, j) => j !== i))} style={{ position: 'absolute', top: -6, right: -6, background: '#dc2626', color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, fontSize: 11, cursor: 'pointer', lineHeight: '18px', padding: 0 }}>✕</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>
        </>
    );
}