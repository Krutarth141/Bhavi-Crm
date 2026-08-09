'use client';

import { useState, useEffect, useCallback } from 'react';
import { LeaveRequest, LeaveStatus } from '@/types/leave';
import { fetchMyLeaves, fetchPendingLeaves, submitLeave, reviewLeave } from '@/services/leaveService';

interface Props {
    myId: string;
    myName: string;
    myRole: string;
    canApprove: boolean;
    isAdminPure: boolean;
    reviewerName: string;
}

const fieldStyle = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const };
const labelStyle = { fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 };

const STATUS_META: Record<LeaveStatus, { bg: string; color: string; label: string }> = {
    pending: { bg: '#fef3c7', color: '#92400e', label: '⏳ Pending' },
    approved: { bg: '#d1fae5', color: '#065f46', label: '✅ Approved' },
    rejected: { bg: '#fee2e2', color: '#991b1b', label: '❌ Rejected' },
};

export default function LeaveSection({ myId, myName, myRole, canApprove, isAdminPure, reviewerName }: Props) {
    const [pending, setPending] = useState<LeaveRequest[]>([]);
    const [mine, setMine] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [from, setFrom] = useState(new Date().toLocaleDateString('en-CA'));
    const [to, setTo] = useState(new Date().toLocaleDateString('en-CA'));
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        if (!myId) return;
        setLoading(true);
        if (canApprove) {
            const [p, m] = await Promise.all([fetchPendingLeaves(), fetchMyLeaves(myId)]);
            setPending(p); setMine(m);
        } else {
            setMine(await fetchMyLeaves(myId));
        }
        setLoading(false);
    }, [myId, canApprove]);

    useEffect(() => { load(); }, [load]);

    const openModal = () => { setFrom(new Date().toLocaleDateString('en-CA')); setTo(new Date().toLocaleDateString('en-CA')); setReason(''); setModalOpen(true); };

    const handleSubmit = async () => {
        setSaving(true);
        const r = await submitLeave(myId, myName, myRole, from, to, reason);
        setSaving(false);
        if (!r.success) { alert(r.error); return; }
        setModalOpen(false);
        alert('✅ Leave request submitted! Waiting for Manager/Admin approval.');
        await load();
    };

    const handleReview = async (l: LeaveRequest, decision: 'approved' | 'rejected') => {
        let note = '';
        if (decision === 'rejected') { note = prompt('Reason for rejection (optional):') || ''; }
        const r = await reviewLeave(l.id, decision, reviewerName, note);
        if (!r.success) { alert('Error: ' + r.error); return; }
        await load();
    };

    const row = (l: LeaveRequest, withActions: boolean) => {
        const sm = STATUS_META[l.status];
        return (
            <div key={l.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{withActions ? `${l.eng_name || l.eng_id} — ` : ''}{l.from_date} → {l.to_date}</div>
                    <span style={{ background: sm.bg, color: sm.color, padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>{sm.label}</span>
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>📝 {l.reason || '—'}</div>
                {l.review_note && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Note: {l.review_note}{l.reviewed_by ? ` — ${l.reviewed_by}` : ''}</div>}
                {withActions && l.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button onClick={() => handleReview(l, 'approved')} style={{ padding: '5px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>✅ Approve</button>
                        <button onClick={() => handleReview(l, 'rejected')} style={{ padding: '5px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>❌ Reject</button>
                    </div>
                )}
            </div>
        );
    };

    if (!myId) return null;

    return (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h2 style={{ margin: 0, fontSize: 17 }}>🌴 Leave</h2>
                {!isAdminPure && (
                    <button onClick={openModal} style={{ padding: '6px 14px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>➕ Apply for Leave</button>
                )}
            </div>

            {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 12 }}>Loading...</p> : (
                <>
                    {canApprove && (
                        <>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', margin: '6px 0 8px' }}>⏳ Pending Approvals ({pending.length})</div>
                            {pending.length ? pending.map(l => row(l, true)) : <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 8 }}>No pending leave requests.</div>}
                        </>
                    )}
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', margin: '10px 0 8px' }}>My Leave Requests</div>
                    {mine.length ? mine.map(l => row(l, false)) : <div style={{ fontSize: 13, color: '#9ca3af' }}>No leave requests yet.</div>}
                </>
            )}

            {modalOpen && (
                <div onClick={() => setModalOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400 }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: 17 }}>🌴 Apply for Leave</h2>
                            <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
                        </div>
                        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div><label style={labelStyle}>From Date *</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} style={fieldStyle} /></div>
                            <div><label style={labelStyle}>To Date *</label><input type="date" value={to} onChange={e => setTo(e.target.value)} style={fieldStyle} /></div>
                            <div><label style={labelStyle}>Reason *</label><textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} style={{ ...fieldStyle, resize: 'vertical' }} placeholder="Reason for leave..." /></div>
                            <button onClick={handleSubmit} disabled={saving} style={{ width: '100%', padding: '10px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
                                {saving ? 'Submitting...' : '📤 Submit Request'}
                            </button>
                            <div style={{ fontSize: 11, color: '#64748b', textAlign: 'center' }}>Approved after Manager/Admin review. Login is blocked on an approved leave day.</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}