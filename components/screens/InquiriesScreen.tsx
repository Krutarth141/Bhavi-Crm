'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useInquiries } from '@/hooks/useInquiries';
import Modal from '@/components/Modal';
import { InquiryFormData, emptyInquiryForm, INQUIRY_TYPES, INQUIRY_STATUSES, AutoInquiry } from '@/types/inquiries';

const fieldStyle = { width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' as const, fontFamily: 'inherit' };
const statusColor: Record<string, { bg: string; color: string }> = {
    open: { bg: '#dbeafe', color: '#1e40af' },
    followup: { bg: '#fef3c7', color: '#92400e' },
    converted: { bg: '#d1fae5', color: '#065f46' },
    closed: { bg: '#f3f4f6', color: '#374151' },
    cancelled: { bg: '#fee2e2', color: '#991b1b' },
};

export default function InquiriesScreen() {
    const { data: session } = useSession();
    const userId = (session?.user as any)?.id ?? '';
    const userName = (session?.user as any)?.name ?? 'Admin';

    const { inquiries, loading, error, open, followup, converted, add, updateStatus } = useInquiries();
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [form, setForm] = useState<InquiryFormData>(emptyInquiryForm);

    const filtered: AutoInquiry[] = inquiries.filter(i => {
        const q = search.toLowerCase();
        const matchSearch = !search.trim() || i.customer_name?.toLowerCase().includes(q) || i.mobile?.includes(q) || i.inquiry_type?.toLowerCase().includes(q);
        const matchStatus = !statusFilter || i.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const handleSave = async () => {
        if (!form.customer_name.trim()) { alert('Customer name required'); return; }
        setSaving(true);
        const r = await add(form, userId, userName);
        if (r.success) { setModalOpen(false); setForm(emptyInquiryForm); }
        else alert('Error: ' + r.error);
        setSaving(false);
    };

    const handleStatusChange = async (id: number, status: string) => {
        const r = await updateStatus(id, status);
        if (!r.success) alert('Error: ' + r.error);
    };

    const modalFooter = (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setModalOpen(false)} style={{ padding: '8px 16px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : '💾 Add Inquiry'}
            </button>
        </div>
    );

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>🔎 Inquiries ({inquiries.length})</h1>
                <button onClick={() => setModalOpen(true)} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>➕ New Inquiry</button>
            </div>

            {error && <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#dc2626', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>Error: {error}</div>}

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
                {[
                    { label: 'Total', value: inquiries.length, color: '#185FA5' },
                    { label: '🔵 Open', value: open, color: '#1e40af' },
                    { label: '🟡 Follow-up', value: followup, color: '#d97706' },
                    { label: '✅ Converted', value: converted, color: '#059669' },
                ].map(s => (
                    <div key={s.label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input type="text" placeholder="Search customer, mobile, type..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14, fontFamily: 'inherit' }} />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14 }}>
                    <option value="">All Status</option>
                    {INQUIRY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            {/* Table */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</p>
                    : filtered.length === 0 ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>No inquiries found</p>
                        : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                    <thead>
                                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                            {['Customer', 'Type', 'Description', 'Follow-up', 'Assigned', 'Status', 'Action'].map(h => (
                                                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#374151' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map(i => {
                                            const sc = statusColor[i.status || 'open'] || { bg: '#f3f4f6', color: '#374151' };
                                            const isOverdue = i.followup_date && i.followup_date < new Date().toLocaleDateString('en-CA') && i.status === 'open';
                                            return (
                                                <tr key={i.id} style={{ borderBottom: '1px solid #f3f4f6', background: isOverdue ? '#fffbeb' : 'white' }}>
                                                    <td style={{ padding: '10px 12px' }}>
                                                        <div style={{ fontWeight: 600 }}>{i.customer_name}</div>
                                                        {i.mobile && <div style={{ fontSize: 11, color: '#6b7280' }}>{i.mobile}</div>}
                                                    </td>
                                                    <td style={{ padding: '10px 12px', fontSize: 12 }}>{i.inquiry_type || '—'}</td>
                                                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280', maxWidth: 200 }}>{i.description || '—'}</td>
                                                    <td style={{ padding: '10px 12px', fontSize: 12, color: isOverdue ? '#dc2626' : 'inherit', fontWeight: isOverdue ? 700 : 'normal' }}>
                                                        {i.followup_date || '—'}
                                                        {isOverdue && <div style={{ fontSize: 10, color: '#dc2626' }}>⚠️ Overdue</div>}
                                                    </td>
                                                    <td style={{ padding: '10px 12px', fontSize: 12 }}>{i.assigned_name || '—'}</td>
                                                    <td style={{ padding: '10px 12px' }}>
                                                        <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color, textTransform: 'capitalize' }}>{i.status}</span>
                                                    </td>
                                                    <td style={{ padding: '10px 12px' }}>
                                                        <select value={i.status || 'open'} onChange={e => handleStatusChange(i.id, e.target.value)} style={{ padding: '3px 8px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                                                            {INQUIRY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                                        </select>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
            </div>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="🔎 New Inquiry" footer={modalFooter}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div><label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 4 }}>Customer Name *</label><input type="text" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} style={fieldStyle} /></div>
                        <div><label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 4 }}>Mobile</label><input type="tel" value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} style={fieldStyle} /></div>
                        <div><label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 4 }}>Inquiry Type</label>
                            <select value={form.inquiry_type} onChange={e => setForm(f => ({ ...f, inquiry_type: e.target.value }))} style={fieldStyle}>
                                <option value="">Select Type</option>
                                {INQUIRY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div><label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 4 }}>Follow-up Date</label><input type="date" value={form.followup_date} onChange={e => setForm(f => ({ ...f, followup_date: e.target.value }))} style={fieldStyle} /></div>
                    </div>
                    <div><label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 4 }}>Address</label><input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} style={fieldStyle} /></div>
                    <div><label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 4 }}>Description</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ ...fieldStyle, resize: 'vertical' }} /></div>
                    <div><label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 4 }}>Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...fieldStyle, resize: 'vertical' }} /></div>
                </div>
            </Modal>
        </div>
    );
}