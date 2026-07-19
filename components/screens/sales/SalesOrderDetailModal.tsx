'use client';

import Modal from '@/components/Modal';
import { SalesOrder, SALES_STATUSES } from '@/types/sales';

interface Props {
    order: SalesOrder;
    onClose: () => void;
}

export default function SalesOrderDetailModal({ order, onClose }: Props) {
    const statusInfo = SALES_STATUSES.find(s => s.id === order.status);
    return (
        <Modal isOpen title={`Order — ${order.order_no || ''}`} onClose={onClose}>
            <div style={{ fontSize: 13, lineHeight: 1.9 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    <div><div style={{ fontSize: 11, color: '#94a3b8' }}>Customer</div><b>{order.customer_name}</b></div>
                    <div><div style={{ fontSize: 11, color: '#94a3b8' }}>Mobile</div><b>{order.customer_mobile || '—'}</b></div>
                    <div><div style={{ fontSize: 11, color: '#94a3b8' }}>Status</div><span style={{ background: statusInfo?.color || '#9ca3af', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{statusInfo?.label || order.status}</span></div>
                    <div><div style={{ fontSize: 11, color: '#94a3b8' }}>Date</div>{order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</div>
                </div>
                {order.customer_address && <div style={{ marginBottom: 10 }}><div style={{ fontSize: 11, color: '#94a3b8' }}>Delivery Address</div>{order.customer_address}</div>}
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: 10, marginBottom: 10 }}>
                    {(order.items || []).map((it, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                            <span>{it.name} <span style={{ color: '#94a3b8' }}>× {it.qty}</span></span>
                            <b>₹{(it.price * it.qty).toLocaleString('en-IN')}</b>
                        </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 2px', fontSize: 11, color: '#6b7280' }}><span>Subtotal (excl. GST)</span><span>₹{(order.subtotal || 0).toLocaleString('en-IN')}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280' }}><span>GST</span><span>₹{(order.gst_amount || 0).toLocaleString('en-IN')}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 17, fontWeight: 800, color: '#1d4ed8' }}><span>Total</span><span>₹{(order.total_amount || 0).toLocaleString('en-IN')}</span></div>
                </div>
                {order.payment_method && <div style={{ marginBottom: 6 }}><span style={{ color: '#94a3b8', fontSize: 11 }}>Payment </span><b>{order.payment_method}</b>{order.payment_reference ? ` — ${order.payment_reference}` : ''}{order.payment_date ? ` on ${order.payment_date}` : ''}</div>}
                {order.courier_name && <div style={{ marginBottom: 6 }}><span style={{ color: '#94a3b8', fontSize: 11 }}>Courier </span><b>{order.courier_name} — AWB: {order.awb_number || ''}</b>{order.dispatch_date ? ` on ${order.dispatch_date}` : ''}</div>}
                {order.tracking_url && <a href={order.tracking_url} target="_blank" rel="noreferrer" style={{ color: '#1d4ed8', fontSize: 13 }}>🔗 Track Shipment</a>}
                {order.notes && <div style={{ marginTop: 6 }}><span style={{ color: '#94a3b8', fontSize: 11 }}>Notes </span>{order.notes}</div>}
            </div>
        </Modal>
    );
}