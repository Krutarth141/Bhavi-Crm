'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePartRequests } from '@/hooks/usePartRequests';
import { PartRequest } from '@/types/partRequest';

export default function PartRequestScreen() {
    const { data: session } = useSession();
    // Matches HTML's renderEPPending()/canApprove: Work Controllers may only
    // approve Engineer Return Requests, and never see the Reject button —
    // Admin/CSP manager get full access to both RECEIVE and RETURN types.
    const isWC = (session?.user as any)?.roleType === 'work_controller';

    // Mirrors HTML's renderEngParts (index.html:10152-10161): this view is
    // always the PENDING queue only — WC's is additionally restricted to
    // RETURN requests. There is no Approved/Rejected/All browsing here.
    const { requests, loading, error, approve, reject, refetch } = usePartRequests(isWC ? 'RETURN' : undefined);
    const [processing, setProcessing] = useState<string | null>(null);

    const canApproveReq = (req: PartRequest) => !isWC || req.type === 'RETURN';

    const handleApprove = async (req: PartRequest) => {
        if (!canApproveReq(req)) return;
        const partNames = (req.parts || []).map(p => `${p.qty}×${p.part_name || p.part_id}`).join(', ');
        if (!confirm(`Approve request for ${req.engineer_name}?\nParts: ${partNames || 'see request'}`)) return;
        setProcessing(req.id);
        const r = await approve(req);
        if (!r.success) alert('Error: ' + r.error);
        setProcessing(null);
    };

    const handleReject = async (req: PartRequest) => {
        if (isWC) return;
        // Matches HTML's rejectEngReq() exactly — a plain confirm, no reason
        // prompt (index.html:11563-11569); nothing overwrites the engineer's
        // original notes.
        if (!confirm('Reject this request?')) return;
        setProcessing(req.id);
        const r = await reject(req.id);
        if (!r.success) alert('Error: ' + r.error);
        setProcessing(null);
    };

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>🧰 Part Requests</h1>
                <button onClick={refetch} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontSize: 13, background: 'white' }}>🔄 Refresh</button>
            </div>

            {error && <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#dc2626', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>Error: {error}</div>}

            {isWC && (
                <div style={{ padding: '10px 16px', background: '#fefce8', border: '1px solid #fbbf24', color: '#92400e', borderRadius: 6, marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
                    ℹ️ You can only approve Engineer Return Requests. Stock details are visible to Admin only.
                </div>
            )}

            {/* Table — Date/Type/Engineer/Parts/Notes/Action, matching HTML's
                renderEPPending table exactly (index.html:11279-11290). This
                view is always the PENDING queue only — no status browsing. */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</p>
                    : requests.length === 0 ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>✅ No pending requests.</p>
                        : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                    <thead>
                                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                            {['Date', 'Type', 'Engineer', 'Parts', 'Notes', 'Action'].map(h => (
                                                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {requests.map(r => {
                                            const isProcessing = processing === r.id;
                                            const partsList = (r.parts || []).map(p => `${p.qty || 1}× ${p.part_name || p.part_id || '?'}`).join(', ');
                                            return (
                                                <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6', background: '#fffbeb' }}>
                                                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>
                                                        {r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '—'}
                                                    </td>
                                                    <td style={{ padding: '10px 12px' }}>
                                                        {r.type === 'RECEIVE'
                                                            ? <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 8, fontSize: 10.5, fontWeight: 700 }}>📥 Receive</span>
                                                            : <span style={{ background: '#fdf4ff', color: '#7c3aed', padding: '2px 8px', borderRadius: 8, fontSize: 10.5, fontWeight: 700 }}>↩️ Return</span>}
                                                    </td>
                                                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{r.engineer_name}</td>
                                                    <td style={{ padding: '10px 12px', fontSize: 12, maxWidth: 220 }}>{partsList || '—'}</td>
                                                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>{r.notes || '—'}</td>
                                                    <td style={{ padding: '10px 12px' }}>
                                                        <div style={{ display: 'flex', gap: 6 }}>
                                                            {canApproveReq(r) && (
                                                                <button onClick={() => handleApprove(r)} disabled={isProcessing} style={{ padding: '4px 10px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600, opacity: isProcessing ? 0.5 : 1 }}>
                                                                    ✅ Approve
                                                                </button>
                                                            )}
                                                            {!isWC && (
                                                                <button onClick={() => handleReject(r)} disabled={isProcessing} style={{ padding: '4px 10px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600, opacity: isProcessing ? 0.5 : 1 }}>
                                                                    ❌ Reject
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
            </div>
        </div>
    );
}