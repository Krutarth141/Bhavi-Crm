'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useEngineerUpdate } from '@/hooks/useEngineerUpdate';
import Modal from '@/components/Modal';
import { EngineerTicket, ENGINEER_ALLOWED_TRANSITIONS, CLOSED_STATUSES, UpdateForm } from '@/types/engineerUpdate';

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

export default function EngineerUpdateScreen() {
    const { data: session } = useSession();
    const userName = (session?.user as any)?.name ?? '';

    const [statusFilter, setStatusFilter] = useState<'active' | 'closed' | 'all'>('active');
    const { tickets, loading, error, active, closed, update, refetch } = useEngineerUpdate(userName, statusFilter);

    const [selected, setSelected] = useState<EngineerTicket | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<UpdateForm>({ newStatus: '', note: '', labour: '' });

    const openUpdate = (ticket: EngineerTicket) => {
        setSelected(ticket);
        const allowed = ENGINEER_ALLOWED_TRANSITIONS[ticket.status || ''] || [];
        setForm({ newStatus: allowed[0] || '', note: '', labour: String(ticket.labor || ticket.service_charges || '') });
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!selected || !form.newStatus) { alert('Select new status'); return; }
        setSaving(true);
        const r = await update(selected, form.newStatus, form.note, form.labour, userName);
        if (r.success) { setModalOpen(false); }
        else alert('Error: ' + r.error);
        setSaving(false);
    };

    const allowed = ENGINEER_ALLOWED_TRANSITIONS[selected?.status || ''] || [];

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
                                const canUpdate = !!(ENGINEER_ALLOWED_TRANSITIONS[t.status || '']?.length);
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
                                                <button onClick={() => openUpdate(t)} style={{ marginLeft: 12, padding: '6px 14px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
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
                                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Update Note</label>
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
        </div>
    );
}