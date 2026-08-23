'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import * as XLSX from 'xlsx';
import { useEngineers } from '@/hooks/useEngineers';
import { isCspManager } from '@/lib/permissions';
import { hasKmEntryToday, hasArrivalKmForTicket } from '@/services/kmTrackingService';
import KmCaptureModal from '@/components/screens/tickets/KmCaptureModal';
import {
    FieldTask, FieldTaskFormData, emptyFieldTaskForm, FT_TYPES, FT_TYPE_META, FT_STATUS_META, FT_OFFICE_WORK_TYPES,
} from '@/types/fieldTasks';
import {
    fetchFieldTasks, saveFieldTask, ftTravelStart, ftReached, ftDone, ftCancel, ftDelete,
    fetchFtReport, FtReportRow,
} from '@/services/fieldTasksService';

const fieldStyle = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box' as const };

export default function FieldTasksScreen() {
    const { data: session } = useSession();
    const roleType = (session?.user as any)?.roleType;
    const cspMgr = isCspManager(session);
    const isAdm = roleType === 'admin';
    const isWC = roleType === 'work_controller';
    const isEng = roleType === 'engineer';
    const canAdminList = isAdm || isWC || cspMgr;
    const myId = (session?.user as any)?.email ?? '';
    const myName = (session?.user as any)?.name ?? '';
    const memberRole = isWC ? 'WC' : (isEng ? 'Engineer' : 'Other');

    const { engineers } = useEngineers();
    const [tasks, setTasks] = useState<FieldTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [engFilter, setEngFilter] = useState('');

    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState<FieldTaskFormData>(emptyFieldTaskForm);
    const [saving, setSaving] = useState(false);

    const [reportOpen, setReportOpen] = useState(false);
    const [rFrom, setRFrom] = useState(new Date().toLocaleDateString('en-CA').substring(0, 8) + '01');
    const [rTo, setRTo] = useState(new Date().toLocaleDateString('en-CA'));
    const [reportRows, setReportRows] = useState<FtReportRow[]>([]);
    const [reportLoading, setReportLoading] = useState(false);

    const [kmTaskId, setKmTaskId] = useState<number | null>(null);
    const [kmStep, setKmStep] = useState<'opening' | 'arrival' | null>(null);

    const load = useCallback(async () => {
        if (!myId) return;
        setLoading(true);
        setTasks(await fetchFieldTasks(myId, canAdminList));
        setLoading(false);
    }, [myId, canAdminList]);

    useEffect(() => { load(); }, [load]);

    const today = new Date().toLocaleDateString('en-CA');
    const active = tasks.filter(t => t.status !== 'Done' && t.status !== 'Cancelled');
    const done = tasks.filter(t => t.status === 'Done');
    const cancelled = tasks.filter(t => t.status === 'Cancelled');
    const doneToday = done.filter(t => t.done_date === today).length;

    const engineerName = (uid: string) => engineers.find(e => e.user_id === uid)?.name || '';

    const filtered = (arr: FieldTask[]) => arr.filter(t => {
        const q = search.toLowerCase();
        const matchSearch = !q || (t.customer_name || '').toLowerCase().includes(q) || (t.mobile || '').toLowerCase().includes(q);
        const matchType = !typeFilter || t.task_type === typeFilter;
        const matchStatus = !statusFilter || t.status === statusFilter;
        const matchEng = !engFilter || t.assigned_to === engFilter;
        return matchSearch && matchType && matchStatus && matchEng;
    });

    const openCreate = () => { setEditId(null); setForm({ ...emptyFieldTaskForm, assigned_to: isEng ? myId : '' }); setModalOpen(true); };
    const openEdit = (t: FieldTask) => {
        setEditId(t.id);
        setForm({
            task_type: t.task_type, customer_name: t.customer_name, mobile: t.mobile || '',
            amount: t.amount != null ? String(t.amount) : '', address: t.address || '', location: t.location || '',
            assigned_to: t.assigned_to || '', notes: t.notes || '',
            from_time: t.from_time || '', to_time: t.to_time || '',
        });
        setModalOpen(true);
    };

    const isOfficeForm = form.task_type === 'Office Work';

    const handleSave = async () => {
        if (!form.customer_name.trim()) { alert(isOfficeForm ? 'Work Type is required.' : 'Customer / Party name is required.'); return; }
        setSaving(true);
        const r = await saveFieldTask(editId, form, engineerName(form.assigned_to), myId, myName, isWC ? 'WC' : 'Engineer');
        setSaving(false);
        if (!r.success) { alert('Error saving: ' + r.error); return; }
        setModalOpen(false);
        await load();
    };

    // Travel Start — opening KM required first if not yet captured today (engineers only)
    // Travel Start — opening KM required first if not yet captured today (engineers only)
    const handleTravelStart = async (t: FieldTask) => {
        if (isEng) {
            const hasOpening = await hasKmEntryToday(myId, 'opening');
            if (!hasOpening) { setKmTaskId(t.id); setKmStep('opening'); return; }
        }
        const r = await ftTravelStart(t.id, myId, myName, memberRole, t);
        if (!r.success) alert('Error: ' + r.error); else await load();
    };
    const handleReached = async (t: FieldTask) => {
        if (isEng) {
            // index.html:23670-23674 — skip the modal entirely if today's
            // arrival KM for this task is already recorded.
            const already = await hasArrivalKmForTicket(myId, `FT${t.id}`);
            if (already) {
                const r = await ftReached(t.id, myId, myName, memberRole, t);
                if (!r.success) alert('Error: ' + r.error); else await load();
                return;
            }
            setKmTaskId(t.id); setKmStep('arrival'); return;
        }
        const r = await ftReached(t.id, myId, myName, memberRole, t);
        if (!r.success) alert('Error: ' + r.error); else await load();
    };
    const handleKmDone = async () => {
        if (kmTaskId == null || !kmStep) return;
        const t = tasks.find((x) => x.id === kmTaskId);
        const r = kmStep === 'opening' ? await ftTravelStart(kmTaskId, myId, myName, memberRole, t) : await ftReached(kmTaskId, myId, myName, memberRole, t);
        setKmTaskId(null); setKmStep(null);
        if (!r.success) alert('Error: ' + r.error); else await load();
    };
    const handleDone = async (t: FieldTask) => {
        const r = await ftDone(t.id, myId, myName, memberRole, t);
        if (!r.success) alert('Error: ' + r.error); else await load();
    };
    const handleCancel = async (t: FieldTask) => {
        if (!confirm(`Cancel this task?\n\n${t.customer_name} — ${t.task_type}`)) return;
        const r = await ftCancel(t.id);
        if (!r.success) alert('Error: ' + r.error); else await load();
    };
    const handleDelete = async (t: FieldTask) => {
        if (!confirm(`Permanently delete this task?\n\n${t.customer_name} — ${t.task_type}\n\nThis cannot be undone.`)) return;
        const r = await ftDelete(t.id);
        if (!r.success) alert('Error: ' + r.error); else await load();
    };

    const loadReport = async () => {
        setReportLoading(true);
        try { setReportRows(await fetchFtReport(rFrom, rTo)); }
        catch (e: any) { alert('Error: ' + e.message); }
        setReportLoading(false);
    };
    useEffect(() => { if (reportOpen) loadReport(); }, [reportOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    const downloadReport = () => {
        if (!reportRows.length) { alert('No data — click Load first.'); return; }
        const data = reportRows.map(r => {
            const o: any = { Engineer: r.name };
            FT_TYPES.forEach(t => { o[t] = r.types[t] || 0; });
            o['Total Done'] = r.total; o['Amount (₹)'] = r.amount;
            return o;
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Other Work');
        XLSX.writeFile(wb, `Other_Work_Report_${rFrom}_to_${rTo}.xlsx`);
    };

    const canAct = (t: FieldTask) => isAdm || (isEng && String(t.assigned_to) === String(myId)) || cspMgr;
    const canManage = (t: FieldTask) => isAdm || isWC || cspMgr || String(t.created_by) === String(myId);

    const renderCard = (t: FieldTask) => {
        const meta = FT_TYPE_META[t.task_type] || FT_TYPE_META['Other'];
        const sm = FT_STATUS_META[t.status];
        const amt = t.amount != null ? Number(t.amount) : null;
        const fmtT = (iso?: string | null) => iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
        return (
            <div key={t.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: `4px solid ${sm.color}`, borderRadius: 8, padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>{meta.emoji} {t.customer_name || '(no name)'}{t.mobile ? <> &nbsp;<a href={`tel:${t.mobile}`} style={{ fontSize: 12, color: '#2563eb' }}>📱 {t.mobile}</a></> : ''}</div>
                        <div style={{ fontSize: 12, color: meta.color, fontWeight: 700, marginTop: 2 }}>
                            {t.task_type}{amt != null && !isNaN(amt) ? ` • ₹${amt.toLocaleString('en-IN')}` : ''}
                            {t.from_time && t.to_time && <span style={{ color: '#7c3aed', fontWeight: 700 }}> • 🕐 {t.from_time} – {t.to_time}</span>}
                        </div>
                        {t.address && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>📍 {t.address}{t.location && <> &nbsp;<a href={`https://maps.google.com/?q=${encodeURIComponent(t.location)}`} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>Map</a></>}</div>}
                        {t.notes && <div style={{ fontSize: 12, marginTop: 4, color: '#6b7280' }}>💬 {t.notes}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: 11, background: `${sm.color}22`, color: sm.color, padding: '3px 10px', borderRadius: 99, fontWeight: 700 }}>{sm.emoji} {t.status}</span>
                        {t.assigned_name && <span style={{ fontSize: 11, background: '#ede9fe', color: '#6d28d9', padding: '3px 9px', borderRadius: 99, fontWeight: 600 }}>👷 {t.assigned_name}</span>}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, justifyContent: 'flex-end' }}>
                    {canAct(t) && t.status === 'Assigned' && <button onClick={() => handleTravelStart(t)} style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>🚗 Travel Start</button>}
                    {canAct(t) && t.status === 'Traveling' && <button onClick={() => handleReached(t)} style={{ background: '#0d9488', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>📍 Reached</button>}
                    {canAct(t) && t.status === 'Reached' && <button onClick={() => handleDone(t)} style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>✅ Done</button>}
                    {canManage(t) && <button onClick={() => openEdit(t)} style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>✏️</button>}
                    {canManage(t) && t.status !== 'Done' && t.status !== 'Cancelled' && <button onClick={() => handleCancel(t)} style={{ border: '1px solid #fde68a', color: '#b45309', background: '#fff', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>🚫</button>}
                    {canManage(t) && <button onClick={() => handleDelete(t)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>🗑️</button>}
                </div>
                {(t.travel_start_at || t.reached_at || t.done_at) && (
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6, fontSize: 11, color: '#64748b', borderTop: '1px dashed #e5e7eb', paddingTop: 6 }}>
                        {t.travel_start_at && <span>🚗 {fmtT(t.travel_start_at)}</span>}
                        {t.reached_at && <span>📍 {fmtT(t.reached_at)}</span>}
                        {t.done_at && <span style={{ color: '#059669', fontWeight: 700 }}>✅ {fmtT(t.done_at)}</span>}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>🚚 Other Work ({tasks.length})</h1>
                <div style={{ display: 'flex', gap: 8 }}>
                    {canAdminList && <button onClick={() => setReportOpen(true)} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>📊 Report</button>}
                    <button onClick={openCreate} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>+ New Task</button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                <div style={{ background: '#fff7ed', borderRadius: 10, padding: '10px 16px' }}><div style={{ fontSize: 11, color: '#c2410c', fontWeight: 700 }}>📋 Active</div><div style={{ fontSize: 20, fontWeight: 800, color: '#c2410c' }}>{active.length}</div></div>
                <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '10px 16px' }}><div style={{ fontSize: 11, color: '#15803d', fontWeight: 700 }}>✅ Done Today</div><div style={{ fontSize: 20, fontWeight: 800, color: '#15803d' }}>{doneToday}</div></div>
                <div style={{ background: '#eff6ff', borderRadius: 10, padding: '10px 16px' }}><div style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 700 }}>🗂️ Total Done</div><div style={{ fontSize: 20, fontWeight: 800, color: '#1d4ed8' }}>{done.length}</div></div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                <input type="text" placeholder="Search name / mobile..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...fieldStyle, flex: 1, minWidth: 160 }} />
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ ...fieldStyle, width: 'auto' }}>
                    <option value="">All Types</option>
                    {FT_TYPES.map(t => <option key={t} value={t}>{FT_TYPE_META[t].emoji} {t}</option>)}
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...fieldStyle, width: 'auto' }}>
                    <option value="">All Status</option>
                    {['Assigned', 'Traveling', 'Reached', 'Done', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {canAdminList && (
                    <select value={engFilter} onChange={e => setEngFilter(e.target.value)} style={{ ...fieldStyle, width: 'auto' }}>
                        <option value="">All Engineers</option>
                        {engineers.map(e => <option key={e.id} value={e.user_id}>{e.name}</option>)}
                    </select>
                )}
            </div>

            {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</p>
                : tasks.length === 0 ? <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, textAlign: 'center', padding: 40, color: '#9ca3af' }}>🚚 No tasks yet. Click &quot;New Task&quot; to add one!</div>
                    : (
                        <>
                            {filtered(active).length > 0 && <><h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', borderLeft: '4px solid #d97706', paddingLeft: 10 }}>📋 Active ({filtered(active).length})</h3>{filtered(active).map(renderCard)}</>}
                            {filtered(done).length > 0 && <><h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', borderLeft: '4px solid #059669', paddingLeft: 10, marginTop: 18 }}>✅ Done ({filtered(done).length})</h3>{filtered(done).map(renderCard)}</>}
                            {filtered(cancelled).length > 0 && <><h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', borderLeft: '4px solid #6b7280', paddingLeft: 10, marginTop: 18 }}>🚫 Cancelled ({filtered(cancelled).length})</h3>{filtered(cancelled).map(renderCard)}</>}
                        </>
                    )}

            {modalOpen && (
                <div onClick={() => setModalOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: 17 }}>{editId ? '✏️ Edit Task' : '🚚 New Other Work'}</h2>
                            <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
                        </div>
                        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div><label style={{ fontSize: 12, fontWeight: 700 }}>Task Type *</label>
                                <select value={form.task_type} onChange={e => setForm(f => ({ ...f, task_type: e.target.value }))} style={fieldStyle}>
                                    {FT_TYPES.map(t => <option key={t} value={t}>{FT_TYPE_META[t].emoji} {t}</option>)}
                                </select>
                            </div>
                            {isOfficeForm ? (
                                <>
                                    <div>
                                        <label style={{ fontSize: 12, fontWeight: 700 }}>Work Type *</label>
                                        <input type="text" list="ft-office-work-types" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} style={fieldStyle} placeholder="e.g. Remote Support" />
                                        <datalist id="ft-office-work-types">
                                            {FT_OFFICE_WORK_TYPES.map(t => <option key={t} value={t} />)}
                                        </datalist>
                                    </div>
                                    <div><label style={{ fontSize: 12, fontWeight: 700 }}>Details</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...fieldStyle, resize: 'vertical' }} /></div>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <div style={{ flex: 1 }}><label style={{ fontSize: 12, fontWeight: 700 }}>From</label><input type="time" value={form.from_time} onChange={e => setForm(f => ({ ...f, from_time: e.target.value }))} style={fieldStyle} /></div>
                                        <div style={{ flex: 1 }}><label style={{ fontSize: 12, fontWeight: 700 }}>To</label><input type="time" value={form.to_time} onChange={e => setForm(f => ({ ...f, to_time: e.target.value }))} style={fieldStyle} /></div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div><label style={{ fontSize: 12, fontWeight: 700 }}>Customer / Party Name *</label><input type="text" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} style={fieldStyle} /></div>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <div style={{ flex: 1 }}><label style={{ fontSize: 12, fontWeight: 700 }}>Mobile</label><input type="tel" value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} style={fieldStyle} /></div>
                                        <div style={{ flex: 1, opacity: (form.task_type === 'Payment Collection' || form.task_type === 'Cheque Collection') ? 1 : 0.55 }}><label style={{ fontSize: 12, fontWeight: 700 }}>Amount (₹)</label><input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={fieldStyle} /></div>
                                    </div>
                                    <div><label style={{ fontSize: 12, fontWeight: 700 }}>Address</label><input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} style={fieldStyle} /></div>
                                    <div><label style={{ fontSize: 12, fontWeight: 700 }}>Location (Maps link / coords)</label><input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} style={fieldStyle} /></div>
                                    <div><label style={{ fontSize: 12, fontWeight: 700 }}>Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...fieldStyle, resize: 'vertical' }} /></div>
                                </>
                            )}
                            <div><label style={{ fontSize: 12, fontWeight: 700 }}>Assign to Engineer</label>
                                <select value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} style={fieldStyle}>
                                    <option value="">— Select Engineer —</option>
                                    {engineers.map(e => <option key={e.id} value={e.user_id}>{e.name}</option>)}
                                </select>
                            </div>
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
                            <h2 style={{ margin: 0, fontSize: 17 }}>📊 Other Work Report</h2>
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
                                : reportRows.length === 0 ? <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}>No completed tasks in this period.</div>
                                    : (
                                        <>
                                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                                                <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '8px 14px' }}><div style={{ fontSize: 11, color: '#15803d', fontWeight: 700 }}>✅ Total Done</div><div style={{ fontSize: 18, fontWeight: 800, color: '#15803d' }}>{reportRows.reduce((s, r) => s + r.total, 0)}</div></div>
                                                <div style={{ background: '#eff6ff', borderRadius: 10, padding: '8px 14px' }}><div style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 700 }}>💰 Total Collected</div><div style={{ fontSize: 18, fontWeight: 800, color: '#1d4ed8' }}>₹{reportRows.reduce((s, r) => s + r.amount, 0).toLocaleString('en-IN')}</div></div>
                                            </div>
                                            <div style={{ overflowX: 'auto' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                                    <thead><tr style={{ background: '#f8fafc', textAlign: 'center' }}>
                                                        <th style={{ padding: '7px 9px', textAlign: 'left' }}>Engineer</th>
                                                        {FT_TYPES.map(t => <th key={t} style={{ padding: '7px 9px' }}>{FT_TYPE_META[t].emoji}</th>)}
                                                        <th style={{ padding: '7px 9px' }}>Total</th><th style={{ padding: '7px 9px' }}>Amount ₹</th>
                                                    </tr></thead>
                                                    <tbody>
                                                        {reportRows.map(r => (
                                                            <tr key={r.name} style={{ borderBottom: '1px solid #eef2f7' }}>
                                                                <td style={{ padding: '6px 9px', fontWeight: 600 }}>{r.name}</td>
                                                                {FT_TYPES.map(t => <td key={t} style={{ padding: '6px 9px', textAlign: 'center' }}>{r.types[t] || ''}</td>)}
                                                                <td style={{ padding: '6px 9px', textAlign: 'center', fontWeight: 800, color: '#059669' }}>{r.total}</td>
                                                                <td style={{ padding: '6px 9px', textAlign: 'right' }}>{r.amount ? r.amount.toLocaleString('en-IN') : ''}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    )}
                        </div>
                    </div>
                </div>
            )}

            {kmTaskId != null && kmStep && (
                <KmCaptureModal
                    type={kmStep}
                    engId={myId}
                    engName={myName}
                    ticketId={`FT${kmTaskId}`}
                    onClose={() => { setKmTaskId(null); setKmStep(null); }}
                    onDone={handleKmDone}
                />
            )}
        </div>
    );
}