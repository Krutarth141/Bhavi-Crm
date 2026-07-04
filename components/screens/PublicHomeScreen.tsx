'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMasters } from '@/hooks/useMasters';

const SERVICE_CARDS = [
    { icon: '🖨️', name: 'Printer Repair', price: '₹649/-', href: '/service-request' },
    { icon: '🖻', name: 'Scanner Service', price: '₹649/-', href: '/service-request' },
    { icon: '📷', name: 'Camera Repair', price: '₹1500+', href: '/service-request' },
    { icon: '📋', name: 'Printer AMC', price: '₹5000+', href: '/service-request' },
    { icon: '🏠', name: 'Home Automation', price: '₹3000+', href: '/service-request' },
    { icon: '📹', name: 'CCTV Install', price: '₹2500+', href: '/service-request' },
];

type CartItem = {
    id: string;
    name: string;
    price: number;
    brand?: string;
    model?: string;
};

export default function PublicHomeScreen() {
    const { models, brands, loading } = useMasters();
    const [activeTab, setActiveTab] = useState<'services' | 'shop'>('services');
    const [cart, setCart] = useState<CartItem[]>([]);

    const products = useMemo(() => {
        return models.slice(0, 8).map((model) => ({
            id: model.id,
            name: model.model_name || model.model_no,
            price: Number(model.sale_price || 0),
            brand: model.brand?.name || brands.find((brand) => brand.id === model.brand_id)?.name,
            model: model.model_no,
        }));
    }, [models, brands]);

    const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

    const addToCart = (item: CartItem) => {
        setCart((prev) => [...prev, item]);
        setActiveTab('shop');
    };

    const removeFromCart = (id: string) => {
        setCart((prev) => prev.filter((item) => item.id !== id));
    };

    const whatsappCheckout = () => {
        const summary = cart.map((item) => `• ${item.name} - ${item.price ? `₹${item.price}` : 'Price on request'}`).join('\n');
        const text = `Hello Bhavi Electronics, I would like to order:\n\n${summary || 'No items selected'}\n\nTotal: ₹${cartTotal}`;
        window.open(`https://wa.me/919574004969?text=${encodeURIComponent(text)}`, '_blank');
    };

    return (
        <div style={styles.page}>
            <div style={styles.shell}>
                <header style={styles.hero}>
                    <div style={styles.heroTopRow}>
                        <div>
                            <div style={styles.kicker}>Bhavi Electronics &amp; Automation</div>
                            <h1 style={styles.title}>Service, check-in, and shop in one place.</h1>
                            <p style={styles.subtitle}>Printers, cameras, home automation, CCTV, and on-site support handled with the same CRM workflow your team already uses.</p>
                        </div>
                        <div style={styles.heroBadge}>CRM</div>
                    </div>

                    <div style={styles.ctaRow}>
                        <Link href="/service-request" style={styles.primaryCta}>Book a Service</Link>
                        <Link href="/walk-in" style={styles.secondaryCta}>Customer Check-in</Link>
                    </div>

                    <div style={styles.contactRow}>
                        <span style={styles.contactIcon}>📞</span>
                        <div>
                            <div style={styles.contactLabel}>Need help now?</div>
                            <a href="tel:+919574004969" style={styles.contactValue}>+91 9574004969</a>
                        </div>
                    </div>
                </header>

                <section style={styles.section}>
                    <div style={styles.sectionHeader}>
                        <h2 style={styles.sectionTitle}>Our Services</h2>
                        <span style={styles.sectionMeta}>Fast booking</span>
                    </div>

                    <div style={styles.serviceGrid}>
                        {SERVICE_CARDS.map((service) => (
                            <Link key={service.name} href={service.href} style={styles.serviceCard}>
                                <div style={styles.serviceIcon}>{service.icon}</div>
                                <div style={styles.serviceName}>{service.name}</div>
                                <div style={styles.servicePrice}>{service.price}</div>
                            </Link>
                        ))}
                    </div>
                </section>

                <section style={styles.section}>
                    <div style={styles.sectionHeader}>
                        <h2 style={styles.sectionTitle}>Shop</h2>
                        <button type="button" onClick={() => setActiveTab('shop')} style={styles.textButton}>Browse products</button>
                    </div>

                    <div style={styles.quickLinks}>
                        <Link href="/account" style={styles.quickLink}>My Account</Link>
                        <Link href="/my-orders" style={styles.quickLink}>My Orders</Link>
                        <Link href="/service-request" style={styles.quickLink}>Service Flow</Link>
                        <Link href="/walk-in" style={styles.quickLink}>Walk-in Check-in</Link>
                    </div>

                    <div style={styles.tabBar}>
                        <button type="button" onClick={() => setActiveTab('services')} style={{ ...styles.tab, ...(activeTab === 'services' ? styles.tabActive : {}) }}>Services</button>
                        <button type="button" onClick={() => setActiveTab('shop')} style={{ ...styles.tab, ...(activeTab === 'shop' ? styles.tabActive : {}) }}>Products</button>
                    </div>

                    {activeTab === 'shop' && (
                        <>
                            {cart.length > 0 && (
                                <div style={styles.cartBar}>
                                    <div>
                                        <div style={styles.cartMeta}>{cart.length} item{cart.length > 1 ? 's' : ''}</div>
                                        <div style={styles.cartTotal}>₹{cartTotal}</div>
                                    </div>
                                    <button type="button" onClick={whatsappCheckout} style={styles.checkoutButton}>Order on WhatsApp</button>
                                </div>
                            )}

                            <div style={styles.productGrid}>
                                {loading ? (
                                    <div style={styles.emptyState}>Loading products...</div>
                                ) : products.length > 0 ? (
                                    products.map((product) => {
                                        const isInCart = cart.some((item) => item.id === product.id);
                                        return (
                                            <article key={product.id} style={styles.productCard}>
                                                <div style={styles.productBrand}>{product.brand || 'Product'}</div>
                                                <div style={styles.productName}>{product.name}</div>
                                                <div style={styles.productModel}>{product.model}</div>
                                                <div style={styles.productPrice}>{product.price ? `₹${product.price}` : 'Price on request'}</div>
                                                <button type="button" onClick={() => (isInCart ? removeFromCart(product.id) : addToCart(product))} style={{ ...styles.productButton, ...(isInCart ? styles.productButtonAlt : {}) }}>
                                                    {isInCart ? 'Remove' : 'Add to Cart'}
                                                </button>
                                            </article>
                                        );
                                    })
                                ) : (
                                    <div style={styles.emptyState}>Product catalog will appear here once master data is available.</div>
                                )}
                            </div>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    page: {
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0f172a 0%, #eaf2ff 24%, #f7f9fc 100%)',
        padding: '24px 16px 40px',
    },
    shell: {
        maxWidth: 1120,
        margin: '0 auto',
    },
    hero: {
        color: '#fff',
        background: 'linear-gradient(135deg, #102a5c 0%, #1d4ed8 55%, #56a0ff 100%)',
        borderRadius: 24,
        padding: 24,
        boxShadow: '0 24px 80px rgba(15, 23, 42, 0.24)',
    },
    heroTopRow: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        alignItems: 'flex-start',
    },
    kicker: { fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.75, marginBottom: 10 },
    title: { fontSize: 42, lineHeight: 1.02, margin: 0, maxWidth: 720 },
    subtitle: { marginTop: 14, maxWidth: 720, color: 'rgba(255,255,255,0.82)', fontSize: 16, lineHeight: 1.7 },
    heroBadge: {
        minWidth: 76,
        height: 76,
        borderRadius: 20,
        background: 'rgba(255,255,255,0.16)',
        display: 'grid',
        placeItems: 'center',
        fontWeight: 800,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
    },
    ctaRow: { display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 22 },
    primaryCta: { background: '#fff', color: '#12386d', padding: '12px 18px', borderRadius: 14, fontWeight: 800, textDecoration: 'none' },
    secondaryCta: { background: 'rgba(255,255,255,0.12)', color: '#fff', padding: '12px 18px', borderRadius: 14, fontWeight: 800, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)' },
    contactRow: {
        marginTop: 18,
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        background: 'rgba(255,255,255,0.08)',
        padding: 14,
        borderRadius: 18,
        width: 'fit-content',
    },
    contactIcon: { fontSize: 22 },
    contactLabel: { fontSize: 12, opacity: 0.78, textTransform: 'uppercase', letterSpacing: '0.08em' },
    contactValue: { color: '#fff', fontSize: 18, fontWeight: 800, textDecoration: 'none' },
    section: { marginTop: 22, background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(148,163,184,0.18)', borderRadius: 24, padding: 18, boxShadow: '0 18px 50px rgba(15, 23, 42, 0.08)' },
    sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 14 },
    sectionTitle: { margin: 0, fontSize: 20, color: '#0f172a' },
    sectionMeta: { color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em' },
    textButton: { border: 'none', background: 'none', color: '#1d4ed8', fontWeight: 800, cursor: 'pointer' },
    serviceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 },
    serviceCard: { textDecoration: 'none', color: '#0f172a', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 16, transition: 'transform 0.18s ease, box-shadow 0.18s ease' },
    serviceIcon: { fontSize: 28, marginBottom: 10 },
    serviceName: { fontWeight: 800, marginBottom: 4 },
    servicePrice: { color: '#0f766e', fontWeight: 700, fontSize: 13 },
    tabBar: { display: 'flex', gap: 6, background: '#eef4ff', padding: 4, borderRadius: 16, width: 'fit-content', marginBottom: 14 },
    tab: { border: 'none', background: 'transparent', padding: '10px 16px', borderRadius: 12, fontWeight: 800, cursor: 'pointer', color: '#64748b' },
    tabActive: { background: '#fff', color: '#1d4ed8', boxShadow: '0 8px 22px rgba(29, 78, 216, 0.12)' },
    quickLinks: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 },
    quickLink: { textDecoration: 'none', color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '8px 12px', borderRadius: 999, fontWeight: 800, fontSize: 12 },
    cartBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, background: '#102a5c', color: '#fff', borderRadius: 18, padding: 14, marginBottom: 14 },
    cartMeta: { fontSize: 12, opacity: 0.75 },
    cartTotal: { fontSize: 22, fontWeight: 900 },
    checkoutButton: { border: 'none', background: '#f59e0b', color: '#fff', borderRadius: 12, padding: '10px 16px', fontWeight: 900, cursor: 'pointer' },
    productGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
    productCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 },
    productBrand: { color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em' },
    productName: { fontSize: 18, fontWeight: 900, color: '#0f172a' },
    productModel: { color: '#475569', fontSize: 13 },
    productPrice: { fontSize: 18, fontWeight: 900, color: '#1d4ed8' },
    productButton: { marginTop: 'auto', border: 'none', background: '#1d4ed8', color: '#fff', padding: '10px 14px', borderRadius: 12, fontWeight: 800, cursor: 'pointer' },
    productButtonAlt: { background: '#0f172a' },
    emptyState: { padding: 24, textAlign: 'center', color: '#64748b' },
};