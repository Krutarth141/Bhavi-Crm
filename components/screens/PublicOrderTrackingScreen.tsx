'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SalesOrder, SalesStatus } from '@/types/sales';
import { fetchCompanyInfo } from '@/services/settingsService';
import { fetchMyOrders } from '@/services/customerAccountService';

const ORDER_STATUS_ORDER: SalesStatus[] = ['inquiry', 'quoted', 'confirmed', 'paid', 'dispatched', 'done'];

const s = {
    page: { minHeight: '100vh', background: '#f4f6fb', display: 'flex', justifyContent: 'center', padding: '0' } as React.CSSProperties,
    card: { width: '100%', maxWidth: 480, minHeight: '100vh', background: '#fff', boxShadow: '0 0 40px rgba(0,0,0,.08)', display: 'flex', flexDirection: 'column' as const },
    header: { background: 'linear-gradient(160deg,#0f2d7a,#1a3fa8)', color: '#fff', padding: '20px 20px 16px' },
    h1: { fontSize: 18, fontWeight: 900 },
    tagline: { fontSize: 11, opacity: .8, marginTop: 4 },
    badge: { display: 'inline-block', marginTop: 8, background: 'rgba(255,255,255,.18)', borderRadius: 99, padding: '3px 12px', fontSize: 11, fontWeight: 600 },
    body: { flex: 1, padding: '20px 18px', overflowY: 'auto' as const },
    back: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 16, textDecoration: 'none' },
    sectionTitle: { fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: .8, marginBottom: 14, textAlign: 'center' as const },
    grp: { marginBottom: 14 },
    label: { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: .6 },
    inp: { flex: 1, border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '11px 14px', fontSize: 15, color: '#1e293b', outline: 'none', background: '#fafcff', boxSizing: 'border-box' as const },
    btnPrimary: { border: 'none', background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: '#fff', borderRadius: 10, padding: '0 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
    err: { color: '#dc2626', fontSize: 13, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px', marginBottom: 10 },
    info: { color: '#1e40af', fontSize: 13, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 12px', marginBottom: 10 },
    item: { background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 14, marginBottom: 10, cursor: 'pointer' },
    modalOverlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
    modalSheet: { background: '#fff', width: '100%', maxWidth: 520, borderRadius: '22px 22px 0 0', maxHeight: '90vh', overflowY: 'auto' as const, paddingBottom: 24 },
    modalHeader: { background: 'linear-gradient(135deg,#1e3a8a,#1d4ed8)', borderRadius: '22px 22px 0 0', padding: '18px 20px 14px', position: 'relative' as const },
    modalClose: { position: 'absolute' as const, top: 12, right: 14, background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', fontSize: 18, width: 32, height: 32, borderRadius: '50%', cursor: 'pointer' },
    detailGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 },
    detailBox: { background: '#f4f6fb', borderRadius: 10, padding: '10px 12px' },
    detailLbl: { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, marginBottom: 2 },
    detailVal: { fontSize: 13, fontWeight: 700, color: '#1e293b' },
};

function orderSteps(status?: SalesStatus) {
    const si = ORDER_STATUS_ORDER.indexOf(status || 'inquiry');
    return [
        { icon: '🛒', lbl: 'Order Placed', done: si >= 0 },
        { icon: '💳', lbl: 'Payment', done: si >= 3 },
        { icon: '🚚', lbl: 'Dispatched', done: si >= 4 },
        { icon: '📦', lbl: 'Delivered', done: si >= 5 },
    ];
}

function orderStatusMessage(status: SalesStatus | undefined, upiQrUrl: string) {
    if (status === 'inquiry' || status === 'quoted' || !status) {
        return <div style={s.info}>⏳ Order is being processed. We will send payment details on WhatsApp.</div>;
    }
    if (status === 'confirmed') {
        return (
            <>
                <div style={s.info}>💳 Payment details sent on WhatsApp. Please complete payment to proceed.</div>
                {upiQrUrl && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: 14, textAlign: 'center', marginTop: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#166534', marginBottom: 8 }}>💳 Pay via UPI — Scan QR Code</div>
                        <img src={upiQrUrl} style={{ width: 160, height: 160, borderRadius: 8, border: '2px solid #86efac', display: 'block', margin: '0 auto 8px' }} alt="UPI QR" />
                        <div style={{ fontSize: 11, color: '#166534' }}>GPay · PhonePe · Paytm · BHIM · Any UPI App</div>
                    </div>
                )}
            </>
        );
    }
    if (status === 'paid') return <div style={{ ...s.info, color: '#166534', background: '#f0fdf4', border: '1px solid #86efac' }}>✅ Payment received! Your order is being packed for dispatch.</div>;
    if (status === 'dispatched') return <div style={{ ...s.info, color: '#075985', background: '#f0f9ff', border: '1px solid #bae6fd' }}>🚚 Your order is on the way! Estimated delivery: 1–2 working days.</div>;
    if (status === 'done') return <div style={{ ...s.info, color: '#166534', background: '#f0fdf4', border: '1px solid #86efac' }}>🎉 Order delivered! Thank you for shopping with Bhavi Electronics.</div>;
    return null;
}

export default function PublicOrderTrackingScreen() {
    const [mobile, setMobile] = useState('');
    const [err, setErr] = useState('');
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [orders, setOrders] = useState<SalesOrder[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
    const [upiQrUrl, setUpiQrUrl] = useState('');

    const search = async () => {
        setErr('');
        if (!/^\d{10}$/.test(mobile)) { setErr('Please enter a valid 10-digit mobile number.'); return; }
        setLoading(true);
        setSearched(true);
        const [rows] = await Promise.all([
            fetchMyOrders(mobile),
            fetchCompanyInfo().then((ci) => setUpiQrUrl(ci?.upi_qr_url || '')),
        ]);
        setOrders(rows);
        setLoading(false);
    };

    return (
        <div style={s.page}><div style={s.card}>
            <div style={s.header}>
                <div style={s.h1}>📦 My Orders</div>
                <div style={s.tagline}>Bhavi Electronics &amp; Automation</div>
                <div style={s.badge}>Order Status</div>
            </div>
            <div style={s.body}>
                <Link href="/shop" style={s.back}>‹ Back to Shop</Link>
                <div style={s.sectionTitle}>Track Your Orders</div>
                <div style={s.grp}>
                    <label style={s.label}>Mobile Number</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input style={s.inp} type="tel" maxLength={10} placeholder="10 digit mobile" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => { if (e.key === 'Enter') search(); }} />
                        <button style={s.btnPrimary} onClick={search} disabled={loading}>{loading ? '...' : 'Search →'}</button>
                    </div>
                </div>
                {err && <div style={s.err}>{err}</div>}

                {!loading && searched && orders.length === 0 && !err && (
                    <div style={{ textAlign: 'center', color: '#64748b', padding: 24, fontSize: 13 }}>No orders found for this mobile number.</div>
                )}

                {orders.map((o) => {
                    const items = (o.items || []).map((i) => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''}`).join(', ');
                    const steps = orderSteps(o.status);
                    return (
                        <div key={o.id} style={s.item} onClick={() => setSelectedOrder(o)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: '#1d4ed8' }}>{o.order_no || '—'}</div>
                                    <div style={{ fontSize: 11, color: '#64748b' }}>{o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</div>
                                </div>
                                <div style={{ fontSize: 17, fontWeight: 900, color: '#1e293b' }}>₹{Math.round(o.total_amount || 0).toLocaleString('en-IN')}</div>
                            </div>
                            {items && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>📦 {items}</div>}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 0, margin: '12px 0 4px' }}>
                                {steps.map((step, idx) => (
                                    <div key={step.lbl} style={{ display: 'flex', alignItems: 'center', flex: idx < steps.length - 1 ? 1 : 'none' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: step.done ? '#059669' : '#e2e8f0', color: step.done ? '#fff' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{step.done ? '✓' : step.icon}</div>
                                            <div style={{ fontSize: 9, fontWeight: 700, color: step.done ? '#059669' : '#94a3b8', marginTop: 4, textAlign: 'center' }}>{step.lbl}</div>
                                        </div>
                                        {idx < steps.length - 1 && <div style={{ flex: 1, height: 2, background: step.done ? '#059669' : '#e2e8f0', marginBottom: 16 }} />}
                                    </div>
                                ))}
                            </div>
                            {o.courier_name && (
                                <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '8px 10px', marginTop: 4 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1' }}>🚚 {o.courier_name} — AWB: <b>{o.awb_number || ''}</b></div>
                                    {o.tracking_url && <a href={o.tracking_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontSize: 12, color: '#1a3fa8', display: 'block', marginTop: 4, fontWeight: 700 }}>🔗 Track Shipment →</a>}
                                </div>
                            )}
                            <div style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 700, marginTop: 8, textAlign: 'right' }}>Tap to view full details →</div>
                        </div>
                    );
                })}
            </div>

            {selectedOrder && (
                <div style={s.modalOverlay} onClick={() => setSelectedOrder(null)}>
                    <div style={s.modalSheet} onClick={(e) => e.stopPropagation()}>
                        <div style={s.modalHeader}>
                            <button style={s.modalClose} onClick={() => setSelectedOrder(null)}>✕</button>
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', fontWeight: 700, letterSpacing: 1 }}>ORDER DETAILS</div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginTop: 2 }}>{selectedOrder.order_no || '—'}</div>
                        </div>
                        <div style={{ padding: '16px 18px 0' }}>
                            <div style={s.detailGrid}>
                                <div style={s.detailBox}><div style={s.detailLbl}>Order Date</div><div style={s.detailVal}>{selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</div></div>
                                <div style={s.detailBox}><div style={s.detailLbl}>Total Amount</div><div style={{ ...s.detailVal, color: '#1d4ed8', fontSize: 16 }}>₹{Math.round(selectedOrder.total_amount || 0).toLocaleString('en-IN')}</div></div>
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .6, marginBottom: 6 }}>📦 Items Ordered</div>
                            {(selectedOrder.items || []).length ? (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 12 }}>
                                    <thead><tr style={{ background: '#f4f6fb' }}>
                                        <th style={{ padding: '7px 8px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}>Item</th>
                                        <th style={{ padding: '7px 8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}>Qty</th>
                                        <th style={{ padding: '7px 8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}>Price</th>
                                        <th style={{ padding: '7px 8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}>Amount</th>
                                    </tr></thead>
                                    <tbody>
                                        {(selectedOrder.items || []).map((i, idx) => (
                                            <tr key={idx}>
                                                <td style={{ padding: '7px 8px', borderBottom: '1px solid #e2e8f0' }}>{i.name}</td>
                                                <td style={{ padding: '7px 8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>{i.qty}</td>
                                                <td style={{ padding: '7px 8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>₹{i.price.toLocaleString('en-IN')}</td>
                                                <td style={{ padding: '7px 8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}>₹{(i.qty * i.price).toLocaleString('en-IN')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div style={{ color: '#64748b', fontSize: 12, padding: '8px 0' }}>No item details available.</div>
                            )}
                            {(selectedOrder.courier_name || selectedOrder.tracking_url) && (
                                <div style={{ background: '#faf5ff', border: '1.5px solid #e9d5ff', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', marginBottom: 4 }}>🚚 Shipping / Tracking</div>
                                    {selectedOrder.courier_name && <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{selectedOrder.courier_name}{selectedOrder.awb_number ? ` — AWB: ${selectedOrder.awb_number}` : ''}</div>}
                                    {selectedOrder.dispatch_date && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Dispatched: {selectedOrder.dispatch_date}</div>}
                                    {selectedOrder.tracking_url && <a href={selectedOrder.tracking_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#7c3aed', fontWeight: 700, display: 'inline-block', marginTop: 4 }}>🔗 Track Shipment →</a>}
                                </div>
                            )}
                            {selectedOrder.delivery_note && <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '10px 14px', marginBottom: 10, fontSize: 12, color: '#065f46' }}>📝 {selectedOrder.delivery_note}</div>}
                            {selectedOrder.notes && <div style={{ background: '#fff7ed', borderRadius: 10, padding: '10px 14px', marginBottom: 10, fontSize: 12, color: '#92400e' }}>📋 {selectedOrder.notes}</div>}
                            {orderStatusMessage(selectedOrder.status, upiQrUrl)}
                        </div>
                    </div>
                </div>
            )}
        </div></div>
    );
}