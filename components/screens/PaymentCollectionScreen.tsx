'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import * as XLSX from 'xlsx';
import { isCspManager, isAccountant } from '@/lib/permissions';
import { PaymentTicket, PcEngineerGroup } from '@/types/paymentCollection';
import { fetchPaymentCollectionTickets, pcBreakdown, pcAmount, markPaymentReceived, savePaymentInvoice } from '@/services/paymentCollectionService';

const fieldStyle = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box' as const };

export default function PaymentCollectionScreen() {
    const { data: session } = useSession();
    const roleType = (session?.user as any)?.roleType;
    const isAdm = roleType === 'admin';
    const cspMgr = isCspManager(session);
    const isAcct = isAccountant(session);
    const canManage = isAdm || cspMgr || isAcct;
    const myId = (session?.user as any)?.email ?? '';
    const myName = (session?.user as any)?.name ?? '';

    const [tickets, setTickets] = useState<PaymentTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [setupNeeded, setSetupNeeded] = useState(false);
    const [view, setView] = useState<'pending' | 'received'>('pending');
    const [invoiceTicket, setInvoiceTicket] = useState<PaymentTicket | null>(null);
    const [invoiceNo, setInvoiceNo] = useState('');
    const [savingInvoice, setSavingInvoice] = useState(false);

    const load = useCallback(async () => {
        if (!myId) return;
        setLoading(true);
        const { tickets: t, setupNeeded: sn } = await fetchPaymentCollectionTickets(myId, canManage);
        setTickets(t);
        setSetupNeeded(sn);
        setLoading(false);
    }, [myId, canManage]);

    useEffect(() => { load(); }, [load]);

    const byEng = useMemo(() => {
        const g: Record<string, PcEngineerGroup> = {};
        tickets.forEach(t => {
            const k = t.assigned_to || 'unassigned';
            if (!g[k]) g[k] = { name: t.assigned_name || 'Unassigned', pendingRows: [], receivedRows: [], pending: 0, received: 0 };
            const amt = pcAmount(t);
            if (t.payment_received) { g[k].receivedRows.push(t); g[k].received += amt; }
            else { g[k].pendingRows.push(t); g[k].pending += amt; }
        });
        return g;
    }, [tickets]);

    const totalPending = Object.values(byEng).reduce((a, e) => a + e.pending, 0);
    const totalReceived = Object.values(byEng).reduce((a, e) => a + e.received, 0);
    const pendingCount = tickets.filter(t => !t.payment_received).length;
    const receivedCount = tickets.length - pendingCount;

    const groupKey = view === 'pending' ? 'pendingRows' : 'receivedRows';
    const groups = Object.entries(byEng)
        .filter(([, g]) => g[groupKey].length > 0)
        .sort((a, b) => view === 'pending' ? b[1].pending - a[1].pending : b[1].received - a[1].received);

    const showBreakdown = (t: PaymentTicket) => {
        const b = pcBreakdown(t);
        alert(`💰 Amount Breakdown — ${t.id}\n\nLabor/Service: ₹${b.labor.toFixed(0)}\nParts: ₹${b.parts.toFixed(0)}${b.other ? `\nOther: ₹${b.other.toFixed(0)}` : ''}\n─────────────\nTotal: ₹${b.total.toFixed(0)}`);
    };

    const toggleReceived = async (t: PaymentTicket, received: boolean) => {
        if (received) {
            const amt = pcAmount(t).toFixed(0);
            if (!confirm(`Confirm payment received?\n\nTicket: ${t.id}${t.cname ? `\nCustomer: ${t.cname}` : ''}\nAmount: ₹${amt}\n\nThis marks it as collected/handed over to office.`)) return;
        }
        const r = await markPaymentReceived(t.id, received, myName);
        if (!r.success) {
            alert(r.setupNeeded
                ? '⚠️ Setup needed: the payment_received columns don\'t exist on the tickets table yet. Run the Payment Collection setup SQL in Supabase first.'
                : 'Error: ' + r.error);
        } else {
            await load();
        }
    };

    const openInvoice = (t: PaymentTicket) => { setInvoiceTicket(t); setInvoiceNo(t.invoice_no || ''); };

    const handleSaveInvoice = async () => {
        if (!invoiceTicket) return;
        if (!invoiceNo.trim()) { alert('⚠️ Invoice Number is required.'); return; }
        setSavingInvoice(true);
        const r = await savePaymentInvoice(invoiceTicket.id, invoiceNo.trim(), myName);
        setSavingInvoice(false);
        if (!r.success) { alert('Error: ' + r.error); return; }
        setInvoiceTicket(null);
        await load();
    };

    const downloadExcel = () => {
        if (!tickets.length) { alert('Nothing to download'); return; }
        const data = tickets.map(t => {
            const b = pcBreakdown(t);
            return {
                Engineer: t.assigned_name || '-', Date: t.updated_at ? new Date(t.updated_at).toLocaleDateString('en-IN') : '-',
                Ticket: t.id, Customer: t.cname || '-', Mobile: t.mobile || '-', Area: t.area || '-', Model: t.model || '-',
                'Labor ₹': b.labor.toFixed(2), 'Parts ₹': b.parts.toFixed(2), 'Other ₹': b.other.toFixed(2),
                'Total ₹': b.total.toFixed(2), Mode: t.payment_mode || '-',
                'Invoice Done': t.invoice_done ? 'Yes' : 'No', 'Invoice No': t.invoice_no || '',
                Received: t.payment_received ? 'Yes' : 'No',
                'Received By': t.payment_received_by || '',
                'Received At': t.payment_received_at ? new Date(t.payment_received_at).toLocaleString('en-IN') : '',
            };
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Payment Collection');
        XLSX.writeFile(wb, `payment_collection_${new Date().toLocaleDateString('en-CA')}.xlsx`);
    };

    if (!myId) return null;

    return (
        <div style={{ padding: '20px 24px' }}>
            <h1 style={{ margin: '0 0 16px', fontSize: 24, fontWeight: 700 }}>💰 Payment Collection</h1>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                {canManage && (
                    <div style={{ background: '#eff6ff', borderRadius: 10, padding: '10px 16px' }}><div style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 700 }}>Total Calls</div><div style={{ fontSize: 20, fontWeight: 800, color: '#1d4ed8' }}>{tickets.length}</div></div>
                )}
                <div style={{ background: '#fffbeb', borderRadius: 10, padding: '10px 16px', border: '1px solid #fde68a' }}><div style={{ fontSize: 11, color: '#d97706', fontWeight: 700 }}>Pending to Collect</div><div style={{ fontSize: 20, fontWeight: 800, color: '#d97706' }}>₹{totalPending.toFixed(0)}</div></div>
                <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '10px 16px', border: '1px solid #bbf7d0' }}><div style={{ fontSize: 11, color: '#0e9f6e', fontWeight: 700 }}>Received</div><div style={{ fontSize: 20, fontWeight: 800, color: '#0e9f6e' }}>₹{totalReceived.toFixed(0)}</div></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
                {view === 'pending' ? (
                    <button onClick={() => setView('received')} style={{ padding: '7px 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>✅ View Received ({receivedCount})</button>
                ) : (
                    <button onClick={() => setView('pending')} style={{ padding: '7px 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>⬅ Back to Pending</button>
                )}
                {canManage && <button onClick={downloadExcel} style={{ padding: '7px 14px', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>📊 Excel Download</button>}
            </div>

            {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</p>
                : setupNeeded ? (
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 16, color: '#92400e', fontSize: 14 }}>
                        ⚠️ Setup needed: the payment_received columns don&apos;t exist on the tickets table yet. Run the Payment Collection setup SQL in Supabase, then reload this page.
                    </div>
                )
                    : tickets.length === 0 ? <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, textAlign: 'center', padding: 40, color: '#9ca3af' }}>No payment-confirmed calls found{canManage ? '.' : ' for you yet.'}</div>
                        : groups.length === 0 ? (
                            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 20, textAlign: 'center', color: '#1d4ed8' }}>
                                {view === 'pending' ? '🎉 Nothing pending — everything collected!' : 'No received payments yet.'}
                            </div>
                        ) : groups.map(([engId, g]) => (
                            <div key={engId} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, marginBottom: 14 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                                    <h2 style={{ margin: 0, fontSize: 15 }}>👷 {g.name}</h2>
                                    {view === 'pending'
                                        ? <span style={{ fontSize: 13, fontWeight: 700, color: g.pending > 0 ? '#d97706' : '#0e9f6e' }}>⏳ Pending: ₹{g.pending.toFixed(0)}</span>
                                        : <span style={{ fontSize: 13, fontWeight: 700, color: '#0e9f6e' }}>✅ Received: ₹{g.received.toFixed(0)}</span>}
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                                                <th style={{ padding: '6px 8px' }}>Date</th>
                                                <th style={{ padding: '6px 8px' }}>Ticket</th>
                                                <th style={{ padding: '6px 8px' }}>Customer</th>
                                                <th style={{ padding: '6px 8px' }}>Mobile</th>
                                                <th style={{ padding: '6px 8px' }}>Area</th>
                                                <th style={{ padding: '6px 8px' }}>Model</th>
                                                <th style={{ padding: '6px 8px' }}>Amount</th>
                                                <th style={{ padding: '6px 8px' }}>Mode</th>
                                                <th style={{ padding: '6px 8px' }}>Invoice</th>
                                                <th style={{ padding: '6px 8px' }}>{view === 'pending' ? 'Received' : 'Received Info'}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {g[groupKey].map(t => {
                                                const amt = pcAmount(t);
                                                return (
                                                    <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                        <td style={{ padding: '6px 8px' }}>{t.updated_at ? new Date(t.updated_at).toLocaleDateString('en-IN') : '-'}</td>
                                                        <td style={{ padding: '6px 8px', fontWeight: 700 }}>{t.id}</td>
                                                        <td style={{ padding: '6px 8px' }}>{t.cname || '-'}</td>
                                                        <td style={{ padding: '6px 8px' }}>{t.mobile || '-'}</td>
                                                        <td style={{ padding: '6px 8px' }}>{t.area || '-'}</td>
                                                        <td style={{ padding: '6px 8px' }}>{t.model || '-'}</td>
                                                        <td style={{ padding: '6px 8px' }}>
                                                            <button onClick={() => showBreakdown(t)} style={{ background: 'none', border: 'none', color: '#185FA5', fontWeight: 700, textDecoration: 'underline dotted', cursor: 'pointer', padding: 0, fontSize: 12 }}>₹{amt.toFixed(0)}</button>
                                                        </td>
                                                        <td style={{ padding: '6px 8px' }}>{t.payment_mode || '-'}</td>
                                                        <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                                                            {t.invoice_done ? (
                                                                <>
                                                                    <div style={{ color: '#0e9f6e', fontWeight: 700, fontSize: 12 }}>✅ #{t.invoice_no || ''}</div>
                                                                    {canManage && <button onClick={() => openInvoice(t)} style={{ marginTop: 4, padding: '2px 8px', fontSize: 10, border: '1px solid #e5e7eb', background: '#fff', borderRadius: 6, cursor: 'pointer' }}>✏️ Edit</button>}
                                                                </>
                                                            ) : canManage ? (
                                                                <button onClick={() => openInvoice(t)} style={{ padding: '4px 10px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>🧾 Add Invoice</button>
                                                            ) : (
                                                                <span style={{ color: '#d97706', fontWeight: 700, fontSize: 12 }}>☐ Pending</span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                                                            {view === 'received' ? (
                                                                <>
                                                                    <div style={{ color: '#0e9f6e', fontWeight: 700, fontSize: 12 }}>✅ {t.payment_received_by || ''}</div>
                                                                    <div style={{ fontSize: 10, color: '#9ca3af' }}>{t.payment_received_at ? new Date(t.payment_received_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }) : ''}</div>
                                                                    {canManage && <button onClick={() => toggleReceived(t, false)} style={{ marginTop: 4, padding: '2px 8px', fontSize: 10, border: '1px solid #e5e7eb', background: '#fff', borderRadius: 6, cursor: 'pointer' }}>Undo</button>}
                                                                </>
                                                            ) : canManage ? (
                                                                <button onClick={() => toggleReceived(t, true)} style={{ padding: '4px 10px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>☐ Mark Received</button>
                                                            ) : (
                                                                <span style={{ color: '#d97706', fontWeight: 700, fontSize: 12 }}>☐ Pending</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}

            {invoiceTicket && (
                <div onClick={() => setInvoiceTicket(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400, padding: 20 }}>
                        <h2 style={{ margin: '0 0 4px', fontSize: 16 }}>🧾 Invoice Entry — {invoiceTicket.id}</h2>
                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>{invoiceTicket.cname || ''}{invoiceTicket.model ? ` | ${invoiceTicket.model}` : ''}</div>
                        {(() => {
                            const b = pcBreakdown(invoiceTicket);
                            return (
                                <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 13 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ color: '#6b7280' }}>Labor/Service</span><b>₹{b.labor.toFixed(0)}</b></div>
                                    {b.parts > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ color: '#6b7280' }}>Parts</span><b>₹{b.parts.toFixed(0)}</b></div>}
                                    {b.other > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ color: '#6b7280' }}>Other</span><b>₹{b.other.toFixed(0)}</b></div>}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', paddingTop: 6, marginTop: 4 }}><span style={{ fontWeight: 700 }}>Total</span><b style={{ color: '#0d9488', fontSize: 15 }}>₹{b.total.toFixed(0)}</b></div>
                                </div>
                            );
                        })()}
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 13, fontWeight: 600 }}>Invoice Number *</label>
                            <input type="text" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} placeholder="e.g. INV-2026-001" style={{ ...fieldStyle, marginTop: 4 }} autoFocus />
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={handleSaveInvoice} disabled={savingInvoice} style={{ flex: 1, padding: '8px 14px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: savingInvoice ? 0.6 : 1 }}>{savingInvoice ? 'Saving...' : '💾 Save & Mark Done'}</button>
                            <button onClick={() => setInvoiceTicket(null)} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}