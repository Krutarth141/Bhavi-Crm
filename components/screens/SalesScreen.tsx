'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSales } from '@/hooks/useSales';
import { SalesOrder, SALES_STATUSES } from '@/types/sales';
import { sendBrochure, sendQuote, sendPaymentDetails, sendPaymentConfirm, sendDispatch, sendDelivered } from '@/utils/salesWhatsApp';
import NewSalesOrderModal from '@/components/screens/sales/NewSalesOrderModal';
import SalesOrderDetailModal from '@/components/screens/sales/SalesOrderDetailModal';
import PaymentModal from '@/components/screens/sales/PaymentModal';
import DispatchModal from '@/components/screens/sales/DispatchModal';
import DeliveryModal from '@/components/screens/sales/DeliveryModal';
import SalesSetupTab from '@/components/screens/sales/SalesSetupTab';
import ProductsTab from '@/components/screens/sales/ProductsTab';

type Tab = 'orders' | 'products' | 'setup';

export default function SalesScreen() {
    const { data: session } = useSession();
    const userName = (session?.user as any)?.name || 'Admin';

    const { orders, products, upiQrUrl, companyPhone, loading, totalRevenue, addOrder, markStatus, recordPayment, recordDispatch, recordDelivery, refetch } = useSales();

    const [tab, setTab] = useState<Tab>('orders');
    const [statusFilter, setStatusFilter] = useState('all');
    const [newOrderOpen, setNewOrderOpen] = useState(false);
    const [detailOrder, setDetailOrder] = useState<SalesOrder | null>(null);
    const [paymentOrder, setPaymentOrder] = useState<SalesOrder | null>(null);
    const [dispatchOrder, setDispatchOrder] = useState<SalesOrder | null>(null);
    const [deliveryOrder, setDeliveryOrder] = useState<SalesOrder | null>(null);

    const filtered = statusFilter === 'all' ? orders : orders.filter(o => o.status === statusFilter);

    const handleMarkQuoted = async (o: SalesOrder) => {
        const r = await markStatus(o.id, 'quoted');
        if (!r.success) alert('Error: ' + r.error);
    };
    const handleConfirm = async (o: SalesOrder) => {
        const r = await markStatus(o.id, 'confirmed');
        if (!r.success) alert('Error: ' + r.error);
    };

    if (loading) return <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>Loading...</div>;

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>💼 Sales</h1>
                <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#059669' }}>₹{totalRevenue.toLocaleString('en-IN')}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>Total Revenue</div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button onClick={() => setTab('orders')} style={{ background: tab === 'orders' ? '#1d4ed8' : '#f1f5f9', color: tab === 'orders' ? '#fff' : '#475569', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>📋 Orders</button>
                <button onClick={() => setTab('products')} style={{ background: tab === 'products' ? '#1d4ed8' : '#f1f5f9', color: tab === 'products' ? '#fff' : '#475569', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>🛍️ Products</button>
                <button onClick={() => setTab('setup')} style={{ background: tab === 'setup' ? '#1d4ed8' : '#f1f5f9', color: tab === 'setup' ? '#fff' : '#475569', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>⚙️ Setup</button>
            </div>

            {tab === 'products' ? (
                <ProductsTab onProductsChanged={refetch} />
            ) : tab === 'setup' ? (
                <SalesSetupTab upiQrUrl={upiQrUrl} onUpdated={refetch} />
            ) : (
                <>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                        <button onClick={() => setStatusFilter('all')} style={{ background: statusFilter === 'all' ? '#6b7280' : '#f1f5f9', color: statusFilter === 'all' ? '#fff' : '#475569', border: 'none', borderRadius: 20, padding: '4px 11px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>All ({orders.length})</button>
                        {SALES_STATUSES.map(s => (
                            <button key={s.id} onClick={() => setStatusFilter(s.id)} style={{ background: statusFilter === s.id ? s.color : '#f1f5f9', color: statusFilter === s.id ? '#fff' : '#475569', border: 'none', borderRadius: 20, padding: '4px 11px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                                {s.label} ({orders.filter(o => o.status === s.id).length})
                            </button>
                        ))}
                    </div>

                    <button onClick={() => setNewOrderOpen(true)} style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}>+ New Order</button>

                    {filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No orders found.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {filtered.map(o => {
                                const statusInfo = SALES_STATUSES.find(s => s.id === o.status);
                                return (
                                    <div key={o.id} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                                            <div>
                                                <div style={{ fontSize: 14, fontWeight: 800, color: '#111' }}>{o.customer_name}</div>
                                                <div style={{ fontSize: 11, color: '#6b7280' }}>{o.order_no || ''}{o.customer_mobile ? ` | 📞 ${o.customer_mobile}` : ''} | {o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</div>
                                            </div>
                                            <span style={{ background: statusInfo?.color || '#9ca3af', color: '#fff', borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>{o.status}</span>
                                        </div>
                                        <div style={{ marginTop: 6, fontSize: 15, fontWeight: 800, color: '#1d4ed8' }}>₹{(o.total_amount || 0).toLocaleString('en-IN')}<span style={{ fontSize: 11, fontWeight: 400, color: '#94a3b8' }}> incl. all taxes</span></div>
                                        {o.courier_name && <div style={{ marginTop: 6, fontSize: 12, color: '#0ea5e9', fontWeight: 600 }}>🚚 {o.courier_name} — AWB: {o.awb_number}{o.tracking_url && <a href={o.tracking_url} target="_blank" rel="noreferrer" style={{ color: '#1d4ed8', fontSize: 11, marginLeft: 6 }}>Track →</a>}</div>}
                                        {o.delivery_date && <div style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>✅ Delivered: {o.delivery_date}</div>}

                                        <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            <button onClick={() => setDetailOrder(o)} style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 7, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>👁 View</button>

                                            {o.status === 'inquiry' && (
                                                <>
                                                    <button onClick={() => handleMarkQuoted(o)} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>Mark Quoted</button>
                                                    <button onClick={() => sendBrochure(o.customer_name, o.customer_mobile || '')} style={{ background: '#25d366', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>📲 Brochure</button>
                                                    <button onClick={() => sendQuote(o, upiQrUrl)} style={{ background: '#25d366', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>📲 Quote & Pay</button>
                                                </>
                                            )}
                                            {o.status === 'quoted' && (
                                                <>
                                                    <button onClick={() => handleConfirm(o)} style={{ background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>Confirm Order</button>
                                                    <button onClick={() => sendQuote(o, upiQrUrl)} style={{ background: '#25d366', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>📲 Re-send Quote</button>
                                                    <button onClick={() => sendPaymentDetails(o, upiQrUrl)} style={{ background: '#25d366', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>📲 Payment Details</button>
                                                </>
                                            )}
                                            {o.status === 'confirmed' && (
                                                <>
                                                    <div style={{ width: '100%', background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8, padding: '7px 11px', fontSize: 12, color: '#92400e', marginBottom: 6 }}>⏳ Payment Details sent to customer. Once they pay → click <strong>✅ Mark Paid</strong> to confirm receipt.</div>
                                                    <button onClick={() => setPaymentOrder(o)} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>✅ Mark Paid</button>
                                                    <button onClick={() => sendPaymentDetails(o, upiQrUrl)} style={{ background: '#25d366', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>📲 Resend Payment Link</button>
                                                </>
                                            )}
                                            {o.status === 'paid' && (
                                                <button onClick={() => setDispatchOrder(o)} style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>🚚 Dispatch</button>
                                            )}
                                            {o.status === 'dispatched' && (
                                                <>
                                                    <button onClick={() => setDeliveryOrder(o)} style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>✅ Mark Delivered</button>
                                                    <button onClick={() => sendDispatch(o, o.courier_name || '', o.awb_number || '', o.dispatch_date || '', o.tracking_url || '', companyPhone)} style={{ background: '#25d366', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>📲 Resend Tracking</button>
                                                </>
                                            )}
                                            {o.status === 'done' && (
                                                <button onClick={() => sendDelivered(o, o.delivery_note || '', companyPhone)} style={{ background: '#25d366', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>📲 Delivery Msg</button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {newOrderOpen && (
                <NewSalesOrderModal products={products} createdBy={userName} onClose={() => setNewOrderOpen(false)} onSave={addOrder} />
            )}
            {detailOrder && <SalesOrderDetailModal order={detailOrder} onClose={() => setDetailOrder(null)} />}
            {paymentOrder && (
                <PaymentModal
                    order={paymentOrder}
                    upiQrUrl={upiQrUrl}
                    onClose={() => setPaymentOrder(null)}
                    onSave={async (method, ref, date) => {
                        const r = await recordPayment(paymentOrder.id, method, ref, date);
                        if (r.success) sendPaymentConfirm(paymentOrder, method, ref, companyPhone);
                        return r;
                    }}
                />
            )}
            {dispatchOrder && (
                <DispatchModal
                    order={dispatchOrder}
                    onClose={() => setDispatchOrder(null)}
                    onSave={async (courier, awb, date, trackUrl, notes) => {
                        const r = await recordDispatch(dispatchOrder.id, courier, awb, date, trackUrl, notes);
                        if (r.success) sendDispatch(dispatchOrder, courier, awb, date, trackUrl, companyPhone);
                        return r;
                    }}
                />
            )}
            {deliveryOrder && (
                <DeliveryModal
                    order={deliveryOrder}
                    onClose={() => setDeliveryOrder(null)}
                    onSave={async (note) => {
                        const r = await recordDelivery(deliveryOrder.id, note);
                        if (r.success) sendDelivered(deliveryOrder, note, companyPhone);
                        return r;
                    }}
                />
            )}
        </div>
    );
}