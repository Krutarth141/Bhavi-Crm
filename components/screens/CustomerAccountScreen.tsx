'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Ticket } from '@/types/tickets';
import { SalesOrder, SalesStatus } from '@/types/sales';
import { CustomerSession } from '@/types/customerAccount';
import { fetchCompanyInfo } from '@/services/settingsService';
import {
    signIn, checkMobileForSignup, signUp, resetPin,
    fetchAccountStats, fetchMyTickets, fetchMyOrders,
} from '@/services/customerAccountService';

const SESSION_KEY = 'bea_account_session_v1';

type AuthTab = 'signin' | 'signup' | 'forgot';
type AcctTab = 'tickets' | 'orders';

const TICKET_STATUS_COLORS: Record<string, string> = {
    'Pending Customer Arrival': '#f59e0b',
    'Pending Allocation': '#ef4444',
    'Assigned': '#f59e0b',
    'In Progress': '#3b82f6',
    'Pending Parts': '#d97706',
    'Pending Customer Approval': '#8b5cf6',
    'Customer Approved': '#6366f1',
    'Closed': '#059669',
    'Call Cancel': '#94a3b8',
    'Customer Reject': '#dc2626',
};

const ORDER_STATUS_ORDER: SalesStatus[] = ['inquiry', 'quoted', 'confirmed', 'paid', 'dispatched', 'done'];

