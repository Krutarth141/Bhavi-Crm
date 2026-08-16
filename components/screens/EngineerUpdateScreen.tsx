'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useEngineerUpdate } from '@/hooks/useEngineerUpdate';
import Modal from '@/components/Modal';
import { EngineerTicket, UpdateForm } from '@/types/engineerUpdate';
import { getAllowedStatuses, validateStatusChangeReason } from '@/types/ticketStatus';
import WarrantyClaimModal from '@/components/screens/tickets/WarrantyClaimModal';
import EngVoidWarrantyModal from '@/components/screens/tickets/EngVoidWarrantyModal';
import AIWriteButton from '@/components/shared/AIWriteButton';
import MSCDispatchPanel from '@/components/screens/tickets/MSCDispatchPanel';
import PartIndentModal from '@/components/screens/tickets/PartIndentModal';
import KmCaptureModal from '@/components/screens/tickets/KmCaptureModal';
import { hasKmEntryToday, hasArrivalKmForTicket } from '@/services/kmTrackingService';
import { startVisit, stopVisit, doWorkStart, doWorkHold, recordReachedLocation, computeWorkPanel, WorkPanelState } from '@/services/visitStartService';
import { fetchTicketById } from '@/services/engineerUpdateService';

const VISIT_BLOCKED_STATUSES = ['Closed', 'Customer Reject', 'Call Cancel', 'Delivered'];

const statusColor: Record<string, { bg: string; color: string }> = {
    'Assigned': { bg: '#dbeafe', color: '#1e40af' },
    'In Progress': { bg: '#fef3c7', color: '#92400e' },
    'Pending Parts': { bg: '#fee2e2', color: '#991b1b' },
    'Pending Customer Approval': { bg: '#ede9fe', color: '#5b21b6' },
    'Pending Repair Carry In': { bg: '#d1fae5', color: '#065f46' },
    'Pending Repair On Site': { bg: '#d1fae5', color: '#065f46' },
    'Closed': { bg: '#f3f4f6', color: '#374151' },
};

