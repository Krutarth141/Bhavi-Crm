'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import * as XLSX from 'xlsx';
import { useEngineers } from '@/hooks/useEngineers';
import { isCspManager } from '@/lib/permissions';
import { hasKmEntryToday } from '@/services/kmTrackingService';
import KmCaptureModal from '@/components/screens/tickets/KmCaptureModal';
import {
    SiteVisit, SiteVisitFormData, emptySiteVisitForm, SV_TYPES, SV_TYPE_META, SV_STATUS_META, SV_STATUS_ORDER, SvStatus,
} from '@/types/siteVisits';
import {
    fetchSiteVisits, saveSiteVisit, svTravelStart, svReached, svWorkStart, svWorkEnd,
    svStopTravel, svStopWork, svDone, svCancel, svDelete, fetchSvReport, SvReportRow,
} from '@/services/siteVisitsService';

const fieldStyle = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box' as const };

const SV_SECTION_COLOR: Record<SvStatus, string> = {
    Assigned: '#1d4ed8', Traveling: '#ea580c', Reached: '#0d9488', Working: '#b45309', Done: '#15803d', Cancelled: '#6b7280',
};

export default function SiteVisitsScreen() {
    const { data: session } = useSession();
    const roleType = (session?.user as any)?.roleType;
    const cspMgr = isCspManager(session);
    const isAdm = roleType === 'admin';
    const isWC = roleType === 'work_controller';
    const isEng = roleType === 'engineer';
    const canAdminList = isAdm || isWC || cspMgr;
    const myId = (session?.user as any)?.email ?? '';
    const myName = (session?.user as any)?.name ?? '';

    const { engineers } = useEngineers();
    const [visits, setVisits] = useState<SiteVisit[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [engFilter, setEngFilter] = useState('');

    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState<SiteVisitFormData>(emptySiteVisitForm);
    const [saving, setSaving] = useState(false);

    const [reportOpen, setReportOpen] = useState(false);
    const [rFrom, setRFrom] = useState(new Date().toLocaleDateString('en-CA').substring(0, 8) + '01');
    const [rTo, setRTo] = useState(new Date().toLocaleDateString('en-CA'));
    const [reportRows, setReportRows] = useState<SvReportRow[]>([]);
    const [reportLoading, setReportLoading] = useState(false);

    const [kmVisitId, setKmVisitId] = useState<number | null>(null);
    const [kmStep, setKmStep] = useState<'opening' | 'arrival' | null>(null);

    const load = useCallback(async () => {
        if (!myId) return;
        setLoading(true);
        setVisits(await fetchSiteVisits(myId, canAdminList));
        setLoading(false);
    }, [myId, canAdminList]);

    useEffect(() => { load(); }, [load]);

    const byStatus = (s: SvStatus) => visits.filter(v => v.status === s);
    const assigned = byStatus('Assigned');
    const traveling = byStatus('Traveling');
    const reached = byStatus('Reached');
    const working = byStatus('Working');
    const done = byStatus('Done');
    const cancelled = byStatus('Cancelled');
    const assignedCount = assigned.length;
    const travelingCount = traveling.length;
    const reachedCount = reached.length;
    const workingCount = working.length;
    // HTML groups the card list into exactly these 6 status sections, in this
    // order, each shown only when non-empty.
    const groupsByStatus: Record<SvStatus, SiteVisit[]> = {
        Assigned: assigned, Traveling: traveling, Reached: reached, Working: working, Done: done, Cancelled: cancelled,
    };

    const engineerName = (uid: string) => engineers.find(e => e.user_id === uid)?.name || '';

    const filtered = (arr: SiteVisit[]) => arr.filter(v => {
        const q = search.toLowerCase();
        const matchSearch = !q || (v.client_name || '').toLowerCase().includes(q) || (v.site_name || '').toLowerCase().includes(q) || (v.address || '').toLowerCase().includes(q);
        const matchType = !typeFilter || v.visit_type === typeFilter;
        const matchStatus = !statusFilter || v.status === statusFilter;
        const matchEng = !engFilter || v.assigned_to === engFilter;
        return matchSearch && matchType && matchStatus && matchEng;
    });

    const openCreate = () => { setEditId(null); setForm({ ...emptySiteVisitForm, assigned_to: isEng ? myId : '' }); setModalOpen(true); };
    const openEdit = (v: SiteVisit) => {
        setEditId(v.id);
        setForm({
            visit_type: v.visit_type, client_name: v.client_name, site_name: v.site_name || '',
            address: v.address || '', location: v.location || '', rooms: v.rooms != null ? String(v.rooms) : '',
            visit_date: v.visit_date || emptySiteVisitForm.visit_date, purpose: v.purpose || '',
            assigned_to: v.assigned_to || '', notes: v.notes || '',
        });
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.client_name.trim()) { alert('Client name is required.'); return; }
        setSaving(true);
        const r = await saveSiteVisit(editId, form, engineerName(form.assigned_to), myId, myName);
        setSaving(false);
        if (!r.success) { alert('Error saving: ' + r.error); return; }
        setModalOpen(false);
        await load();
    };

    const handleTravelStart = async (v: SiteVisit) => {
        if (isEng) {
            const hasOpening = await hasKmEntryToday(myId, 'opening');
            if (!hasOpening) { setKmVisitId(v.id); setKmStep('opening'); return; }
        }
        const r = await svTravelStart(v.id);
        if (!r.success) alert('Error: ' + r.error); else await load();
    };
    const handleReached = async (v: SiteVisit) => {
        if (isEng) { setKmVisitId(v.id); setKmStep('arrival'); return; }
        const r = await svReached(v.id);
        if (!r.success) alert('Error: ' + r.error); else await load();
    };
    const handleKmDone = async () => {
        if (kmVisitId == null || !kmStep) return;
        const r = kmStep === 'opening' ? await svTravelStart(kmVisitId) : await svReached(kmVisitId);
        setKmVisitId(null); setKmStep(null);
        if (!r.success) alert('Error: ' + r.error); else await load();
    };
    const handleWorkStart = async (v: SiteVisit) => {
        const r = await svWorkStart(v.id);
        if (!r.success) alert('Error: ' + r.error); else await load();
    };
    const handleWorkEnd = async (v: SiteVisit) => {
        const r = await svWorkEnd(v.id);
        if (!r.success) alert('Error: ' + r.error); else await load();
    };
    const handleStopTravel = async (v: SiteVisit) => {
        if (!confirm('Stop travel and revert to Assigned?')) return;
        const r = await svStopTravel(v.id);
        if (!r.success) alert('Error: ' + r.error); else await load();
    };
    const handleStopWork = async (v: SiteVisit) => {
        if (!confirm('Stop work and revert to Reached?')) return;
        const r = await svStopWork(v.id);
        if (!r.success) alert('Error: ' + r.error); else await load();
    };
    const handleDone = async (v: SiteVisit) => {
        const r = await svDone(v.id);
        if (!r.success) alert('Error: ' + r.error); else await load();
    };
    const handleCancel = async (v: SiteVisit) => {
        if (!confirm(`Cancel this visit?\n\n${v.client_name} — ${v.visit_type}`)) return;
        const r = await svCancel(v.id);
        if (!r.success) alert('Error: ' + r.error); else await load();
    };
    const handleDelete = async (v: SiteVisit) => {
        if (!confirm(`Permanently delete this visit?\n\n${v.client_name} — ${v.visit_type}\n\nThis cannot be undone.`)) return;
        const r = await svDelete(v.id);
        if (!r.success) alert('Error: ' + r.error); else await load();
    };

    const loadReport = async () => {
        setReportLoading(true);
        try { setReportRows(await fetchSvReport(rFrom, rTo)); }
        catch (e: any) { alert('Error: ' + e.message); }
        setReportLoading(false);
    };
    useEffect(() => { if (reportOpen) loadReport(); }, [reportOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    const downloadReport = () => {
        if (!reportRows.length) { alert('No data — click Load first.'); return; }
        const data = reportRows.map(r => {
            const o: any = { Engineer: r.name };
            SV_TYPES.forEach(t => { o[t] = r.types[t] || 0; });
            o['Total Done'] = r.total;
            return o;
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Site Visits');
        XLSX.writeFile(wb, `Site_Visits_Report_${rFrom}_to_${rTo}.xlsx`);
    };

    const canAct = (v: SiteVisit) => isAdm || (isEng && String(v.assigned_to) === String(myId)) || cspMgr;
    // Edit/Delete are admin-only (matches HTML's canManage=isAdm); Cancel is
    // available to anyone who canAct, including the assigned engineer.
    const canManage = (v: SiteVisit) => isAdm;

    const renderCard = (v: SiteVisit) => {
        const meta = SV_TYPE_META[v.visit_type] || SV_TYPE_META['Other'];
        const sm = SV_STATUS_META[v.status];
        const fmtT = (iso?: string | null) => iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
        return (
            <div key={v.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: `4px solid ${sm.color}`, borderRadius: 8, padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>{meta.emoji} {v.client_name}</div>
                        <div style={{ fontSize: 12, color: meta.color, fontWeight: 700, marginTop: 2 }}>{v.visit_type}{v.site_name ? ` • ${v.site_name}` : ''}{v.rooms != null ? ` • ${v.rooms} rooms` : ''}</div>
                        {v.address && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>📍 {v.address}{v.location && <> &nbsp;<a href={`https://maps.google.com/?q=${encodeURIComponent(v.location)}`} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>Map</a></>}</div>}
                        {v.purpose && <div style={{ fontSize: 12, marginTop: 4, color: '#374151' }}>📝 {v.purpose}</div>}
                        {v.notes && <div style={{ fontSize: 12, marginTop: 2, color: '#6b7280' }}>💬 {v.notes}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: 11, background: `${sm.color}22`, color: sm.color, padding: '3px 10px', borderRadius: 99, fontWeight: 700 }}>{sm.emoji} {v.status}</span>
                        {v.assigned_name && <span style={{ fontSize: 11, background: '#ede9fe', color: '#6d28d9', padding: '3px 9px', borderRadius: 99, fontWeight: 600 }}>👷 {v.assigned_name}</span>}
                        {v.visit_date && <span style={{ fontSize: 11, color: '#9ca3af' }}>📅 {v.visit_date}</span>}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, justifyContent: 'flex-end' }}>
                    {canAct(v) && v.status === 'Assigned' && <button onClick={() => handleTravelStart(v)} style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>🚗 Travel Start</button>}
                    {canAct(v) && v.status === 'Traveling' && <button onClick={() => handleReached(v)} style={{ background: '#0d9488', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>📍 Reached</button>}
                    {canAct(v) && v.status === 'Traveling' && <button onClick={() => handleStopTravel(v)} style={{ border: '1px solid #dc2626', color: '#dc2626', background: '#fff', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>⏹ Stop Travel</button>}
                    {canAct(v) && v.status === 'Reached' && <button onClick={() => handleWorkStart(v)} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>🔧 Work Start</button>}
                    {canAct(v) && (v.status === 'Reached' || v.status === 'Working') && <button onClick={() => handleDone(v)} style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>✅ Done</button>}
                    {canAct(v) && v.status === 'Working' && <button onClick={() => handleWorkEnd(v)} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>🏁 Work End</button>}
                    {canAct(v) && v.status === 'Working' && <button onClick={() => handleStopWork(v)} style={{ border: '1px solid #dc2626', color: '#dc2626', background: '#fff', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>⏹ Stop Work</button>}
                    {canManage(v) && <button onClick={() => openEdit(v)} style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>✏️</button>}
                    {canAct(v) && v.status !== 'Done' && v.status !== 'Cancelled' && <button onClick={() => handleCancel(v)} style={{ border: '1px solid #fde68a', color: '#b45309', background: '#fff', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>🚫</button>}
                    {canManage(v) && <button onClick={() => handleDelete(v)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>🗑️</button>}
                </div>
                {(v.travel_start_at || v.reached_at || v.work_start_at || v.work_end_at || v.done_at) && (
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6, fontSize: 11, color: '#64748b', borderTop: '1px dashed #e5e7eb', paddingTop: 6 }}>
                        {v.travel_start_at && <span>🚗 {fmtT(v.travel_start_at)}</span>}
                        {v.reached_at && <span>📍 {fmtT(v.reached_at)}</span>}
                        {v.work_start_at && <span>🔧 {fmtT(v.work_start_at)}</span>}
                        {v.work_end_at && <span>🏁 {fmtT(v.work_end_at)}</span>}
                        {v.done_at && <span style={{ color: '#059669', fontWeight: 700 }}>✅ {fmtT(v.done_at)}</span>}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>🏗️ Site Visits ({visits.length})</h1>
                <div style={{ display: 'flex', gap: 8 }}>
                    {canAdminList && <button onClick={() => setReportOpen(true)} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>📊 Report</button>}
                    <button onClick={openCreate} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>+ New Visit</button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                <div style={{ background: '#eff6ff', borderRadius: 10, padding: '10px 16px' }}><div style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 700 }}>📌 Assigned</div><div style={{ fontSize: 20, fontWeight: 800, color: '#1d4ed8' }}>{assignedCount}</div></div>
                <div style={{ background: '#fff7ed', borderRadius: 10, padding: '10px 16px' }}><div style={{ fontSize: 11, color: '#c2410c', fontWeight: 700 }}>🚗 Traveling</div><div style={{ fontSize: 20, fontWeight: 800, color: '#c2410c' }}>{travelingCount}</div></div>
                <div style={{ background: '#f0fdfa', borderRadius: 10, padding: '10px 16px' }}><div style={{ fontSize: 11, color: '#0d9488', fontWeight: 700 }}>📍 Reached</div><div style={{ fontSize: 20, fontWeight: 800, color: '#0d9488' }}>{reachedCount}</div></div>
                <div style={{ background: '#eef2ff', borderRadius: 10, padding: '10px 16px' }}><div style={{ fontSize: 11, color: '#4338ca', fontWeight: 700 }}>🔧 Working</div><div style={{ fontSize: 20, fontWeight: 800, color: '#4338ca' }}>{workingCount}</div></div>
                <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '10px 16px' }}><div style={{ fontSize: 11, color: '#15803d', fontWeight: 700 }}>✅ Done</div><div style={{ fontSize: 20, fontWeight: 800, color: '#15803d' }}>{done.length}</div></div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                <input type="text" placeholder="Search client / site / address..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...fieldStyle, flex: 1, minWidth: 160 }} />
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ ...fieldStyle, width: 'auto' }}>
                    <option value="">All Types</option>
                    {SV_TYPES.map(t => <option key={t} value={t}>{SV_TYPE_META[t].emoji} {t}</option>)}
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...fieldStyle, width: 'auto' }}>
                    <option value="">All Status</option>
                    {SV_STATUS_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {canAdminList && (
                    <select value={engFilter} onChange={e => setEngFilter(e.target.value)} style={{ ...fieldStyle, width: 'auto' }}>
                        <option value="">All Engineers</option>
                        {engineers.map(e => <option key={e.id} value={e.user_id}>{e.name}</option>)}
                    </select>
                )}
            </div>

            {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</p>
                : visits.length === 0 ? <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, textAlign: 'center', padding: 40, color: '#9ca3af' }}>🏗️ No site visits yet. Click &quot;New Visit&quot; to add one!</div>
                    : (
                        <>
                            {SV_STATUS_ORDER.map(st => {
                                const rows = filtered(groupsByStatus[st]);
                                if (rows.length === 0) return null;
                                const color = SV_SECTION_COLOR[st];
                                return (
                                    <div key={st}>
                                        <h3 style={{ marginTop: 16, padding: '8px 12px', background: `${color}15`, borderLeft: `3px solid ${color}`, borderRadius: 6, fontSize: 14, color, fontWeight: 700 }}>{st} ({rows.length})</h3>
                                        {rows.map(renderCard)}
                                    </div>
                                );
                            })}
                        </>
                    )}

            {modalOpen && (
                <div onClick={() => setModalOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: 17 }}>{editId ? '✏️ Edit Visit' : '🏗️ New Site Visit'}</h2>
                            <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
                        </div>
                        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div><label style={{ fontSize: 12, fontWeight: 700 }}>Visit Type *</label>
                                <select value={form.visit_type} onChange={e => setForm(f => ({ ...f, visit_type: e.target.value }))} style={fieldStyle}>
                                    {SV_TYPES.map(t => <option key={t} value={t}>{SV_TYPE_META[t].emoji} {t}</option>)}
                                </select>
                            </div>
                            <div><label style={{ fontSize: 12, fontWeight: 700 }}>Client Name *</label><input type="text" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} style={fieldStyle} /></div>
                            <div><label style={{ fontSize: 12, fontWeight: 700 }}>Site Name</label><input type="text" value={form.site_name} onChange={e => setForm(f => ({ ...f, site_name: e.target.value }))} style={fieldStyle} /></div>
                            <div><label style={{ fontSize: 12, fontWeight: 700 }}>Address</label><input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} style={fieldStyle} /></div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <div style={{ flex: 1 }}><label style={{ fontSize: 12, fontWeight: 700 }}>Location (Maps link)</label><input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} style={fieldStyle} /></div>
                                <div style={{ width: 100 }}><label style={{ fontSize: 12, fontWeight: 700 }}>Rooms</label><input type="number" value={form.rooms} onChange={e => setForm(f => ({ ...f, rooms: e.target.value }))} style={fieldStyle} /></div>
                            </div>
                            <div><label style={{ fontSize: 12, fontWeight: 700 }}>Visit Date</label><input type="date" value={form.visit_date} onChange={e => setForm(f => ({ ...f, visit_date: e.target.value }))} style={fieldStyle} /></div>
                            <div><label style={{ fontSize: 12, fontWeight: 700 }}>Purpose</label><input type="text" value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} style={fieldStyle} /></div>
                            <div><label style={{ fontSize: 12, fontWeight: 700 }}>Assign to Engineer</label>
                                <select value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} style={fieldStyle}>
                                    <option value="">— Select Engineer —</option>
                                    {engineers.map(e => <option key={e.id} value={e.user_id}>{e.name}</option>)}
                                </select>
                            </div>
                            <div><label style={{ fontSize: 12, fontWeight: 700 }}>Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...fieldStyle, resize: 'vertical' }} /></div>
                        </div>
                        <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button onClick={() => setModalOpen(false)} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                            <button onClick={handleSave} disabled={saving} style={{ padding: '8px 14px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : '💾 Save'}</button>
                        </div>
                    </div>
                </div>
            )}

            {reportOpen && (
                <div onClick={() => setReportOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: 17 }}>📊 Site Visits Report</h2>
                            <button onClick={() => setReportOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
                        </div>
                        <div style={{ padding: 20 }}>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }}>
                                <div><label style={{ fontSize: 12, fontWeight: 700, display: 'block' }}>From</label><input type="date" value={rFrom} onChange={e => setRFrom(e.target.value)} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 13 }} /></div>
                                <div><label style={{ fontSize: 12, fontWeight: 700, display: 'block' }}>To</label><input type="date" value={rTo} onChange={e => setRTo(e.target.value)} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 13 }} /></div>
                                <button onClick={loadReport} style={{ height: 34, padding: '0 14px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>🔍 Load</button>
                                <button onClick={downloadReport} style={{ height: 34, padding: '0 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>⬇️ Excel</button>
                            </div>
                            {reportLoading ? <p style={{ textAlign: 'center', color: '#6b7280' }}>Loading...</p>
                                : reportRows.length === 0 ? <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}>No completed visits in this period.</div>
                                    : (
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                                <thead><tr style={{ background: '#f8fafc', textAlign: 'center' }}>
                                                    <th style={{ padding: '7px 9px', textAlign: 'left' }}>Engineer</th>
                                                    {SV_TYPES.map(t => <th key={t} style={{ padding: '7px 9px' }}>{SV_TYPE_META[t].emoji}</th>)}
                                                    <th style={{ padding: '7px 9px' }}>Total</th>
                                                </tr></thead>
                                                <tbody>
                                                    {reportRows.map(r => (
                                                        <tr key={r.name} style={{ borderBottom: '1px solid #eef2f7' }}>
                                                            <td style={{ padding: '6px 9px', fontWeight: 600 }}>{r.name}</td>
                                                            {SV_TYPES.map(t => <td key={t} style={{ padding: '6px 9px', textAlign: 'center' }}>{r.types[t] || ''}</td>)}
                                                            <td style={{ padding: '6px 9px', textAlign: 'center', fontWeight: 800, color: '#059669' }}>{r.total}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                        </div>
                    </div>
                </div>
            )}

            {kmVisitId != null && kmStep && (
                <KmCaptureModal
                    type={kmStep}
                    engId={myId}
                    engName={myName}
                    ticketId={`SV${kmVisitId}`}
                    onClose={() => { setKmVisitId(null); setKmStep(null); }}
                    onDone={handleKmDone}
                />
            )}
        </div>
    );
}