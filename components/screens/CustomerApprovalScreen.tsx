'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useCustomerApproval } from '@/hooks/useCustomerApproval';
import Modal from '@/components/Modal';
import { ApprovalTicket, EstimateForm, emptyEstimateForm, calcEstimate } from '@/types/customerApproval';

const fieldStyle = { width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' as const, fontFamily: 'inherit' };

export default function CustomerApprovalScreen() {
    const { data: session } = useSession();
    const userName = (session?.user as any)?.name ?? 'Admin';

    const { tickets, loading, error, approve, reject, refetch } = useCustomerApproval();

    const [modalOpen, setModalOpen] = useState(false);
    const [selected, setSelected] = useState<ApprovalTicket | null>(null);
    const [processing, setProcessing] = useState(false);
    const [form, setForm] = useState<EstimateForm>(emptyEstimateForm);

    const openApproval = (ticket: ApprovalTicket) => {
        setSelected(ticket);
        setForm({ ...emptyEstimateForm, labourAmt: String(ticket.service_charges || ticket.labor || 0) });
        setModalOpen(true);
    };

    const { partsTotal, partsAfterDisc, labourAfterDisc, final, saved } =
        calcEstimate(form, selected?.spares || []);

    const handleApprove = async () => {
        if (!selected) return;
        if (!form.remark.trim()) { alert('Remark is required'); return; }
        setProcessing(true);
        const r = await approve(selected, final, Number(form.labourAmt), form.remark, userName);
        if (r.success) {
            setModalOpen(false);
            alert(`✅ Approved! Status → ${r.newStatus}`);
        } else {
            alert('Error: ' + r.error);
        }
        setProcessing(false);
    };

    const handleReject = async () => {
        if (!selected) return;
        if (!form.remark.trim()) { alert('Remark is required'); return; }
        setProcessing(true);
        const r = await reject(selected, form.remark, userName);
        if (r.success) { setModalOpen(false); }
        else alert('Error: ' + r.error);
        setProcessing(false);
    };

    const modalFooter = (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setModalOpen(false)} style={{ padding: '8px 16px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
            <button onClick={handleReject} disabled={processing} style={{ padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: processing ? 0.6 : 1 }}>
                ❌ Customer Reject
            </button>
            <button onClick={handleApprove} disabled={processing} style={{ padding: '8px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: processing ? 0.6 : 1 }}>
                ✅ Customer Approved
            </button>
        </div>
    );

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>✅ Customer Approval ({tickets.length})</h1>
                <button onClick={refetch} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontSize: 13, background: 'white' }}>🔄 Refresh</button>
            </div>

            {error && <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#dc2626', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>Error: {error}</div>}

            {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</p>
                : tickets.length === 0 ? (
                    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: 48, textAlign: 'center' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                        <div style={{ fontWeight: 600, fontSize: 16 }}>No pending approvals</div>
                        <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>All tickets are processed</div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: 12 }}>
                        {tickets.map(t => {
                            const partsAmt = (t.spares || []).filter((s: any) => s.requested).reduce((s: number, sp: any) => s + (sp.qty || 0) * (sp.price || 0), 0);
                            const totalEst = (t.service_charges || t.labor || 0) + partsAmt;
                            return (
                                <div key={t.id} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 15 }}>{t.cname || '—'}</div>
                                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{t.mobile} | {t.brand_name} {t.model} | {t.serial}</div>
                                            <div style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>{t.problem} | <span style={{ color: '#185FA5' }}>{t.call_type}</span> | {t.service_type}</div>
                                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Engineer: {t.assigned_name || '—'}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 700, fontSize: 16, color: '#059669' }}>₹{totalEst.toLocaleString()}</div>
                                            <div style={{ fontSize: 11, color: '#6b7280' }}>Estimated</div>
                                            <button onClick={() => openApproval(t)} style={{ marginTop: 8, padding: '6px 14px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                                                ✅ Approve / Reject
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`Estimate — ${selected?.cname || ''}`} footer={modalFooter}>
                {selected && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, fontSize: 13 }}>
                            <div><strong>{selected.brand_name} {selected.model}</strong> | {selected.serial}</div>
                            <div style={{ color: '#6b7280', marginTop: 2 }}>{selected.problem} | {selected.call_type}</div>
                        </div>

                        {(selected.spares || []).filter((s: any) => s.requested).length > 0 && (
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Parts Required:</div>
                                {(selected.spares || []).filter((s: any) => s.requested).map((s: any, i: number) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid #f3f4f6' }}>
                                        <span>{s.name} × {s.qty}</span>
                                        <span style={{ fontWeight: 600 }}>₹{((s.qty || 0) * (s.price || 0)).toFixed(0)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Labour / Service ₹</label>
                                <input type="number" value={form.labourAmt} onChange={e => setForm(f => ({ ...f, labourAmt: e.target.value }))} style={fieldStyle} />
                            </div>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Parts Discount %</label>
                                <input type="number" value={form.partsDisc} onChange={e => setForm(f => ({ ...f, partsDisc: e.target.value }))} min="0" max="100" style={fieldStyle} />
                            </div>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Labour Discount %</label>
                                <input type="number" value={form.labourDisc} onChange={e => setForm(f => ({ ...f, labourDisc: e.target.value }))} min="0" max="100" style={fieldStyle} />
                            </div>
                        </div>

                        <div style={{ background: '#d1fae5', borderRadius: 8, padding: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                <span>Parts (after {form.partsDisc}% disc)</span>
                                <span>₹{partsAfterDisc.toFixed(0)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 4 }}>
                                <span>Labour (after {form.labourDisc}% disc)</span>
                                <span>₹{labourAfterDisc.toFixed(0)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15, marginTop: 8, borderTop: '1px solid #a7f3d0', paddingTop: 8 }}>
                                <span>Final Estimate</span>
                                <span style={{ color: '#065f46' }}>₹{final.toFixed(0)}</span>
                            </div>
                            {saved > 0 && <div style={{ fontSize: 11, color: '#065f46', marginTop: 4 }}>Customer saves: ₹{saved.toFixed(0)}</div>}
                        </div>

                        <div>
                            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Remark * <span style={{ color: '#dc2626' }}>(required)</span></label>
                            <textarea value={form.remark} onChange={e => setForm(f => ({ ...f, remark: e.target.value }))} rows={2} placeholder="Note about approval/rejection..." style={{ ...fieldStyle, resize: 'vertical' }} />
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}