const fieldStyle = { width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' as const, fontFamily: 'inherit' };

// ─── Work Start / Reached Location / Work on Hold panel ─────────────────────
// Mirrors HTML's Visit Start / Work Start panel rendered inside openEngUpdate()
// (index.html:6897-6992) — driven by computeWorkPanel()'s state, not local UI
// state, so it always reflects the ticket's actual timeline.

function sessInfoLine(sessions: number, totalMin: number, suffix: string): string | null {
    if (!sessions) return null;
    return `📋 ${sessions} session(s) done${totalMin ? ` — ${Math.floor(totalMin / 60)}h ${totalMin % 60}m ${suffix}` : ''}`;
}

function WorkPanel({
    panel, busy, onVisitStart, onVisitStop, onWorkStart, onReachedLocation, onWorkHold,
}: {
    panel: WorkPanelState; busy: boolean;
    onVisitStart: () => void; onVisitStop: () => void; onWorkStart: () => void;
    onReachedLocation: () => void; onWorkHold: () => void;
}) {
    const btn = (label: string, onClick: () => void, bg: string, color: string, flex?: number) => (
        <button onClick={onClick} disabled={busy} style={{ flex: flex ?? undefined, width: flex ? undefined : '100%', background: bg, color, border: 'none', borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
            {label}
        </button>
    );

    switch (panel.kind) {
        case 'carryin-start':
            return <div style={{ marginBottom: 12 }}>{btn('🔧 Work Start', onWorkStart, '#059669', '#fff')}</div>;
        case 'carryin-paused': {
            const info = sessInfoLine(panel.sessions, panel.totalMin, 'total');
            return (
                <div style={{ background: '#fef9c3', border: '1.5px solid #fbbf24', borderRadius: 10, padding: 12, marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>{panel.isHold ? '⏸️ Work on Hold — Ready to resume' : '⏸️ Call Paused — ' + panel.statusLabel}</div>
                    {info && <div style={{ fontSize: 12, color: '#92400e', marginBottom: 8 }}>{info}</div>}
                    {btn('🔧 Resume Work', onWorkStart, '#059669', '#fff')}
                </div>
            );
        }
        case 'carryin-started':
            return (
                <div style={{ background: '#059669', color: '#fff', borderRadius: 10, padding: '12px 16px', marginBottom: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>
                        🔧 Work Started — {panel.wsTime}{panel.sessionNo > 1 ? ` (Session ${panel.sessionNo})` : ''}{panel.totalMin ? ` | ${Math.floor(panel.totalMin / 60)}h ${panel.totalMin % 60}m total` : ''}
                    </div>
                    {btn('⏸️ Work on Hold', onWorkHold, 'rgba(255,255,255,0.2)', '#fff')}
                </div>
            );
        case 'onsite-start':
            return (
                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                    {btn('🚗 Visit Start', onVisitStart, '#f59e0b', '#fff', 1)}
                    {btn('🔧 Work Start', onWorkStart, '#059669', '#fff', 1)}
                </div>
            );
        case 'onsite-paused': {
            const info = sessInfoLine(panel.sessions, panel.totalMin, 'total work time');
            return (
                <div style={{ background: '#fef9c3', border: '1.5px solid #fbbf24', borderRadius: 10, padding: 12, marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>{panel.label}</div>
                    {info && <div style={{ fontSize: 12, color: '#92400e', marginBottom: 8 }}>{info}</div>}
                    <div style={{ display: 'flex', gap: 8 }}>
                        {btn('🚗 Visit Start', onVisitStart, '#f59e0b', '#fff', 1)}
                        {btn('🔧 Work Start', onWorkStart, '#059669', '#fff', 1)}
                    </div>
                </div>
            );
        }
        case 'onsite-started':
            return (
                <div style={{ background: '#059669', color: '#fff', borderRadius: 10, padding: '12px 16px', marginBottom: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>
                        🔧 Work Started — {panel.wsTime}{panel.sessionNo > 1 ? ` (Session ${panel.sessionNo})` : ''}
                    </div>
                    {btn('⏸️ Work on Hold', onWorkHold, 'rgba(255,255,255,0.2)', '#fff')}
                </div>
            );
        case 'onsite-visiting':
            return (
                <div style={{ background: '#f59e0b', color: '#fff', borderRadius: 10, padding: '12px 16px', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>🚗 Visiting — {panel.vsTime}</span>
                        <button onClick={onVisitStop} disabled={busy} style={{ background: '#fff', color: '#b45309', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>🛑 Stop</button>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={onReachedLocation} disabled={busy || panel.reachedToday} style={{ flex: 1, background: panel.reachedToday ? 'rgba(255,255,255,0.25)' : '#fff', color: panel.reachedToday ? '#fff' : '#0d9488', border: panel.reachedToday ? '1.5px solid rgba(255,255,255,0.6)' : 'none', borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                            {panel.reachedToday ? '✅ Reached' : '📍 Reached Location'}
                        </button>
                        {btn('🔧 Work Start', onWorkStart, '#fff', '#059669', 1)}
                    </div>
                </div>
            );
        default:
            return null;
    }
}

export default function EngineerUpdateScreen() {
    const { data: session } = useSession();
    const userName = (session?.user as any)?.name ?? '';
    const engId = (session?.user as any)?.email ?? '';
    const roleType = (session?.user as any)?.roleType ?? '';

    const [statusFilter, setStatusFilter] = useState<'active' | 'closed' | 'all'>('active');
    const { tickets, loading, error, active, closed, update, refetch } = useEngineerUpdate(userName, statusFilter);

    const [selected, setSelected] = useState<EngineerTicket | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<UpdateForm>({ newStatus: '', note: '', labour: '', faultCode: '' });
    const [warrantyModalOpen, setWarrantyModalOpen] = useState(false);
    const [voidModalOpen, setVoidModalOpen] = useState(false);
    const [partIndentOpen, setPartIndentOpen] = useState(false);
    const [panelBusy, setPanelBusy] = useState(false);
    const [kmGateTicket, setKmGateTicket] = useState<EngineerTicket | null>(null);
    const [catchupTicket, setCatchupTicket] = useState<{ newTicket: EngineerTicket; skipTicketId: string } | null>(null);
    const [reachedTicket, setReachedTicket] = useState<EngineerTicket | null>(null);
    const [holdTicket, setHoldTicket] = useState<EngineerTicket | null>(null);
    const [holdRemark, setHoldRemark] = useState('');
    const [holdSaving, setHoldSaving] = useState(false);

    // Refreshes the open modal's ticket in place after a panel action, without
    // dropping the modal (mirrors HTML's closeModal()+openEngUpdate() re-open).
    const reloadSelected = async (id: string) => {
        const fresh = await fetchTicketById(id);
        if (fresh) setSelected(fresh);
        await refetch();
    };

    const handleVisitStart = async (t: EngineerTicket) => {
        if (roleType === 'engineer' && t.service_type !== 'Carry In') {
            const today = new Date().toLocaleDateString('en-CA');
            const skipKey = `kmSkip_${engId}_${today}`;
            let skipTicket: string | null = null;
            try { skipTicket = window.localStorage.getItem(skipKey); } catch { /* localStorage unavailable */ }
            if (skipTicket) { setCatchupTicket({ newTicket: t, skipTicketId: skipTicket }); return; }
            const hasOpening = await hasKmEntryToday(engId, 'opening');
            if (!hasOpening) { setKmGateTicket(t); return; }
        }
        setPanelBusy(true);
        const r = await startVisit(t, engId, userName, roleType);
        setPanelBusy(false);
        if (!r.success) alert('Error: ' + r.error); else await reloadSelected(t.id);
    };

    const handleVisitStop = async (t: EngineerTicket) => {
        setPanelBusy(true);
        const r = await stopVisit(t, engId, userName);
        setPanelBusy(false);
        if (!r.success) alert('Error: ' + r.error); else await reloadSelected(t.id);
    };

    const handleKmGateDone = async () => {
        if (!kmGateTicket) return;
        const t = kmGateTicket;
        setKmGateTicket(null);
        setPanelBusy(true);
        const r = await startVisit(t, engId, userName, roleType);
        setPanelBusy(false);
        if (!r.success) alert('Error: ' + r.error); else await reloadSelected(t.id);
    };

    const handleCatchupDone = async () => {
        if (!catchupTicket) return;
        const { newTicket } = catchupTicket;
        try { window.localStorage.removeItem(`kmSkip_${engId}_${new Date().toLocaleDateString('en-CA')}`); } catch { /* localStorage unavailable */ }
        setCatchupTicket(null);
        await handleVisitStart(newTicket);
    };

    const handleWorkStart = async (t: EngineerTicket) => {
        setPanelBusy(true);
        const r = await doWorkStart(t, engId, userName, roleType);
        setPanelBusy(false);
        if (!r.success) { alert('Error: ' + r.error); return; }
        alert(`Work Started! ✅ Time In: ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`);
        await reloadSelected(t.id);
    };

    const handleReachedLocationClick = async (t: EngineerTicket) => {
        const already = await hasArrivalKmForTicket(engId, t.id);
        if (already) { alert('✅ Arrival KM is already recorded for this call today.'); return; }
        setReachedTicket(t);
    };

    const handleReachedLocationDone = async (skipped?: boolean) => {
        if (!reachedTicket) return;
        const t = reachedTicket;
        setReachedTicket(null);
        const r = await recordReachedLocation(t, engId, userName, !!skipped);
        if (!r.success) { alert('Error: ' + r.error); return; }
        if (skipped) { try { window.localStorage.setItem(`kmSkip_${engId}_${new Date().toLocaleDateString('en-CA')}`, t.id); } catch { /* localStorage unavailable */ } }
        alert(`📍 Reached Location saved${skipped ? '\n\n⏭️ KM skip karyu — next call na Visit Start (travel start) par farjiyat KM levase.' : ''}\n\nNow go inside and tap 🔧 Work Start when you begin work.`);
        await reloadSelected(t.id);
    };

    const handleConfirmHold = async () => {
        if (!holdTicket) return;
        if (!holdRemark.trim()) { alert('Reason is mandatory!'); return; }
        setHoldSaving(true);
        const r = await doWorkHold(holdTicket, engId, userName, holdRemark.trim());
        setHoldSaving(false);
        if (!r.success) { alert('Error: ' + r.error); return; }
        const t = holdTicket;
        setHoldTicket(null); setHoldRemark('');
        alert('Work paused ✅\nYou can now go to another call.\nCome back and tap Work Start to resume.');
        await reloadSelected(t.id);
    };

    const openUpdate = (ticket: EngineerTicket) => {
        setSelected(ticket);
        const allowed = getAllowedStatuses(ticket.status, 'engineer', ticket.service_type, ticket.call_type, ticket.warranty_coverage);
        setForm({ newStatus: allowed[0] || '', note: '', labour: String(ticket.labor || ticket.service_charges || ''), faultCode: ticket.fault_code || '' });
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!selected || !form.newStatus) { alert('Select new status'); return; }

        let note = form.note;
        if (form.newStatus === 'Call Cancel') {
            const reason = validateStatusChangeReason(selected.status, form.newStatus);
            if (reason === null) return; // user cancelled the reason prompt
            if (reason) note = note ? `${note}\n\nCancel reason: ${reason}` : `Cancel reason: ${reason}`;
        }

        setSaving(true);
        const r = await update(selected, form.newStatus, note, form.labour, userName, form.faultCode);
        if (r.success) { setModalOpen(false); }
        else alert('Error: ' + r.error);
        setSaving(false);
    };

    const allowed = getAllowedStatuses(selected?.status, 'engineer', selected?.service_type, selected?.call_type, selected?.warranty_coverage);
    const workPanel = selected ? computeWorkPanel(selected) : null;

    const modalFooter = (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setModalOpen(false)} style={{ padding: '8px 16px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
            <button onClick={handleSave} disabled={saving || !form.newStatus} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: (saving || !form.newStatus) ? 0.6 : 1 }}>
                {saving ? 'Saving...' : '💾 Save Update'}
            </button>
        </div>
    );

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>🛠️ My Tickets</h1>
                <button onClick={refetch} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontSize: 13, background: 'white' }}>🔄 Refresh</button>
            </div>

            {error && <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#dc2626', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>Error: {error}</div>}

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {([
                    { id: 'active', label: `🔵 Active (${active})` },
                    { id: 'closed', label: `✅ Closed (${closed})` },
                    { id: 'all', label: `All (${tickets.length})` },
                ] as { id: 'active' | 'closed' | 'all'; label: string }[]).map(tab => (
                    <button key={tab.id} onClick={() => setStatusFilter(tab.id)} style={{ padding: '7px 14px', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontSize: 13, background: statusFilter === tab.id ? '#185FA5' : 'white', color: statusFilter === tab.id ? '#fff' : '#374151', fontWeight: statusFilter === tab.id ? 600 : 400 }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</p>
                : tickets.length === 0 ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>No tickets found</p>
                    : (
                        <div style={{ display: 'grid', gap: 10 }}>
                            {tickets.map(t => {
                                const sc = statusColor[t.status || ''] || { bg: '#f3f4f6', color: '#374151' };
                                const canUpdate = getAllowedStatuses(t.status, 'engineer', t.service_type, t.call_type, t.warranty_coverage).length > 0;
                                return (
                                    <div key={t.id} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                                                    <span style={{ fontWeight: 700, fontSize: 15 }}>{t.cname}</span>
                                                    <span style={{ padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color }}>{t.status}</span>
                                                </div>
                                                <div style={{ fontSize: 12, color: '#6b7280' }}>{t.mobile} | {t.brand_name} {t.model} | {t.serial}</div>
                                                <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>{t.problem}</div>
                                                {t.address && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>📍 {t.address} {t.pin ? `(${t.pin})` : ''}</div>}
                                                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{t.call_type} | {t.service_type} | JS: {t.job_sheet || '—'}</div>
                                            </div>
                                            {canUpdate && (
                                                <button onClick={() => openUpdate(t)} style={{ padding: '6px 14px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, marginLeft: 12, flexShrink: 0 }}>
                                                    ✏️ Update
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`Update — ${selected?.cname || ''}`} footer={modalFooter}>
                {selected && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, fontSize: 13 }}>
                            <div style={{ fontWeight: 600 }}>{selected.brand_name} {selected.model} | {selected.serial}</div>
                            <div style={{ color: '#6b7280', marginTop: 2 }}>{selected.problem}</div>
                            <div style={{ marginTop: 4 }}>
                                <span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: statusColor[selected.status || '']?.bg || '#f3f4f6', color: statusColor[selected.status || '']?.color || '#374151' }}>{selected.status}</span>
                            </div>
                        </div>

                        {!VISIT_BLOCKED_STATUSES.includes(selected.status || '') && workPanel && (
                            <WorkPanel
                                panel={workPanel}
                                busy={panelBusy}
                                onVisitStart={() => handleVisitStart(selected)}
                                onVisitStop={() => handleVisitStop(selected)}
                                onWorkStart={() => handleWorkStart(selected)}
                                onReachedLocation={() => handleReachedLocationClick(selected)}
                                onWorkHold={() => setHoldTicket(selected)}
                            />
                        )}

                        {(selected.call_type === 'Non-Warranty' || selected.call_type === 'Non-Warranty Repeat') && !selected.warranty_claim_pending && (
                            <button onClick={() => setWarrantyModalOpen(true)} style={{ padding: '8px 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>🔓 Submit Warranty Claim</button>
                        )}
                        {selected.warranty_claim_pending && (
                            <div style={{ background: '#fef3c7', color: '#92400e', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600 }}>⏳ Warranty claim pending review</div>
                        )}
                        {selected.warranty_coverage !== 'Out of Coverage' && (
                            <button onClick={() => setVoidModalOpen(true)} style={{ padding: '8px 14px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>⚠️ Mark Out of Coverage</button>
                        )}
                        {selected.status === 'Sent to MSC' && (
                            <MSCDispatchPanel ticketId={selected.id} readOnly byUser={userName} />
                        )}

                        {(selected.spares && selected.spares.length > 0) && (
                            <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12 }}>
                                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>🔩 Requested Parts</div>
                                {selected.spares.map((s, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0' }}>
                                        <span>{s.code} {s.name} × {s.qty}</span>
                                        <span style={{ fontWeight: 600 }}>₹{((s.qty || 0) * (s.price || 0)).toFixed(0)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {!['Closed', 'Call Cancel', 'Customer Reject', 'Pending Customer Approval'].includes(selected.status || '') && (
                            <button onClick={() => setPartIndentOpen(true)} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, alignSelf: 'flex-start' }}>📦 Request Part</button>
                        )}

                        {allowed.length > 0 ? (
                            <>
                                <div>
                                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>New Status *</label>
                                    <select value={form.newStatus} onChange={e => setForm(f => ({ ...f, newStatus: e.target.value }))} style={fieldStyle}>
                                        <option value="">Select status...</option>
                                        {allowed.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                {form.newStatus === 'Closed' && (
                                    <div>
                                        <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Service / Labour ₹</label>
                                        <input type="number" value={form.labour} onChange={e => setForm(f => ({ ...f, labour: e.target.value }))} style={fieldStyle} placeholder="0" />
                                    </div>
                                )}
                                <div>
                                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Fault Code</label>
                                    <input type="text" value={form.faultCode} onChange={e => setForm(f => ({ ...f, faultCode: e.target.value }))} style={fieldStyle} />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Update Note</label>
                                        <AIWriteButton type="update" onInsert={(text) => setForm(f => ({ ...f, note: text }))} />
                                    </div>
                                    <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={3} placeholder="Work done, observations..." style={{ ...fieldStyle, resize: 'vertical' }} />
                                </div>
                            </>
                        ) : (
                            <div style={{ background: '#fef3c7', borderRadius: 8, padding: 12, fontSize: 13, color: '#92400e' }}>
                                ⏳ No status update available for: <strong>{selected.status}</strong>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
            {warrantyModalOpen && selected && (
                <WarrantyClaimModal
                    ticket={selected}
                    submittedBy={userName}
                    onClose={() => setWarrantyModalOpen(false)}
                    onDone={async () => { setWarrantyModalOpen(false); setModalOpen(false); await refetch(); }}
                />
            )}
            {voidModalOpen && selected && (
                <EngVoidWarrantyModal
                    ticket={selected}
                    byUser={userName}
                    onClose={() => setVoidModalOpen(false)}
                    onDone={async () => { setVoidModalOpen(false); setModalOpen(false); await refetch(); }}
                />
            )}
            {partIndentOpen && selected && (
                <PartIndentModal
                    ticket={selected}
                    byUser={userName}
                    isEngineerOnSite={selected.service_type === 'On Site'}
                    onClose={() => setPartIndentOpen(false)}
                    onDone={async () => { setPartIndentOpen(false); setModalOpen(false); await refetch(); }}
                />
            )}
            {kmGateTicket && (
                <KmCaptureModal
                    type="opening"
                    engId={engId}
                    engName={userName}
                    ticketId={null}
                    onClose={() => setKmGateTicket(null)}
                    onDone={handleKmGateDone}
                />
            )}
            {catchupTicket && (
                <KmCaptureModal
                    type="arrival"
                    engId={engId}
                    engName={userName}
                    ticketId={catchupTicket.skipTicketId}
                    onClose={() => setCatchupTicket(null)}
                    onDone={handleCatchupDone}
                />
            )}
            {reachedTicket && (
                <KmCaptureModal
                    type="arrival"
                    engId={engId}
                    engName={userName}
                    ticketId={reachedTicket.id}
                    allowSkip
                    onClose={() => setReachedTicket(null)}
                    onDone={handleReachedLocationDone}
                />
            )}
            {holdTicket && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: 360, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#92400e', marginBottom: 6 }}>⏸️ Work on Hold</div>
                        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Work log will be paused. You can start another call and come back to resume this one.</div>
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Reason for hold <span style={{ color: '#dc2626' }}>*</span></label>
                            <textarea
                                value={holdRemark}
                                onChange={(e) => setHoldRemark(e.target.value)}
                                rows={3}
                                placeholder="e.g. Customer not available, waiting for part, going to urgent call..."
                                style={{ width: '100%', border: '1.5px solid #d1d5db', borderRadius: 8, padding: 10, fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => { setHoldTicket(null); setHoldRemark(''); }} style={{ flex: 1, padding: 10, background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Cancel</button>
                            <button onClick={handleConfirmHold} disabled={holdSaving} style={{ flex: 1, padding: 10, background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: holdSaving ? 0.6 : 1 }}>
                                {holdSaving ? 'Saving...' : '⏸️ Put on Hold'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}