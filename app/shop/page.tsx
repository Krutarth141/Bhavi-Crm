'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SalesProduct } from '@/types/sales';
import { fetchActiveSalesProducts, createSalesOrder } from '@/services/salesService';
import { fetchCompanyInfo } from '@/services/settingsService';

interface CartItem { id: string; name: string; model: string; price: number; gst_percent: number; qty: number; }
type View = 'grid' | 'checkout' | 'success';

export default function PublicShopPage() {
    const [products, setProducts] = useState<SalesProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [companyName, setCompanyName] = useState('Bhavi Electronics');
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [cartOpen, setCartOpen] = useState(false);
    const [viewProduct, setViewProduct] = useState<SalesProduct | null>(null);
    const [view, setView] = useState<View>('grid');
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [address, setAddress] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [orderResult, setOrderResult] = useState<{ order_no: string; total: number } | null>(null);

    useEffect(() => {
        (async () => {
            const [prods, ci] = await Promise.all([fetchActiveSalesProducts(), fetchCompanyInfo()]);
            setProducts(prods);
            if (ci?.company_name) setCompanyName(ci.company_name);
            if (ci?.logo_url) setLogoUrl(ci.logo_url);
            setLoading(false);
        })();
    }, []);

    const cartCount = cart.reduce((s, c) => s + c.qty, 0);
    const cartTotal = cart.reduce((s, c) => s + c.price * c.qty, 0);

    const addToCart = (p: SalesProduct) => {
        setCart((prev) => {
            const ex = prev.find((c) => c.id === p.id);
            if (ex) return prev.map((c) => c.id === p.id ? { ...c, qty: c.qty + 1 } : c);
            return [...prev, { id: p.id, name: p.name, model: p.model || '', price: p.price, gst_percent: p.gst_percent || 18, qty: 1 }];
        });
    };
    const changeQty = (id: string, delta: number) => {
        setCart((prev) => prev.map((c) => c.id === id ? { ...c, qty: Math.max(1, c.qty + delta) } : c));
    };
    const removeFromCart = (id: string) => setCart((prev) => prev.filter((c) => c.id !== id));

    const handleSubmitOrder = async () => {
        if (!name.trim()) { alert('Please enter your full name.'); return; }
        if (mobile.replace(/\D/g, '').length !== 10) { alert('Please enter a valid 10-digit mobile number.'); return; }
        if (!address.trim()) { alert('Please enter your delivery address.'); return; }
        if (!cart.length) { alert('Your cart is empty.'); return; }
        setSubmitting(true);
        const r = await createSalesOrder({
            customer_name: name.trim(),
            customer_mobile: mobile.replace(/\D/g, ''),
            customer_address: address.trim(),
            notes: '',
            items: cart.map((c) => ({ product_id: c.id, name: c.name, price: c.price, gst_percent: c.gst_percent, qty: c.qty })),
            createdBy: 'Online Shop',
        });
        setSubmitting(false);
        if (r.success && r.order) {
            setOrderResult({ order_no: r.order.order_no || '', total: r.order.total_amount || cartTotal });
            setCart([]);
            setView('success');
        } else {
            alert('Unable to place order. Please try again.\nError: ' + r.error);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
            <div style={{ background: '#1d4ed8', padding: '0 16px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                {logoUrl ? <img src={logoUrl} style={{ maxHeight: 44, maxWidth: 150, objectFit: 'contain' }} alt={companyName} /> : <span style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: 0.5 }}>{companyName}</span>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Link href="/track-orders" style={{ color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'underline', whiteSpace: 'nowrap' }}>📦 Track My Orders</Link>
                    <button onClick={() => setCartOpen((o) => !o)} style={{ background: '#fff', color: '#1d4ed8', border: 'none', borderRadius: 20, padding: '7px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                        🛒 Cart ({cartCount})
                    </button>
                </div>
            </div>

            {cartOpen && (
                <div style={{ background: '#fff', borderBottom: '2px solid #e2e8f0', padding: 16 }}>
                    <div style={{ maxWidth: 960, margin: '0 auto' }}>
                        {!cart.length ? (
                            <div style={{ textAlign: 'center', color: '#94a3b8', padding: 16 }}>Your cart is empty.</div>
                        ) : (
                            <>
                                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>🛒 Shopping Cart</div>
                                {cart.map((c) => (
                                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                                            {c.model && <div style={{ fontSize: 11, color: '#94a3b8' }}>{c.model}</div>}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f8fafc', borderRadius: 8, padding: 4 }}>
                                            <button onClick={() => changeQty(c.id, -1)} style={{ background: 'none', border: 'none', width: 26, height: 26, cursor: 'pointer', fontSize: 17, fontWeight: 700 }}>−</button>
                                            <span style={{ width: 24, textAlign: 'center', fontWeight: 700 }}>{c.qty}</span>
                                            <button onClick={() => changeQty(c.id, 1)} style={{ background: 'none', border: 'none', width: 26, height: 26, cursor: 'pointer', fontSize: 17, fontWeight: 700 }}>+</button>
                                        </div>
                                        <div style={{ minWidth: 70, textAlign: 'right', fontWeight: 700, color: '#1d4ed8' }}>₹{(c.price * c.qty).toLocaleString('en-IN')}</div>
                                        <button onClick={() => removeFromCart(c.id)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}>Remove</button>
                                    </div>
                                ))}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '2px solid #e2e8f0' }}>
                                    <div>
                                        <div style={{ fontSize: 18, fontWeight: 800 }}>Total: ₹{Math.round(cartTotal).toLocaleString('en-IN')}</div>
                                        <div style={{ fontSize: 11, color: '#10b981' }}>All taxes included</div>
                                    </div>
                                    <button onClick={() => { setCartOpen(false); setView('checkout'); }} style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Proceed to Order →</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {view === 'grid' && (
                <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px' }}>
                    <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', color: '#111' }}>Our Products</h2>
                    <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 18px' }}>Browse products, add to cart, and place your order.</p>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Loading...</div>
                    ) : !products.length ? (
                        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>No products available at the moment. Please check back soon.</div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(185px,1fr))', gap: 16 }}>
                            {products.map((p) => (
                                <div key={p.id} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                    {p.image_url ? (
                                        <img src={p.image_url} onClick={() => setViewProduct(p)} style={{ width: '100%', height: 150, objectFit: 'cover', cursor: 'pointer' }} alt={p.name} />
                                    ) : (
                                        <div onClick={() => setViewProduct(p)} style={{ width: '100%', height: 110, background: 'linear-gradient(135deg,#f1f5f9,#e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, cursor: 'pointer' }}>📦</div>
                                    )}
                                    <div style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <div onClick={() => setViewProduct(p)} style={{ cursor: 'pointer', flex: 1 }}>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 2, lineHeight: 1.4 }}>{p.name}</div>
                                            {p.model && <div style={{ fontSize: 11, color: '#6b7280' }}>{p.model}</div>}
                                        </div>
                                        <div style={{ marginTop: 8 }}>
                                            <div style={{ fontSize: 18, fontWeight: 800, color: '#1d4ed8' }}>₹{p.price.toLocaleString('en-IN')}</div>
                                            <div style={{ fontSize: 11, color: '#10b981', marginBottom: 8 }}>✅ All taxes included</div>
                                            <button onClick={() => addToCart(p)} style={{ width: '100%', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Add to Cart</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {viewProduct && (
                <div onClick={() => setViewProduct(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>
                    <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, maxWidth: 500, width: '100%', marginTop: 10, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                        {viewProduct.image_url ? (
                            <img src={viewProduct.image_url} style={{ width: '100%', maxHeight: 280, objectFit: 'cover' }} alt={viewProduct.name} />
                        ) : (
                            <div style={{ width: '100%', height: 120, background: 'linear-gradient(135deg,#f1f5f9,#e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52 }}>📦</div>
                        )}
                        <div style={{ padding: 20 }}>
                            <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#111' }}>{viewProduct.name}</h2>
                            {viewProduct.model && <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>Model: {viewProduct.model}{viewProduct.category ? ` | ${viewProduct.category}` : ''}</div>}
                            <div style={{ fontSize: 26, fontWeight: 800, color: '#1d4ed8', marginBottom: 4 }}>₹{viewProduct.price.toLocaleString('en-IN')}</div>
                            <div style={{ fontSize: 12, color: '#10b981', marginBottom: 14 }}>✅ Inclusive of all taxes | 100% Advance Payment</div>
                            {viewProduct.description && <p style={{ fontSize: 13, color: '#475569', margin: '0 0 14px', lineHeight: 1.6 }}>{viewProduct.description}</p>}
                            {!!(viewProduct.features && viewProduct.features.filter(Boolean).length) && (
                                <div style={{ marginBottom: 14 }}>
                                    <b style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>Key Features</b>
                                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                                        {viewProduct.features!.filter(Boolean).map((f, i) => <li key={i} style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>{f}</li>)}
                                    </ul>
                                </div>
                            )}
                            {!!(viewProduct.specifications && Object.keys(viewProduct.specifications).length) && (
                                <div style={{ marginBottom: 16 }}>
                                    <b style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>Specifications</b>
                                    <div style={{ background: '#f8fafc', borderRadius: 8, padding: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
                                        {Object.entries(viewProduct.specifications!).map(([k, v]) => (
                                            <>
                                                <div key={k} style={{ fontSize: 12, color: '#6b7280' }}>{k}</div>
                                                <div key={k + '-v'} style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>{v}</div>
                                            </>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                <button onClick={() => { addToCart(viewProduct); setViewProduct(null); }} style={{ flex: 2, background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 10, padding: 13, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>🛒 Add to Cart</button>
                                <button onClick={() => setViewProduct(null)} style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 10, padding: 13, cursor: 'pointer', fontWeight: 600 }}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {view === 'checkout' && (
                <div style={{ maxWidth: 500, margin: '24px auto 40px', background: '#fff', borderRadius: 14, padding: 22, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 800 }}>Complete Your Order</h3>
                    <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>Enter your details to place the order.</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Full Name *</label>
                            <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', padding: '11px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} placeholder="Enter your full name" />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Mobile Number * (10 digits)</label>
                            <input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} style={{ width: '100%', padding: '11px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} placeholder="e.g. 9876543210" />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Delivery Address *</label>
                            <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} style={{ width: '100%', padding: '11px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'none' }} placeholder="Full address with city and PIN code" />
                        </div>
                        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 12, fontSize: 12, color: '#92400e', lineHeight: 1.7 }}>
                            <b>📋 Order Summary</b><br />
                            {cart.map((c) => (<div key={c.id}>{c.name} ×{c.qty} — ₹{(c.price * c.qty).toLocaleString('en-IN')}</div>))}
                            <b>Total: ₹{Math.round(cartTotal).toLocaleString('en-IN')}</b> (All taxes included)
                        </div>
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 12, fontSize: 12, color: '#166534', lineHeight: 1.7 }}>
                            ⚠️ <b>Payment Note:</b> 100% advance payment required. Our team will contact you within 24 hours with payment instructions.
                        </div>
                        <button onClick={handleSubmitOrder} disabled={submitting} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 10, padding: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', width: '100%', opacity: submitting ? 0.6 : 1 }}>
                            {submitting ? 'Placing Order...' : '✅ Place Order'}
                        </button>
                        <button onClick={() => { setView('grid'); setCartOpen(true); }} style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 10, padding: 10, cursor: 'pointer', width: '100%', fontSize: 13 }}>← Back to Cart</button>
                    </div>
                </div>
            )}

            {view === 'success' && orderResult && (
                <div style={{ maxWidth: 500, margin: '24px auto 40px', background: '#fff', borderRadius: 14, padding: 22, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                    <div style={{ fontSize: 56, marginBottom: 14 }}>🎉</div>
                    <h2 style={{ color: '#10b981', margin: '0 0 8px', fontSize: 22 }}>Order Placed Successfully!</h2>
                    <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 6px' }}>Order No: <b style={{ color: '#111' }}>{orderResult.order_no}</b></p>
                    <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 16px' }}>Total: <b style={{ color: '#1d4ed8', fontSize: 16 }}>₹{Math.round(orderResult.total).toLocaleString('en-IN')}</b></p>
                    <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 14, fontSize: 13, color: '#166534', marginBottom: 16, textAlign: 'left', lineHeight: 1.8 }}>
                        <b>What happens next?</b><br />
                        ✅ Your order has been received.<br />
                        📞 We will contact you within 24 hours on <b>{mobile}</b>.<br />
                        💳 Payment details will be shared via WhatsApp.<br />
                        🚚 Order dispatched after payment confirmation.
                    </div>
                    <p style={{ color: '#9ca3af', fontSize: 12 }}>Thank you for choosing <b>{companyName}</b></p>
                </div>
            )}
        </div>
    );
}