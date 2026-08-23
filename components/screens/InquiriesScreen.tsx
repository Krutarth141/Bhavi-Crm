'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useInquiries } from '@/hooks/useInquiries';
import { useEngineers } from '@/hooks/useEngineers';
import Modal from '@/components/Modal';
import { InquiryFormData, emptyInquiryForm, INQUIRY_TYPES, INQUIRY_STATUSES, INQUIRY_STATUS_COLORS, AutoInquiry } from '@/types/inquiries';
import AIWriteButton from '@/components/shared/AIWriteButton';
import { notifyAll, notifyEngineer } from '@/services/telegramNotify';

const fieldStyle = { width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' as const, fontFamily: 'inherit' };
const labelStyle = { fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 4 };
const todayStr = () => new Date().toLocaleDateString('en-CA');

export default function InquiriesScreen() {
    const { data: session } = useSession();
    const myUserId = (session?.user as any)?.email ?? ''; // holds user_id, e.g. 'ENG002'
    const myName = (session?.user as any)?.name ?? 'Admin';
    const isAdmin = (session?.user as any)?.roleType === 'admin';

    const { inquiries, loading, error, add, edit, remove, progress } = useInquiries(myUserId, isAdmin);
    const { engineers } = useEngineers();

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const [addOpen, setAddOpen] = useState(false);
    const [addForm, setAddForm] = useState<InquiryFormData>(emptyInquiryForm);
    const [addOtherType, setAddOtherType] = useState('');
    const [addSaving, setAddSaving] = useState(false);
    const [gpsLoading, setGpsLoading] = useState(false);

    const [editId, setEditId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<InquiryFormData>(emptyInquiryForm);
    const [editOtherType, setEditOtherType] = useState('');
    const [editSaving, setEditSaving] = useState(false);

    const [updateId, setUpdateId] = useState<number | null>(null);
    const [updateStatus, setUpdateStatus] = useState('Open');
    const [updateFollowup, setUpdateFollowup] = useState('');
    const [updateRemark, setUpdateRemark] = useState('');
    const [updateSaving, setUpdateSaving] = useState(false);

    const [detailId, setDetailId] = useState<number | null>(null);

    const today = todayStr();
    const followupToday = inquiries.filter(i => i.followup_date === today && i.status !== 'Converted' && i.status !== 'Lost');

    const filtered = inquiries.filter(i => {
        const q = search.toLowerCase();
        const matchSearch = !search.trim() || (i.customer_name || '').toLowerCase().includes(q) || (i.mobile || '').includes(q);
        const matchStatus = !statusFilter || i.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const engineerName = (uid: string) => engineers.find(e => e.user_id === uid)?.name || '';

    // ---- Add ----
    const openAdd = () => { setAddForm(emptyInquiryForm); setAddOtherType(''); setAddOpen(true); };

    const handleGetGPS = () => {
        if (!navigator.geolocation) { alert('GPS not available'); return; }
        setGpsLoading(true);
        navigator.geolocation.getCurrentPosition(
            (p) => { setAddForm(f => ({ ...f, location: `${p.coords.latitude.toFixed(6)},${p.coords.longitude.toFixed(6)}` })); setGpsLoading(false); },
            () => { alert('Could not get location'); setGpsLoading(false); }
        );
    };

    const handleAddSave = async () => {
        if (!addForm.customer_name.trim() || !addForm.mobile.trim()) { alert('Name and Mobile are required!'); return; }
        setAddSaving(true);
        const finalType = addForm.inquiry_type === 'Other' && addOtherType.trim() ? addOtherType.trim() : addForm.inquiry_type;
        const formToSave = { ...addForm, inquiry_type: finalType };
        const assignedName = addForm.assigned_to ? engineerName(addForm.assigned_to) : '';
        const r = await add(formToSave, myUserId, myName, assignedName);
        setAddSaving(false);
        if (!r.success) { alert('Error: ' + r.error); return; }
        setAddOpen(false);
        notifyAll(`🔔 <b>New Inquiry</b>\n👤 ${formToSave.customer_name}${formToSave.mobile ? ' | 📱 ' + formToSave.mobile : ''}\n🔖 ${finalType}${assignedName ? '\n👷 Assigned: ' + assignedName : ''}\n📝 ${formToSave.description || 'No description'}`);
        if (formToSave.assigned_to) {
            notifyEngineer(formToSave.assigned_to, `📌 <b>New Inquiry Assigned to You</b>\n👤 ${formToSave.customer_name} | 📱 ${formToSave.mobile}\n🔖 ${finalType}\n📝 ${formToSave.description || 'No description'}${formToSave.location ? '\n📍 ' + formToSave.location : ''}`);
        }
    };

    // ---- Edit ----
    const openEdit = (inq: AutoInquiry) => {
        const known = INQUIRY_TYPES.includes(inq.inquiry_type || '');
        setEditOtherType(known ? '' : (inq.inquiry_type || ''));
        setEditId(inq.id);
        setEditForm({
            customer_name: inq.customer_name || '', mobile: inq.mobile || '', address: inq.address || '',
            location: '', inquiry_type: known ? (inq.inquiry_type as string) : 'Other', description: inq.description || '',
            followup_date: inq.followup_date || '', assigned_to: inq.assigned_to || '',
        });
    };

    const handleEditSave = async () => {
        if (editId == null) return;
        if (!editForm.customer_name.trim() || !editForm.mobile.trim()) { alert('Name and Mobile are required!'); return; }
        setEditSaving(true);
        const finalType = editForm.inquiry_type === 'Other' && editOtherType.trim() ? editOtherType.trim() : editForm.inquiry_type;
        const assignedName = editForm.assigned_to ? engineerName(editForm.assigned_to) : '';
        const r = await edit(editId, { ...editForm, inquiry_type: finalType }, assignedName);
        setEditSaving(false);
        if (!r.success) { alert('Error: ' + r.error); return; }
        setEditId(null);
    };

    // ---- Update (status / followup / remark) ----
    const openUpdate = (inq: AutoInquiry) => {
        setUpdateId(inq.id);
        setUpdateStatus(inq.status || 'Open');
        setUpdateFollowup(inq.followup_date || '');
        setUpdateRemark('');
    };

    const handleUpdateSave = async () => {
        if (updateId == null) return;
        const inq = inquiries.find(i => i.id === updateId);
        setUpdateSaving(true);
        const r = await progress(updateId, inq?.notes || '', updateStatus, updateFollowup || null, updateRemark, myName);
        setUpdateSaving(false);
        if (!r.success) { alert('Error: ' + r.error); return; }
        setUpdateId(null);
        if (updateStatus === 'Converted' || updateStatus === 'Lost') {
            const icon = updateStatus === 'Converted' ? '🏆' : '❌';
            notifyAll(`${icon} <b>Inquiry ${updateStatus}</b>\n👤 ${inq?.customer_name || ''} | 📱 ${inq?.mobile || ''}\n🔖 ${inq?.inquiry_type || ''}${inq?.assigned_name ? '\n👷 ' + inq.assigned_name : ''}${updateRemark ? '\n💬 ' + updateRemark : ''}`);
        } else if (updateStatus === 'Site Visit Scheduled' || updateStatus === 'Demo Scheduled') {
            notifyAll(`📅 <b>${updateStatus}</b>\n👤 ${inq?.customer_name || ''} | 📱 ${inq?.mobile || ''}\n🔖 ${inq?.inquiry_type || ''}${inq?.assigned_name ? '\n👷 ' + inq.assigned_name : ''}`);
            if (inq?.assigned_to) notifyEngineer(inq.assigned_to, `📅 <b>${updateStatus}</b>\n👤 ${inq?.customer_name || ''} | 📱 ${inq?.mobile || ''}\n🔖 ${inq?.inquiry_type || ''}${updateRemark ? '\n💬 ' + updateRemark : ''}`);
        }
    };

    // ---- Delete ----
    const handleDelete = async (inq: AutoInquiry) => {
        if (!isAdmin) { alert('Only admin can delete inquiries.'); return; }
        if (!confirm(`Delete inquiry for "${inq.customer_name}"? This cannot be undone.`)) return;
        const r = await remove(inq.id);
        if (!r.success) alert('Error: ' + r.error);
    };

    const detailInq = detailId != null ? inquiries.find(i => i.id === detailId) : null;
    const updateInq = updateId != null ? inquiries.find(i => i.id === updateId) : null;

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>🔍 Inquiries ({inquiries.length})</h1>
                <button onClick={openAdd} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>+ New Inquiry</button>
            </div>

            {error && <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#dc2626', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>Error: {error}</div>}

            {followupToday.length > 0 && (
                <div style={{ background: '#fff7ed', border: '2px solid #f59e0b', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>🔔</span>
                    <div>
                        <b style={{ color: '#92400e' }}>{followupToday.length} inquiry follow-up(s) due today!</b><br />
                        <span style={{ fontSize: 12, color: '#78350f' }}>{followupToday.map(i => i.customer_name).join(', ')}</span>
                    </div>
                </div>
            )}

            <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input type="text" placeholder="Search name / mobile..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14, fontFamily: 'inherit' }} />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14 }}>
                    <option value="">All Status</option>
                    {INQUIRY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</p>
                : filtered.length === 0 ? <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, textAlign: 'center', padding: 40, color: '#6b7280' }}>🔍 No inquiries found. Click "New Inquiry" to add one!</div>
                    : (() => {
                        // Split by status so each group is clearly separated
                        // (index.html:24196-24217).
                        const gConverted = filtered.filter(i => i.status === 'Converted');
                        const gLost = filtered.filter(i => i.status === 'Lost');
                        const gActive = filtered.filter(i => i.status !== 'Converted' && i.status !== 'Lost');
                        const gFollowup = gActive.filter(i => !!i.followup_date).sort((a, b) => (a.followup_date || '').localeCompare(b.followup_date || ''));
                        const gPending = gActive.filter(i => !i.followup_date);

                        const renderCard = (inq: AutoInquiry) => {
                            const isFollowup = inq.followup_date === today && inq.status !== 'Converted' && inq.status !== 'Lost';
                            const isPast = !!inq.followup_date && inq.followup_date < today && inq.status !== 'Converted' && inq.status !== 'Lost';
                            const color = INQUIRY_STATUS_COLORS[inq.status || ''] || '#6b7280';
                            const noteLines = (inq.notes || '').split('\n').filter(Boolean);
                            const lastNote = noteLines[noteLines.length - 1];
                            return (
                                <div key={inq.id} style={{ background: isFollowup ? '#fffbeb' : isPast ? '#fff1f2' : 'white', border: '1px solid #e5e7eb', borderLeft: `4px solid ${color}`, borderRadius: 8, padding: '14px 16px', marginBottom: 10 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
                                        <div>
                                            <div onClick={() => setDetailId(inq.id)} style={{ fontSize: 15, fontWeight: 700, cursor: 'pointer', color: '#185FA5' }}>
                                                {inq.customer_name}{inq.mobile ? `  📱 ${inq.mobile}` : ''}
                                            </div>
                                            {inq.inquiry_type && <div style={{ fontSize: 12, color: '#6b7280' }}>🔖 {inq.inquiry_type}</div>}
                                            {inq.description && <div style={{ fontSize: 13, marginTop: 4 }}>{inq.description}</div>}
                                            {inq.followup_date && (
                                                <div style={{ fontSize: 12, marginTop: 4, color: isFollowup ? '#92400e' : isPast ? '#dc2626' : '#059669' }}>
                                                    📅 Followup: {new Date(inq.followup_date + 'T00:00:00').toLocaleDateString('en-IN')}{isFollowup ? ' 🔔 TODAY!' : isPast ? ' ⚠️ OVERDUE' : ''}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                            <span style={{ fontSize: 11, background: `${color}22`, color, padding: '3px 10px', borderRadius: 99, fontWeight: 600 }}>{inq.status}</span>
                                            {inq.assigned_name
                                                ? <span style={{ fontSize: 11, background: '#ede9fe', color: '#6d28d9', padding: '3px 9px', borderRadius: 99, fontWeight: 600 }}>👷 {inq.assigned_name}</span>
                                                : inq.created_by_name ? <span style={{ fontSize: 11, background: '#dbeafe', color: '#1d4ed8', padding: '3px 9px', borderRadius: 99, fontWeight: 600 }}>👤 {inq.created_by_name}</span> : null}
                                            <button onClick={() => openUpdate(inq)} style={{ padding: '4px 10px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>📝 Update</button>
                                            {isAdmin && <button onClick={() => openEdit(inq)} style={{ padding: '4px 10px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>✏️ Edit</button>}
                                            {isAdmin && <button onClick={() => handleDelete(inq)} style={{ padding: '4px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>🗑️</button>}
                                        </div>
                                    </div>
                                    {lastNote && (
                                        <div style={{ marginTop: 6, fontSize: 12, color: '#6b7280', borderTop: '1px solid #f1f5f9', paddingTop: 6 }}>
                                            💬 {lastNote}{noteLines.length > 1 ? <span style={{ color: '#94a3b8' }}> (+{noteLines.length - 1} more)</span> : null}
                                        </div>
                                    )}
                                </div>
                            );
                        };

                        const renderSection = (title: string, emoji: string, color: string, arr: AutoInquiry[]) => arr.length === 0 ? null : (
                            <div key={title} style={{ marginBottom: 18 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <div style={{ borderLeft: `4px solid ${color}`, paddingLeft: 10, fontSize: 15, fontWeight: 800, color: '#1e293b' }}>{emoji} {title}</div>
                                    <span style={{ background: `${color}22`, color, padding: '2px 11px', borderRadius: 20, fontSize: 12, fontWeight: 800 }}>{arr.length}</span>
                                </div>
                                {arr.map(renderCard)}
                            </div>
                        );

                        return (
                            <div>
                                {renderSection('Follow-up', '📞', '#f59e0b', gFollowup)}
                                {renderSection('Pending / Open', '🕐', '#2563eb', gPending)}
                                {renderSection('Converted (Won)', '✅', '#059669', gConverted)}
                                {renderSection('Lost', '❌', '#6b7280', gLost)}
                            </div>
                        );
                    })()}

            {/* Add Modal */}
            <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="🔍 New Inquiry" footer={
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setAddOpen(false)} style={{ padding: '8px 16px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
                    <button onClick={handleAddSave} disabled={addSaving} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: addSaving ? 0.6 : 1 }}>{addSaving ? 'Saving...' : '💾 Save'}</button>
                </div>
            }>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div><label style={labelStyle}>Customer Name *</label><input type="text" value={addForm.customer_name} onChange={e => setAddForm(f => ({ ...f, customer_name: e.target.value }))} style={fieldStyle} /></div>
                        <div><label style={labelStyle}>Mobile No *</label><input type="tel" value={addForm.mobile} onChange={e => setAddForm(f => ({ ...f, mobile: e.target.value }))} style={fieldStyle} /></div>
                    </div>
                    <div><label style={labelStyle}>Address</label><input type="text" value={addForm.address} onChange={e => setAddForm(f => ({ ...f, address: e.target.value }))} style={fieldStyle} /></div>
                    <div>
                        <label style={labelStyle}>📍 Location <small style={{ color: '#6b7280', fontWeight: 400 }}>(optional)</small></label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input type="text" value={addForm.location} readOnly placeholder="Lat, Lng" style={{ ...fieldStyle, flex: 1 }} />
                            <button type="button" onClick={handleGetGPS} disabled={gpsLoading} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>{gpsLoading ? '...' : '📍 Get GPS'}</button>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={labelStyle}>Inquiry Type</label>
                            <select value={addForm.inquiry_type} onChange={e => setAddForm(f => ({ ...f, inquiry_type: e.target.value }))} style={fieldStyle}>
                                {INQUIRY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            {addForm.inquiry_type === 'Other' && (
                                <input type="text" placeholder="Type here..." value={addOtherType} onChange={e => setAddOtherType(e.target.value)} style={{ ...fieldStyle, marginTop: 6 }} />
                            )}
                        </div>
                        <div><label style={labelStyle}>📅 Followup Date</label><input type="date" value={addForm.followup_date} onChange={e => setAddForm(f => ({ ...f, followup_date: e.target.value }))} style={fieldStyle} /></div>
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <label style={labelStyle}>Description / Product</label>
                            <AIWriteButton type="inquiry" onInsert={(text) => setAddForm(f => ({ ...f, description: text }))} />
                        </div>
                        <textarea value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ ...fieldStyle, resize: 'vertical' }} />
                    </div>
                    {isAdmin && (
                        <div>
                            <label style={labelStyle}>👷 Assign to Engineer <small style={{ color: '#6b7280', fontWeight: 400 }}>(optional)</small></label>
                            <select value={addForm.assigned_to} onChange={e => setAddForm(f => ({ ...f, assigned_to: e.target.value }))} style={fieldStyle}>
                                <option value="">-- Unassigned --</option>
                                {engineers.map(e => <option key={e.id} value={e.user_id}>{e.name}</option>)}
                            </select>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Edit Modal */}
            <Modal isOpen={editId != null} onClose={() => setEditId(null)} title="✏️ Edit Inquiry Details" footer={
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setEditId(null)} style={{ padding: '8px 16px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
                    <button onClick={handleEditSave} disabled={editSaving} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: editSaving ? 0.6 : 1 }}>{editSaving ? 'Saving...' : '💾 Save Changes'}</button>
                </div>
            }>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>Correct customer name, mobile, address or description here. To change status, use the "📝 Update" button instead.</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div><label style={labelStyle}>Customer Name *</label><input type="text" value={editForm.customer_name} onChange={e => setEditForm(f => ({ ...f, customer_name: e.target.value }))} style={fieldStyle} /></div>
                        <div><label style={labelStyle}>Mobile No *</label><input type="tel" value={editForm.mobile} onChange={e => setEditForm(f => ({ ...f, mobile: e.target.value }))} style={fieldStyle} /></div>
                    </div>
                    <div><label style={labelStyle}>Address</label><input type="text" value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} style={fieldStyle} /></div>
                    <div>
                        <label style={labelStyle}>Inquiry Type</label>
                        <select value={editForm.inquiry_type} onChange={e => setEditForm(f => ({ ...f, inquiry_type: e.target.value }))} style={fieldStyle}>
                            {INQUIRY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        {editForm.inquiry_type === 'Other' && (
                            <input type="text" placeholder="Type here..." value={editOtherType} onChange={e => setEditOtherType(e.target.value)} style={{ ...fieldStyle, marginTop: 6 }} />
                        )}
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <label style={labelStyle}>Description / Product</label>
                            <AIWriteButton type="inquiry" onInsert={(text) => setEditForm(f => ({ ...f, description: text }))} />
                        </div>
                        <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ ...fieldStyle, resize: 'vertical' }} />
                    </div>
                    <div>
                        <label style={labelStyle}>👷 Assign to Engineer <small style={{ color: '#6b7280', fontWeight: 400 }}>(optional)</small></label>
                        <select value={editForm.assigned_to} onChange={e => setEditForm(f => ({ ...f, assigned_to: e.target.value }))} style={fieldStyle}>
                            <option value="">-- Unassigned --</option>
                            {engineers.map(e => <option key={e.id} value={e.user_id}>{e.name}</option>)}
                        </select>
                    </div>
                </div>
            </Modal>

            {/* Update Modal */}
            <Modal isOpen={updateId != null} onClose={() => setUpdateId(null)} title="📝 Update Inquiry" footer={
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setUpdateId(null)} style={{ padding: '8px 16px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
                    <button onClick={handleUpdateSave} disabled={updateSaving} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: updateSaving ? 0.6 : 1 }}>{updateSaving ? 'Saving...' : '✅ Save Update'}</button>
                </div>
            }>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>👤 {updateInq?.customer_name}{updateInq?.mobile ? `  📱 ${updateInq.mobile}` : ''}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                        <label style={labelStyle}>Status</label>
                        <select value={updateStatus} onChange={e => setUpdateStatus(e.target.value)} style={fieldStyle}>
                            {INQUIRY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div><label style={labelStyle}>📅 Next Followup Date</label><input type="date" value={updateFollowup} onChange={e => setUpdateFollowup(e.target.value)} style={fieldStyle} /></div>
                </div>
                <div><label style={labelStyle}>💬 Remark / Note</label><textarea value={updateRemark} onChange={e => setUpdateRemark(e.target.value)} rows={3} placeholder="Today's update, customer's reply, next step..." style={{ ...fieldStyle, resize: 'vertical' }} /></div>
                {updateInq?.notes && (
                    <div style={{ marginTop: 10, padding: 10, background: '#f8fafc', borderRadius: 8, fontSize: 12, color: '#6b7280' }}>
                        <b>Previous Notes:</b><br />
                        {updateInq.notes.split('\n').map((l, i) => <div key={i}>{l}</div>)}
                    </div>
                )}
            </Modal>

            {/* Detail Modal */}
            {detailInq && (
                <div onClick={() => setDetailId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 540, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', background: INQUIRY_STATUS_COLORS[detailInq.status || ''] || '#6b7280', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: 18, color: '#fff' }}>{detailInq.customer_name}</h2>
                                {detailInq.mobile && <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>📱 {detailInq.mobile}</div>}
                            </div>
                            <button onClick={() => setDetailId(null)} style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: 16 }}>✕</button>
                        </div>
                        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                                <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8 }}>
                                    <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, marginBottom: 3 }}>Status</div>
                                    <span style={{ background: `${INQUIRY_STATUS_COLORS[detailInq.status || ''] || '#6b7280'}22`, color: INQUIRY_STATUS_COLORS[detailInq.status || ''] || '#6b7280', padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>{detailInq.status}</span>
                                </div>
                                <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8 }}>
                                    <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, marginBottom: 3 }}>Type</div>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>🔖 {detailInq.inquiry_type || '—'}</div>
                                </div>
                                {detailInq.location && (
                                    <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8 }}>
                                        <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, marginBottom: 3 }}>Location</div>
                                        <a href={`https://maps.google.com/?q=${encodeURIComponent(detailInq.location)}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600, color: '#2563eb' }}>📍 Open in Maps</a>
                                    </div>
                                )}
                                {detailInq.address && (
                                    <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, gridColumn: '1/-1' }}>
                                        <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, marginBottom: 3 }}>Address</div>
                                        <div style={{ fontSize: 13 }}>📍 {detailInq.address}</div>
                                    </div>
                                )}
                                {detailInq.followup_date && (
                                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: 10, borderRadius: 8, gridColumn: '1/-1' }}>
                                        <div style={{ fontSize: 10, color: '#92400e', textTransform: 'uppercase', fontWeight: 700, marginBottom: 3 }}>Followup Date</div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>📅 {new Date(detailInq.followup_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                                    </div>
                                )}
                                {detailInq.description && (
                                    <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, gridColumn: '1/-1' }}>
                                        <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, marginBottom: 3 }}>Description</div>
                                        <div style={{ fontSize: 13 }}>{detailInq.description}</div>
                                    </div>
                                )}
                            </div>
                            <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>📋 Update History</div>
                            {(() => {
                                const lines = (detailInq.notes || '').split('\n').filter(l => l.trim());
                                if (!lines.length) return <div style={{ color: '#6b7280', fontSize: 13, padding: 8 }}>No updates yet.</div>;
                                return [...lines].reverse().map((l, i) => (
                                    <div key={i} style={{ padding: '8px 12px', borderLeft: '3px solid #185FA5', background: '#f8fafc', borderRadius: '0 8px 8px 0', marginBottom: 6, fontSize: 13 }}>{l}</div>
                                ));
                            })()}
                        </div>
                        <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 10 }}>
                            {isAdmin && <button onClick={() => { setDetailId(null); openEdit(detailInq); }} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>✏️ Edit</button>}
                            <button onClick={() => { setDetailId(null); openUpdate(detailInq); }} style={{ flex: 1, background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>📝 Update</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}