const s = {
    page: { minHeight: '100vh', background: '#f4f6fb', display: 'flex', justifyContent: 'center', padding: '0' } as React.CSSProperties,
    card: { width: '100%', maxWidth: 480, minHeight: '100vh', background: '#fff', boxShadow: '0 0 40px rgba(0,0,0,.08)', display: 'flex', flexDirection: 'column' as const },
    header: { background: 'linear-gradient(160deg,#1e3a8a 0%,#1d4ed8 60%,#3b82f6 100%)', color: '#fff', padding: '20px 20px 16px' },
    h1: { fontSize: 18, fontWeight: 900 },
    tagline: { fontSize: 11, opacity: .8, marginTop: 4 },
    badge: { display: 'inline-block', marginTop: 8, background: 'rgba(255,255,255,.18)', borderRadius: 99, padding: '3px 12px', fontSize: 11, fontWeight: 600 },
    body: { flex: 1, padding: '20px 18px', overflowY: 'auto' as const },
    footer: { padding: '14px 18px', borderTop: '1px solid #e2e8f0', background: '#f9fafb', display: 'flex', flexDirection: 'column' as const, gap: 8 },
    tabBar: { display: 'flex', gap: 8, marginBottom: 18 },
    tab: { flex: 1, textAlign: 'center' as const, padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: 'pointer', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b' },
    tabActive: { border: '1.5px solid #1d4ed8', background: '#eff6ff', color: '#1d4ed8' },
    grp: { marginBottom: 14 },
    label: { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: .6 },
    inp: { width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '11px 14px', fontSize: 15, color: '#1e293b', outline: 'none', background: '#fafcff', boxSizing: 'border-box' as const },
    req: { color: '#dc2626' },
    btnPrimary: { width: '100%', background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer' },
    btnOutline: { width: '100%', background: '#fff', color: '#1d4ed8', border: '1.5px solid #3b82f6', borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
    btnDanger: { background: 'none', border: 'none', color: '#dc2626', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 6 },
    err: { color: '#dc2626', fontSize: 13, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px', marginBottom: 10 },
    info: { color: '#1e40af', fontSize: 13, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 12px', marginBottom: 10 },
    pinRow: { display: 'flex', gap: 10 },
    pinBox: { width: 48, height: 52, textAlign: 'center' as const, fontSize: 20, fontWeight: 800, border: '1.5px solid #e2e8f0', borderRadius: 10, background: '#fafcff' },
    statRow: { display: 'flex', gap: 10, marginBottom: 16 },
    stat: { flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 8px', textAlign: 'center' as const },
    statN: { fontSize: 20, fontWeight: 900, color: '#1d4ed8' },
    statL: { fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' as const, marginTop: 2 },
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

function PinInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [digits, setDigits] = useState(['', '', '', '']);
    const refs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (value === '' && digits.some(Boolean)) setDigits(['', '', '', '']);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const setDigit = (idx: number, raw: string) => {
        const d = raw.replace(/\D/g, '').slice(-1);
        const next = [...digits];
        next[idx] = d;
        setDigits(next);
        onChange(next.join(''));
        if (d && idx < 3) refs.current[idx + 1]?.focus();
    };
    const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
            const next = [...digits];
            next[idx - 1] = '';
            setDigits(next);
            onChange(next.join(''));
            refs.current[idx - 1]?.focus();
        }
    };
    return (
        <div style={s.pinRow}>
            {[0, 1, 2, 3].map((idx) => (
                <input
                    key={idx}
                    ref={(el) => { refs.current[idx] = el; }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    autoComplete="new-password"
                    value={digits[idx]}
                    onChange={(e) => setDigit(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    style={s.pinBox}
                />
            ))}
        </div>
    );
}

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

export default function CustomerAccountScreen() {
    const [session, setSessionState] = useState<CustomerSession | null>(null);
    const [checkingSession, setCheckingSession] = useState(true);
    const [authTab, setAuthTab] = useState<AuthTab>('signin');

    const [siMobile, setSiMobile] = useState('');
    const [siPin, setSiPin] = useState('');
    const [siErr, setSiErr] = useState('');
    const [siBusy, setSiBusy] = useState(false);

    const [suMobile, setSuMobile] = useState('');
    const [suFirst, setSuFirst] = useState('');
    const [suLast, setSuLast] = useState('');
    const [suPin, setSuPin] = useState('');
    const [suConfirmPin, setSuConfirmPin] = useState('');
    const [suErr, setSuErr] = useState('');
    const [suBusy, setSuBusy] = useState(false);
    const [suFound, setSuFound] = useState<{ hasPin: boolean; cname?: string } | null>(null);

    const [fpMobile, setFpMobile] = useState('');
    const [fpPin, setFpPin] = useState('');
    const [fpConfirmPin, setFpConfirmPin] = useState('');
    const [fpErr, setFpErr] = useState('');
    const [fpBusy, setFpBusy] = useState(false);

    const [stats, setStats] = useState({ tickets: 0, orders: 0, active: 0 });
    const [acctTab, setAcctTab] = useState<AcctTab>('tickets');
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [orders, setOrders] = useState<SalesOrder[]>([]);
    const [listLoading, setListLoading] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
    const [upiQrUrl, setUpiQrUrl] = useState('');

    useEffect(() => {
        try {
            const raw = localStorage.getItem(SESSION_KEY);
            if (raw) setSessionState(JSON.parse(raw));
        } catch { /* ignore */ }
        setCheckingSession(false);
        fetchCompanyInfo().then((ci) => setUpiQrUrl(ci?.upi_qr_url || ''));
    }, []);

    useEffect(() => {
        if (!session) return;
        fetchAccountStats(session.mobile).then(setStats);
        loadTab('tickets');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    const loadTab = async (tab: AcctTab) => {
        if (!session) return;
        setAcctTab(tab);
        setListLoading(true);
        if (tab === 'tickets') setTickets(await fetchMyTickets(session.mobile));
        else setOrders(await fetchMyOrders(session.mobile));
        setListLoading(false);
    };

    const persistSession = (sess: CustomerSession) => {
        localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
        setSessionState(sess);
    };

    const clearAuthForms = () => {
        setSiMobile(''); setSiPin(''); setSiErr('');
        setSuMobile(''); setSuFirst(''); setSuLast(''); setSuPin(''); setSuConfirmPin(''); setSuErr(''); setSuFound(null);
        setFpMobile(''); setFpPin(''); setFpConfirmPin(''); setFpErr('');
        setAuthTab('signin');
    };

    const doSignOut = () => {
        localStorage.removeItem(SESSION_KEY);
        setSessionState(null);
        clearAuthForms();
    };

    const doSignInSubmit = async () => {
        setSiErr('');
        if (!/^\d{10}$/.test(siMobile)) { setSiErr('Please enter a valid 10-digit mobile number.'); return; }
        if (siPin.length !== 4) { setSiErr('Please enter your 4-digit PIN.'); return; }
        setSiBusy(true);
        const r = await signIn(siMobile, siPin);
        setSiBusy(false);
        if (!r.success || !r.session) { setSiErr(r.error || 'Sign in failed.'); return; }
        persistSession(r.session);
    };

    const handleSuMobileChange = async (raw: string) => {
        const digits = raw.replace(/\D/g, '').slice(0, 10);
        setSuMobile(digits);
        setSuFound(null);
        if (digits.length === 10) {
            const r = await checkMobileForSignup(digits);
            if (r.exists) {
                if (r.cname) {
                    const parts = r.cname.split(' ');
                    setSuFirst(parts[0] || '');
                    setSuLast(parts.slice(1).join(' ') || '');
                }
                setSuFound({ hasPin: r.hasPin, cname: r.cname });
            }
        }
    };

    const doSignUpSubmit = async () => {
        setSuErr('');
        if (!/^\d{10}$/.test(suMobile)) { setSuErr('Please enter a valid 10-digit mobile number.'); return; }
        if (!suFirst.trim()) { setSuErr('Please enter your first name.'); return; }
        if (suPin.length !== 4 || !/^\d{4}$/.test(suPin)) { setSuErr('Please enter a valid 4-digit PIN.'); return; }
        if (suConfirmPin.length !== 4) { setSuErr('Please confirm your PIN in the second box.'); return; }
        if (suPin !== suConfirmPin) { setSuErr('PINs do not match. Please re-enter both PINs.'); return; }
        const cname = `${suFirst} ${suLast}`.trim();
        setSuBusy(true);
        const r = await signUp(suMobile, cname, suPin);
        setSuBusy(false);
        if (!r.success || !r.session) {
            setSuErr(r.error || 'Sign up failed.');
            if (r.error && r.error.includes('already exists')) setAuthTab('signin');
            return;
        }
        persistSession(r.session);
    };

    const doResetPinSubmit = async () => {
        setFpErr('');
        if (!/^\d{10}$/.test(fpMobile)) { setFpErr('Please enter a valid 10-digit mobile number.'); return; }
        if (fpPin.length !== 4 || !/^\d{4}$/.test(fpPin)) { setFpErr('Please enter a valid 4-digit new PIN.'); return; }
        if (fpPin !== fpConfirmPin) { setFpErr('PINs do not match. Please re-enter both PINs.'); return; }
        setFpBusy(true);
        const r = await resetPin(fpMobile, fpPin);
        setFpBusy(false);
        if (!r.success) { setFpErr(r.error || 'Failed to reset PIN.'); return; }
        alert('✅ PIN reset successfully! Please sign in with your new PIN.');
        setSiMobile(fpMobile);
        setAuthTab('signin');
    };

    if (checkingSession) {
        return <div style={s.page}><div style={s.card} /></div>;
    }

    // ================= AUTH =================
    if (!session) {
        return (
            <div style={s.page}><div style={s.card}>
                <div style={s.header}>
                    <div style={s.h1}>Bhavi Electronics &amp; Automation</div>
                    <div style={s.tagline}>Sign in to track your tickets &amp; orders</div>
                </div>
                <div style={s.body}>
                    <div style={s.tabBar}>
                        <div style={{ ...s.tab, ...(authTab === 'signin' ? s.tabActive : {}) }} onClick={() => setAuthTab('signin')}>Sign In</div>
                        <div style={{ ...s.tab, ...(authTab === 'signup' ? s.tabActive : {}) }} onClick={() => setAuthTab('signup')}>New Account</div>
                    </div>

                    {authTab === 'signin' && (
                        <>
                            <div style={s.grp}>
                                <label style={s.label}>Mobile Number <span style={s.req}>*</span></label>
                                <input style={s.inp} type="tel" maxLength={10} placeholder="10 digit mobile" value={siMobile} onChange={(e) => setSiMobile(e.target.value.replace(/\D/g, ''))} />
                            </div>
                            <div style={s.grp}>
                                <label style={s.label}>Your 4-digit PIN <span style={s.req}>*</span></label>
                                <PinInput value={siPin} onChange={setSiPin} />
                            </div>
                            {siErr && <div style={s.err}>{siErr}</div>}
                            <button style={s.btnPrimary} disabled={siBusy} onClick={doSignInSubmit}>{siBusy ? 'Signing in...' : '🔐 Sign In →'}</button>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                                <span style={{ fontSize: 13, color: '#64748b' }}>No account? <button onClick={() => setAuthTab('signup')} style={{ background: 'none', border: 'none', color: '#1d4ed8', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Sign Up</button></span>
                                <button onClick={() => setAuthTab('forgot')} style={{ background: 'none', border: 'none', color: '#d97706', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>🔑 Forgot PIN?</button>
                            </div>
                        </>
                    )}

                    {authTab === 'signup' && (
                        <>
                            <div style={s.grp}>
                                <label style={s.label}>Mobile Number <span style={s.req}>*</span></label>
                                <input style={s.inp} type="tel" maxLength={10} placeholder="10 digit mobile" value={suMobile} onChange={(e) => handleSuMobileChange(e.target.value)} />
                            </div>
                            {suFound && suFound.hasPin && (
                                <div style={s.info}>✅ Account found for this mobile. Please <button onClick={() => setAuthTab('signin')} style={{ background: 'none', border: 'none', color: '#1d4ed8', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Sign In</button> instead.</div>
                            )}
                            {suFound && !suFound.hasPin && (
                                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: 10, fontSize: 12, color: '#166534', marginBottom: 12 }}>✅ <b>{suFound.cname || 'Customer'}</b> — account found! Set a PIN to activate your account.</div>
                            )}
                            {!(suFound && suFound.hasPin) && (
                                <>
                                    <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                                        <div style={{ flex: 1 }}><label style={s.label}>First Name <span style={s.req}>*</span></label><input style={s.inp} value={suFirst} onChange={(e) => setSuFirst(e.target.value)} placeholder="First name" /></div>
                                        <div style={{ flex: 1 }}><label style={s.label}>Last Name</label><input style={s.inp} value={suLast} onChange={(e) => setSuLast(e.target.value)} placeholder="Last name" /></div>
                                    </div>
                                    <div style={s.grp}>
                                        <label style={s.label}>Set 4-digit PIN <span style={s.req}>*</span></label>
                                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Choose a 4-digit PIN to secure your account.</div>
                                        <PinInput value={suPin} onChange={setSuPin} />
                                    </div>
                                    <div style={s.grp}>
                                        <label style={s.label}>Confirm PIN <span style={s.req}>*</span></label>
                                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Re-enter the same PIN to confirm.</div>
                                        <PinInput value={suConfirmPin} onChange={setSuConfirmPin} />
                                    </div>
                                    {suErr && <div style={s.err}>{suErr}</div>}
                                    <button style={s.btnPrimary} disabled={suBusy} onClick={doSignUpSubmit}>{suBusy ? 'Creating...' : '✅ Create Account →'}</button>
                                </>
                            )}
                            <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: '#64748b' }}>Already have an account? <button onClick={() => setAuthTab('signin')} style={{ background: 'none', border: 'none', color: '#1d4ed8', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Sign In</button></div>
                        </>
                    )}

                    {authTab === 'forgot' && (
                        <>
                            <div style={s.info}>🔑 Enter your mobile number and set a new PIN. Your account details remain safe.</div>
                            <div style={s.grp}>
                                <label style={s.label}>Mobile Number <span style={s.req}>*</span></label>
                                <input style={s.inp} type="tel" maxLength={10} placeholder="10 digit mobile" value={fpMobile} onChange={(e) => setFpMobile(e.target.value.replace(/\D/g, ''))} />
                            </div>
                            <div style={s.grp}>
                                <label style={s.label}>New 4-digit PIN <span style={s.req}>*</span></label>
                                <PinInput value={fpPin} onChange={setFpPin} />
                            </div>
                            <div style={s.grp}>
                                <label style={s.label}>Confirm New PIN <span style={s.req}>*</span></label>
                                <PinInput value={fpConfirmPin} onChange={setFpConfirmPin} />
                            </div>
                            {fpErr && <div style={s.err}>{fpErr}</div>}
                            <button style={{ ...s.btnPrimary, background: 'linear-gradient(135deg,#d97706,#b45309)' }} disabled={fpBusy} onClick={doResetPinSubmit}>{fpBusy ? 'Resetting...' : '🔑 Reset PIN →'}</button>
                            <div style={{ textAlign: 'center', marginTop: 12 }}>
                                <button onClick={() => setAuthTab('signin')} style={{ background: 'none', border: 'none', color: '#1d4ed8', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>‹ Back to Sign In</button>
                            </div>
                        </>
                    )}
                </div>
                <div style={{ padding: '14px 18px', textAlign: 'center' }}>
                    <Link href="/service-request" style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 700 }}>‹ Back to Service Request</Link>
                </div>
            </div></div>
        );
    }

    // ================= DASHBOARD =================
    return (
        <div style={s.page}><div style={s.card}>
            <div style={s.header}>
                <div style={s.h1}>👤 {session.name}</div>
                <div style={s.tagline}>Bhavi Electronics &amp; Automation</div>
                <div style={s.badge}>{session.mobile}</div>
            </div>
            <div style={s.body}>
                <div style={s.statRow}>
                    <div style={s.stat}><div style={s.statN}>{stats.tickets}</div><div style={s.statL}>Tickets</div></div>
                    <div style={s.stat}><div style={s.statN}>{stats.orders}</div><div style={s.statL}>Orders</div></div>
                    <div style={s.stat}><div style={s.statN}>{stats.active}</div><div style={s.statL}>Active</div></div>
                </div>
                <div style={s.tabBar}>
                    <div style={{ ...s.tab, ...(acctTab === 'tickets' ? s.tabActive : {}) }} onClick={() => loadTab('tickets')}>🔧 My Tickets</div>
                    <div style={{ ...s.tab, ...(acctTab === 'orders' ? s.tabActive : {}) }} onClick={() => loadTab('orders')}>📦 My Orders</div>
                </div>

                {listLoading && <div style={{ textAlign: 'center', color: '#64748b', padding: 30 }}>Loading...</div>}

                {!listLoading && acctTab === 'tickets' && (
                    tickets.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#64748b', padding: 30, fontSize: 13 }}>
                            No service tickets yet.<br /><br />
                            <Link href="/service-request" style={{ ...s.btnPrimary, width: 'auto', padding: '10px 20px', display: 'inline-block', textDecoration: 'none' }}>Book a Service →</Link>
                        </div>
                    ) : tickets.map((t) => {
                        const clr = TICKET_STATUS_COLORS[t.status] || '#64748b';
                        const isActive = !['Closed', 'Call Cancel', 'Customer Reject'].includes(t.status);
                        return (
                            <div key={t.id} style={s.item} onClick={() => setSelectedTicket(t)}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{t.id}</div>
                                        <div style={{ fontSize: 11, color: '#64748b' }}>{new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                    </div>
                                    <span style={{ background: `${clr}22`, color: clr, borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{t.status}</span>
                                </div>
                                {t.model && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>🖨️ {t.model}{t.serial ? ` · ${t.serial}` : ''}</div>}
                                {t.problem && <div style={{ fontSize: 12, color: '#1e293b', marginBottom: 4 }}>⚠️ {t.problem}</div>}
                                {t.assigned_name && <div style={{ fontSize: 12, color: '#2563eb', fontWeight: 600 }}>👷 Engineer: {t.assigned_name}</div>}
                                {isActive && <div style={{ marginTop: 8, fontSize: 11, color: '#d97706', fontWeight: 600 }}>🔄 In progress — our team will contact you soon</div>}
                                <div style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 700, marginTop: 8, textAlign: 'right' }}>Tap to view details →</div>
                            </div>
                        );
                    })
                )}

                {!listLoading && acctTab === 'orders' && (
                    orders.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#64748b', padding: 30, fontSize: 13 }}>
                            No orders yet.<br /><br />
                            <Link href="/shop" style={{ ...s.btnPrimary, width: 'auto', padding: '10px 20px', display: 'inline-block', textDecoration: 'none' }}>Shop Now →</Link>
                        </div>
                    ) : orders.map((o) => {
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
                    })
                )}
            </div>
            <div style={s.footer}>
                <Link href="/" style={{ ...s.btnOutline, textAlign: 'center', textDecoration: 'none', display: 'block' }}>🏠 Back to Home</Link>
                <button style={s.btnDanger} onClick={doSignOut}>🚪 Sign Out</button>
            </div>

            {selectedTicket && (
                <div style={s.modalOverlay} onClick={() => setSelectedTicket(null)}>
                    <div style={s.modalSheet} onClick={(e) => e.stopPropagation()}>
                        <div style={s.modalHeader}>
                            <button style={s.modalClose} onClick={() => setSelectedTicket(null)}>✕</button>
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', fontWeight: 700, letterSpacing: 1 }}>SERVICE TICKET</div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginTop: 2 }}>{selectedTicket.id}</div>
                            <div style={{ marginTop: 6 }}><span style={{ background: 'rgba(255,255,255,.2)', color: '#fff', border: '1px solid rgba(255,255,255,.3)', borderRadius: 99, padding: '3px 12px', fontSize: 11, fontWeight: 700 }}>{selectedTicket.status}</span></div>
                        </div>
                        <div style={{ padding: '16px 18px 0' }}>
                            <div style={s.detailGrid}>
                                <div style={s.detailBox}><div style={s.detailLbl}>Date</div><div style={s.detailVal}>{new Date(selectedTicket.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div></div>
                                <div style={s.detailBox}><div style={s.detailLbl}>Service</div><div style={s.detailVal}>{selectedTicket.service_type || selectedTicket.call_type || '—'}</div></div>
                                {selectedTicket.model && <div style={s.detailBox}><div style={s.detailLbl}>Model</div><div style={s.detailVal}>{selectedTicket.model}</div></div>}
                                {selectedTicket.serial && <div style={s.detailBox}><div style={s.detailLbl}>Serial</div><div style={s.detailVal}>{selectedTicket.serial}</div></div>}
                                {!!selectedTicket.service_charges && <div style={{ ...s.detailBox, background: '#f0fdf4' }}><div style={s.detailLbl}>Charges</div><div style={{ ...s.detailVal, color: '#1d4ed8' }}>₹{selectedTicket.service_charges}/-</div></div>}
                                {selectedTicket.assigned_name && <div style={{ ...s.detailBox, background: '#eff6ff' }}><div style={s.detailLbl}>Engineer</div><div style={{ ...s.detailVal, color: '#1d4ed8' }}>👷 {selectedTicket.assigned_name}</div></div>}
                            </div>
                            {selectedTicket.problem && (
                                <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', marginBottom: 4 }}>⚠️ Problem Reported</div>
                                    <div style={{ fontSize: 13, color: '#1e293b' }}>{selectedTicket.problem}</div>
                                    {selectedTicket.description && <div style={{ fontSize: 11, color: '#64748b', marginTop: 6, whiteSpace: 'pre-line' }}>{selectedTicket.description}</div>}
                                </div>
                            )}
                            {(selectedTicket.action || selectedTicket.work_done) && (
                                <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#065f46', textTransform: 'uppercase', marginBottom: 4 }}>🔧 Work Done</div>
                                    <div style={{ fontSize: 13, color: '#1e293b' }}>{selectedTicket.action || selectedTicket.work_done}</div>
                                </div>
                            )}
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .6, marginBottom: 6 }}>📋 Activity History</div>
                            {Array.isArray(selectedTicket.timeline) && selectedTicket.timeline.length > 0 ? (
                                selectedTicket.timeline.slice().reverse().map((ev: any, idx: number) => (
                                    <div key={idx} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{ev.action || ''}</div>
                                        {ev.note && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{ev.note}</div>}
                                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>{ev.by || ''}{ev.at ? ` · ${new Date(ev.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}</div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ fontSize: 12, color: '#64748b', padding: '8px 0' }}>No activity recorded yet.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

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