'use client';

import { useState, useEffect } from 'react';
import { fetchTicketById } from '@/services/engineerUpdateService';
import { fetchConsumableCodes } from '@/services/engPartsService';
import { isChargeableSpare } from '@/types/tickets';
import { printTicket } from '@/utils/printTicket';
import { EngineerTicket } from '@/types/engineerUpdate';

interface Props {
    ticketId: string | null;
    onClose: () => void;
}

// Full read-only ticket-detail view matching HTML's viewTicket() (index.html:6133+)
// — customer/call info, spares with pricing, timeline, and print. Shared by any
// screen whose Ticket ID should open this rather than a stripped-down summary
// (e.g. PaymentCollectionScreen, TatReportScreen, KmTrackingScreen).
export default function TicketDetailModal({ ticketId, onClose }: Props) {
    const [detail, setDetail] = useState<EngineerTicket | null>(null);
    const [loading, setLoading] = useState(false);
    const [consumableCodes, setConsumableCodes] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!ticketId) { setDetail(null); setConsumableCodes(new Set()); return; }
        let cancelled = false;
        setLoading(true);
        setDetail(null);
        (async () => {
            const t = await fetchTicketById(ticketId);
            if (cancelled) return;
            setDetail(t);
            setLoading(false);
            const codes = (t?.spares || []).map(s => s.code || '').filter(Boolean);
            if (codes.length) {
                const set = await fetchConsumableCodes(codes);
                if (!cancelled) setConsumableCodes(set);
            }
        })();
        return () => { cancelled = true; };
    }, [ticketId]);

    if (!ticketId) return null;

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto', padding: 20 }}>
                {loading || !detail ? (
                    <p style={{ textAlign: 'center', color: '#6b7280', padding: 30 }}>{loading ? 'Loading ticket…' : 'Ticket not found.'}</p>
                ) : (() => {
                    const t = detail;
                    const isWarranty = t.call_type === 'Warranty' || t.call_type === 'Warranty Repeat' || t.call_type === 'AMC';
                    const isCustReject = t.status === 'Customer Reject';
                    const spares = t.spares || [];
                    const isPendingApprovalView = t.status === 'Pending Customer Approval';
                    const total = isCustReject ? 0 : spares
                        .filter(s => (!s.requested || isPendingApprovalView) && (!isWarranty || isChargeableSpare(s, consumableCodes)))
                        .reduce((a, s) => a + (s.qty || 0) * (s.price || 0), 0);
                    const finalCharge = parseFloat(String(t.final_charges)) || 0;
                    const labCharge = parseFloat(String(t.labor)) || parseFloat(String(t.service_charges)) || 0;
                    const grand = finalCharge > 0 ? finalCharge : (labCharge + total + (parseFloat(String(t.other_charge)) || 0));
                    const timeline = t.timeline || [];
                    return (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 4 }}>
                                <h2 style={{ margin: 0, fontSize: 17 }}>🎫 {t.id}</h2>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button onClick={() => printTicket(t as any)} style={{ padding: '5px 10px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>🖨️ Print</button>
                                    <button onClick={onClose} style={{ padding: '5px 10px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>✕</button>
                                </div>
                            </div>
                            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>{t.call_type} | {t.service_type} | {t.cname} | {t.model}</div>

                            {t.warranty_claim_pending && (
                                <div style={{ background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#92400e' }}>
                                    🛡️ Warranty Claim — Awaiting Approval
                                </div>
                            )}
                            {t.warranty_coverage === 'Out of Coverage' ? (
                                <div style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, fontWeight: 600 }}>⛔ OUT OF COVERAGE</div>
                            ) : isWarranty ? (
                                <div style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, fontWeight: 600 }}>✅ Under Warranty Coverage</div>
                            ) : null}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 12 }}>
                                <div>
                                    <h3 style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', margin: '0 0 6px' }}>CUSTOMER</h3>
                                    <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                                        <b>{t.cname || '-'}</b><br />
                                        📞 <a href={`tel:${t.mobile}`} style={{ color: '#185FA5' }}>{t.mobile || '-'}</a>{' '}
                                        <a href={`https://wa.me/91${(t.mobile || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ color: '#25D366', fontWeight: 600, textDecoration: 'none' }}>💬 WA</a><br />
                                        📍 {t.address || ''}{t.area ? `, ${t.area}` : ''}<br />{t.city || ''}{t.pin ? ` — ${t.pin}` : ''}
                                    </div>
                                </div>
                                <div>
                                    <h3 style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', margin: '0 0 6px' }}>CALL INFO</h3>
                                    <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                                        Model: <b>{t.model || '-'}</b><br />
                                        Serial: <b>{t.serial || '-'}</b><br />
                                        {t.se_call_id ? <>SE Call ID: <b>{t.se_call_id}</b><br /></> : null}
                                        Engineer: <b>{t.assigned_name || 'Unassigned'}</b><br />
                                        Status: <b>{t.status || '-'}</b>
                                    </div>
                                </div>
                            </div>
                            <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '10px 0' }} />
                            <div style={{ fontSize: 13, marginBottom: 10 }}><b>Problem:</b> {t.problem || '-'}</div>
                            {t.work_done && <div style={{ fontSize: 13, marginBottom: 10 }}><b>Action:</b> {t.work_done}</div>}

                            {spares.length > 0 && (
                                <>
                                    <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '10px 0' }} />
                                    <h3 style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', margin: '0 0 8px' }}>SPARES{isCustReject ? ' (Estimate Rejected — Not Fitted, Not Billed)' : ''}</h3>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 8 }}>
                                            <thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}><th style={{ padding: 6 }}>Code</th><th style={{ padding: 6 }}>Item</th><th style={{ padding: 6, textAlign: 'right' }}>Qty</th><th style={{ padding: 6, textAlign: 'right' }}>Price</th><th style={{ padding: 6, textAlign: 'right' }}>Amt</th></tr></thead>
                                            <tbody>
                                                {spares.map((s, i) => {
                                                    const isCons = isChargeableSpare(s, consumableCodes);
                                                    const freeOnWarranty = isWarranty && !isCons;
                                                    const sp = (freeOnWarranty || isCustReject) ? 0 : (s.price || 0);
                                                    const sa = (freeOnWarranty || isCustReject) ? 0 : (s.qty || 0) * (s.price || 0);
                                                    return (
                                                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                            <td style={{ padding: 6 }}>{s.code || '-'}{isCons ? <span style={{ fontSize: 9, fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '1px 5px', borderRadius: 4, marginLeft: 4 }}>CONSUMABLE</span> : null}</td>
                                                            <td style={{ padding: 6 }}>{s.name}</td>
                                                            <td style={{ padding: 6, textAlign: 'right' }}>{s.qty}</td>
                                                            <td style={{ padding: 6, textAlign: 'right' }}>{freeOnWarranty ? <span style={{ color: '#059669', fontWeight: 700 }}>₹0 (W)</span> : isCustReject ? <span style={{ color: '#991b1b' }}>₹0 (Rejected)</span> : `₹${sp}`}</td>
                                                            <td style={{ padding: 6, textAlign: 'right' }}>{freeOnWarranty ? <span style={{ color: '#059669' }}>₹0</span> : isCustReject ? <span style={{ color: '#991b1b' }}>₹0</span> : `₹${sa.toFixed(2)}`}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div style={{ fontSize: 13, background: isCustReject ? '#fef2f2' : '#f0fdf4', padding: 10, borderRadius: 8, marginBottom: 10 }}>
                                        {isCustReject
                                            ? <><span style={{ color: '#991b1b', fontWeight: 700 }}>❌ Estimate Rejected — Part(s) not fitted, not billed</span><br /><b style={{ color: '#991b1b', fontSize: 15 }}>Final Inspection Charges: ₹{grand.toFixed(0)}</b></>
                                            : <>{labCharge > 0 ? <>Service: <b>₹{labCharge}</b></> : null}{labCharge > 0 && total > 0 ? ' + ' : ''}{total > 0 ? <>Parts: <b>₹{total.toFixed(0)}</b></> : null}{(labCharge + total) > 0 ? <> = <b style={{ color: '#065f46', fontSize: 15 }}>Total: ₹{grand.toFixed(0)}</b></> : null}</>}
                                    </div>
                                </>
                            )}

                            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
                                <div>Payment Mode: <b style={{ color: '#111827' }}>{t.payment_mode || '-'}</b></div>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '10px 0' }} />
                            <h3 style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', margin: '0 0 8px' }}>TIMELINE</h3>
                            {timeline.length ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {timeline.slice().reverse().map((tl: any, i: number) => (
                                        <div key={i} style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
                                            <div style={{ fontWeight: 700, fontSize: 12 }}>{tl.action || 'Update'}</div>
                                            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>By: {tl.by || 'System'} | {tl.at ? new Date(tl.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</div>
                                            {tl.note && <div style={{ fontSize: 12, marginTop: 4, padding: '5px 8px', background: '#fff', borderRadius: 6 }}>{tl.note}</div>}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: 16, color: '#9ca3af', fontSize: 12 }}>No updates yet</div>
                            )}
                        </>
                    );
                })()}
            </div>
        </div>
    );
}