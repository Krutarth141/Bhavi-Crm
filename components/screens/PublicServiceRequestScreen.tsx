'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useMasters } from '@/hooks/useMasters';
import { searchPincodes, PincodeMatch } from '@/services/walkInService';
import { checkCustomerByMobile, saveCustomerRecord, submitRepairTicket, submitInquiry } from '@/services/bookingPortalService';
import { SERVICES, SERVICE_ORDER, TL, INDIAN_STATES, PROBLEM_OPTIONS, Lang, RepairType, WarrantyType, ExistingCustomer } from '@/types/bookingPortal';

type Step = 'home' | 'repair-type' | 'service-info' | 'terms' | 'lang' | 'mobile' | 'customer' | 'warranty' | 'warranty-info' | 'product' | 'inquiry' | 'sign' | 'success';

const s = {
    page: { minHeight: '100vh', background: '#f4f6fb', display: 'flex', justifyContent: 'center', padding: '0' } as React.CSSProperties,
    card: { width: '100%', maxWidth: 480, minHeight: '100vh', background: '#fff', boxShadow: '0 0 40px rgba(0,0,0,.08)', display: 'flex', flexDirection: 'column' as const },
    header: { background: 'linear-gradient(160deg,#1e3a8a 0%,#1d4ed8 60%,#3b82f6 100%)', color: '#fff', padding: '20px 20px 16px', textAlign: 'center' as const },
    headerGreen: { background: 'linear-gradient(160deg,#065f46,#059669)', color: '#fff', padding: '20px 20px 16px', textAlign: 'center' as const },
    h1: { fontSize: 16, fontWeight: 800 },
    tagline: { fontSize: 10, opacity: .75, marginTop: 2, letterSpacing: .4 },
    badge: { display: 'inline-block', marginTop: 8, background: 'rgba(255,255,255,.18)', borderRadius: 99, padding: '3px 12px', fontSize: 11, fontWeight: 600 },
    body: { flex: 1, padding: '20px 18px', overflowY: 'auto' as const },
    footer: { padding: '14px 18px', borderTop: '1px solid #e2e8f0', background: '#f9fafb' },
    back: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 16 },
    sectionTitle: { fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: .8, marginBottom: 14, textAlign: 'center' as const },
    grp: { marginBottom: 14 },
    label: { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: .6 },
    inp: { width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '11px 14px', fontSize: 15, color: '#1e293b', outline: 'none', background: '#fafcff', boxSizing: 'border-box' as const },
    row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
    req: { color: '#dc2626' },
    btnPrimary: { width: '100%', background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer' },
    btnOutline: { width: '100%', background: '#fff', color: '#1d4ed8', border: '1.5px solid #3b82f6', borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 10 },
    err: { color: '#dc2626', fontSize: 13, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px', marginBottom: 10 },
    info: { color: '#1e40af', fontSize: 13, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 12px', marginBottom: 10 },
    card2: { background: '#fff', border: '2px solid #e2e8f0', borderRadius: 14, padding: 18, marginBottom: 12, cursor: 'pointer' },
    svcGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
    svcCard: { background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: '16px 12px', textAlign: 'center' as const, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.05)' },
};

export default function PublicServiceRequestScreen() {
    const { models } = useMasters();

    const [step, setStep] = useState<Step>('home');
    const [serviceId, setServiceId] = useState('');
    const svc = serviceId ? SERVICES[serviceId] : null;

    const [repairType, setRepairType] = useState<RepairType | ''>('');
    const [agree, setAgree] = useState(false);
    const [agreeErr, setAgreeErr] = useState(false);

    const [lang, setLang] = useState<Lang>('en');
    const t = (k: string) => TL[lang][k] || TL.en[k] || k;

    const [mobile, setMobile] = useState('');
    const [mobileErr, setMobileErr] = useState('');
    const [checkingMobile, setCheckingMobile] = useState(false);
    const [foundMsg, setFoundMsg] = useState('');
    const [existingCust, setExistingCust] = useState<ExistingCustomer | null>(null);
    const [isNew, setIsNew] = useState(false);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [altMobile, setAltMobile] = useState('');
    const [addr1, setAddr1] = useState('');
    const [addr2, setAddr2] = useState('');
    const [custState, setCustState] = useState('');
    const [pin, setPin] = useState('');
    const [area, setArea] = useState('');
    const [city, setCity] = useState('');
    const [pinResults, setPinResults] = useState<PincodeMatch[]>([]);
    const [showPinDrop, setShowPinDrop] = useState(false);
    const [custErr, setCustErr] = useState('');

    const [warrantyType, setWarrantyType] = useState<WarrantyType | ''>('');

    const [modelQuery, setModelQuery] = useState('');
    const [modelDrop, setModelDrop] = useState(false);
    const [serialNo, setSerialNo] = useState('');
    const [problem, setProblem] = useState('');
    const [remarks, setRemarks] = useState('');
    const [prodErr, setProdErr] = useState('');

    const [inqValues, setInqValues] = useState<Record<string, string>>({});
    const [inqRemarks, setInqRemarks] = useState('');
    const [inqErr, setInqErr] = useState('');

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const signEmpty = useRef(true);
    const drawing = useRef(false);
    const [signHint, setSignHint] = useState(true);
    const [signErr, setSignErr] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [resultId, setResultId] = useState('');
    const [createdAt, setCreatedAt] = useState('');
    const [successErr, setSuccessErr] = useState('');

    const goTop = (fn: () => void) => { fn(); window.scrollTo(0, 0); };

    // ---- Home / service select ----
    const selectService = (id: string) => {
        setServiceId(id);
        const sv = SERVICES[id];
        if (sv.type === 'repair') goTop(() => setStep('repair-type'));
        else goTop(() => setStep('service-info'));
    };

    const selectRepairType = (type: RepairType) => {
        setRepairType(type);
        setAgree(false);
        setAgreeErr(false);
        goTop(() => setStep('terms'));
    };

    const proceedAfterTerms = () => {
        if (!agree) { setAgreeErr(true); return; }
        goTop(() => setStep('lang'));
    };

    const chooseLang = (l: Lang) => {
        setLang(l);
        goTop(() => setStep('mobile'));
    };

    // ---- Mobile check ----
    const checkMobile = async () => {
        setMobileErr(''); setFoundMsg('');
        if (!/^\d{10}$/.test(mobile)) { setMobileErr('Please enter a valid 10-digit mobile number.'); return; }
        setCheckingMobile(true);
        try {
            const c = await checkCustomerByMobile(mobile);
            if (c) {
                setExistingCust(c); setIsNew(false);
                setFoundMsg(`👋 ${c.cname || 'Customer'} — customer found! Proceeding...`);
                setTimeout(() => goTop(() => setStep(svc?.type === 'repair' ? 'warranty' : 'inquiry')), 1000);
            } else {
                setExistingCust(null); setIsNew(true);
                setTimeout(() => goTop(() => setStep('customer')), 500);
            }
        } catch (e: any) { setMobileErr('Error: ' + e.message); }
        setCheckingMobile(false);
    };

    // ---- PIN autocomplete ----
    const pinTimer = useRef<any>(null);
    const onPinInput = (val: string) => {
        setPin(val);
        clearTimeout(pinTimer.current);
        if (!val.trim()) { setShowPinDrop(false); return; }
        pinTimer.current = setTimeout(async () => {
            const rows = await searchPincodes(val, custState);
            setPinResults(rows);
            setShowPinDrop(rows.length > 0);
        }, 200);
    };
    const pickPin = (row: PincodeMatch) => {
        setPin(row.pincode); setArea(row.area || ''); setShowPinDrop(false);
    };

    // ---- Customer submit ----
    const submitCustomer = () => {
        setCustErr('');
        if (!firstName.trim()) { setCustErr('Please enter first name.'); return; }
        if (!lastName.trim()) { setCustErr('Please enter last name.'); return; }
        if (!addr1.trim()) { setCustErr('Please enter Address Line 1.'); return; }
        if (!pin || pin.length < 5) { setCustErr('Please select a valid pin code.'); return; }
        if (!city.trim()) { setCustErr('Please enter city.'); return; }
        if (!custState) { setCustErr('Please select state.'); return; }
        goTop(() => setStep(svc?.type === 'repair' ? 'warranty' : 'inquiry'));
    };

    // ---- Warranty ----
    const selectWarranty = (type: WarrantyType) => {
        setWarrantyType(type);
        if (type === 'warranty') goTop(() => setStep('warranty-info'));
        else goTop(() => setStep('product'));
    };

    // ---- Model search ----
    const modelMatches = useMemo(() => {
        const q = modelQuery.trim().toLowerCase();
        if (q.length < 2) return [];
        return models.filter(m => (m.model_no || '').toLowerCase().includes(q) || (m.model_name || '').toLowerCase().includes(q)).slice(0, 10);
    }, [modelQuery, models]);

    // ---- Go to sign / submit inquiry directly ----
    const goToSign = async () => {
        if (svc?.type === 'repair') {
            setProdErr('');
            if (!modelQuery.trim()) { setProdErr('Please enter model number.'); return; }
            if (!problem) { setProdErr('Please select the problem.'); return; }
            goTop(() => setStep('sign'));
        } else {
            setInqErr('');
            if (!inqRemarks.trim()) { setInqErr('Please add remarks / describe your requirement.'); return; }
            await doSubmit();
        }
    };

    // ---- Signature canvas ----
    useEffect(() => {
        if (step !== 'sign') return;
        const c = canvasRef.current; if (!c) return;
        c.width = c.offsetWidth || 420; c.height = 200;
        const ctx = c.getContext('2d'); if (!ctx) return;
        ctx.strokeStyle = '#1a3fa8'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        signEmpty.current = true; setSignHint(true);
        const pos = (clientX: number, clientY: number) => {
            const r = c.getBoundingClientRect();
            return { x: (clientX - r.left) * (c.width / r.width), y: (clientY - r.top) * (c.height / r.height) };
        };
        const down = (x: number, y: number) => { drawing.current = true; ctx.beginPath(); ctx.moveTo(x, y); };
        const move = (x: number, y: number) => { if (!drawing.current) return; ctx.lineTo(x, y); ctx.stroke(); signEmpty.current = false; setSignHint(false); };
        const up = () => { drawing.current = false; };
        c.onmousedown = (e) => { const p = pos(e.clientX, e.clientY); down(p.x, p.y); };
        c.onmousemove = (e) => { const p = pos(e.clientX, e.clientY); move(p.x, p.y); };
        c.onmouseup = up; c.onmouseleave = up;
        c.ontouchstart = (e) => { e.preventDefault(); const t0 = e.touches[0]; const p = pos(t0.clientX, t0.clientY); down(p.x, p.y); };
        c.ontouchmove = (e) => { e.preventDefault(); const t0 = e.touches[0]; const p = pos(t0.clientX, t0.clientY); move(p.x, p.y); };
        c.ontouchend = up;
    }, [step]);

    const clearSign = () => {
        const c = canvasRef.current; const ctx = c?.getContext('2d');
        if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
        signEmpty.current = true; setSignHint(true);
    };

    // ---- Submit ----
    const doSubmit = async () => {
        setSignErr(''); setSuccessErr('');
        let signatureB64 = '';
        if (svc?.type === 'repair') {
            if (signEmpty.current) { setSignErr('Please sign before submitting.'); return; }
            signatureB64 = canvasRef.current?.toDataURL('image/png') || '';
        }
        setSubmitting(true);
        try {
            const custName = isNew ? `${firstName} ${lastName}` : (existingCust?.cname || 'Customer');
            const finalAddr = isNew ? `${addr1}${addr2 ? ', ' + addr2 : ''}` : (existingCust?.address || '');
            const finalCity = isNew ? city : (existingCust?.city || '');
            const finalPin = isNew ? pin : (existingCust?.pin || '');
            const finalState = isNew ? custState : (existingCust?.state || '');
            const finalAlt = isNew ? altMobile : (existingCust?.alt_mobile || '');
            const now = new Date();
            const createdAtStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

            if (isNew) {
                await saveCustomerRecord({ cname: custName, mobile, altMobile: finalAlt, address: finalAddr, city: finalCity, pin: finalPin, state: finalState });
            }

            if (!svc) throw new Error('No service selected');

            if (svc.type === 'repair') {
                const r = await submitRepairTicket({
                    svc, repairType: repairType as RepairType, custName, mobile, altMobile: finalAlt,
                    address: finalAddr, city: finalCity, pin: finalPin, state: finalState,
                    modelNo: modelQuery.trim(), serialNo, warrantyType, problem, remarks, signatureB64,
                });
                if (!r.success || !r.id) throw new Error(r.error || 'Failed to create ticket');
                setResultId(r.id); setCreatedAt(createdAtStr);
            } else {
                const r = await submitInquiry({ svc, custName, mobile, address: finalAddr, city: finalCity, state: finalState, fieldValues: inqValues, remarks: inqRemarks });
                if (!r.success) throw new Error(r.error || 'Failed to submit inquiry');
                setResultId(`INQ-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`);
                setCreatedAt(createdAtStr);
            }
            goTop(() => setStep('success'));
        } catch (e: any) {
            if (svc?.type === 'repair') setSignErr('Error: ' + e.message);
            else setInqErr('Error: ' + e.message);
        }
        setSubmitting(false);
    };

    // ---- Print job sheet ----
    const printDoc = () => {
        if (!svc) return;
        const isCarryIn = repairType === 'carry-in';
        const charges = isCarryIn ? 413 : 649;
        const custName = isNew ? `${firstName} ${lastName}` : (existingCust?.cname || 'Customer');
        const finalAddr = isNew ? `${addr1}${addr2 ? ', ' + addr2 : ''}` : (existingCust?.address || '');
        const finalCity = isNew ? city : (existingCust?.city || '');
        const finalPin = isNew ? pin : (existingCust?.pin || '');
        const finalState = isNew ? custState : (existingCust?.state || '');
        const sigData = canvasRef.current?.toDataURL('image/png') || '';
        const win = window.open('', '_blank', 'width=750,height=900');
        if (!win) return;
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Job Sheet ${resultId}</title>
<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;font-size:12px;color:#1e293b;}
.page{max-width:700px;margin:0 auto;padding:20px;}
.hdr{text-align:center;border-bottom:3px solid #1a3fa8;padding-bottom:14px;margin-bottom:14px;}
.hdr h1{font-size:18px;font-weight:900;color:#1a3fa8;}
.js-no{font-size:22px;font-weight:900;color:#dc2626;border:2px dashed #dc2626;display:inline-block;padding:4px 16px;border-radius:8px;margin-top:8px;}
.sec h3{font-size:11px;font-weight:700;color:#fff;background:#1a3fa8;padding:4px 10px;border-radius:4px;text-transform:uppercase;margin:12px 0 8px;}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:6px;}
.f{border:1px solid #e2e8f0;border-radius:6px;padding:6px 10px;}
.f .fl{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;}
.f .fv{font-size:13px;font-weight:600;color:#1e293b;margin-top:1px;}
.sign-area{border:2px solid #1a3fa8;border-radius:8px;padding:10px;text-align:center;min-height:80px;}
.sign-area img{max-height:80px;max-width:100%;}
.footer-note{border-top:2px solid #e2e8f0;margin-top:14px;padding-top:10px;font-size:10px;color:#64748b;text-align:center;line-height:1.6;}
</style></head><body><div class="page">
<div class="hdr"><h1>BHAVI ELECTRONICS &amp; AUTOMATION</h1>
<div style="font-size:13px;font-weight:700;color:#1a3fa8;margin-top:8px;">🛠️ SERVICE REQUEST JOB SHEET</div>
<div class="js-no">${resultId}</div>
<div style="font-size:11px;color:#64748b;margin-top:6px;">Date: ${createdAt}</div></div>
<div class="sec"><h3>Customer Details</h3><div class="grid2">
<div class="f"><div class="fl">Name</div><div class="fv">${custName}</div></div>
<div class="f"><div class="fl">Mobile</div><div class="fv">${mobile}</div></div>
<div class="f" style="grid-column:1/-1"><div class="fl">Address</div><div class="fv">${finalAddr}${finalCity ? ', ' + finalCity : ''}${finalPin ? ' - ' + finalPin : ''}${finalState ? ', ' + finalState : ''}</div></div>
</div></div>
<div class="sec"><h3>Product Details</h3><div class="grid2">
<div class="f"><div class="fl">Service</div><div class="fv">${svc.name}</div></div>
<div class="f"><div class="fl">${isCarryIn ? 'Service Charges (Carry In)' : 'Visit Charges (Onsite)'}</div><div class="fv" style="color:#dc2626;font-weight:800;">Rs. ${charges}/- (Non-Refundable)</div></div>
<div class="f"><div class="fl">Model Number</div><div class="fv">${modelQuery}</div></div>
<div class="f"><div class="fl">Serial Number</div><div class="fv">${serialNo || '—'}</div></div>
<div class="f" style="grid-column:1/-1"><div class="fl">Problem</div><div class="fv">${problem}</div></div>
</div></div>
<div class="sec"><h3>Customer Signature</h3><div class="sign-area">${sigData ? `<img src="${sigData}">` : '<div style="color:#94a3b8;padding-top:20px;">Not captured</div>'}</div></div>
<div class="footer-note"><b>BHAVI ELECTRONICS &amp; AUTOMATION</b> | 📞 +91 9574004969<br>Job Sheet: <b>${resultId}</b></div>
</div></body></html>`;
        win.document.open(); win.document.write(html); win.document.close();
        win.onload = () => win.print();
    };

    // ================= RENDER =================

    if (step === 'home') {
        return (
            <div style={s.page}><div style={s.card}>
                <div style={s.header}>
                    <div style={s.h1}>Bhavi Electronics &amp; Automation</div>
                    <div style={s.tagline}>WHERE CUSTOMER DELIGHT IS FIRST</div>
                </div>
                <div style={s.body}>
                    <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>Our Services</div>
                    <div style={s.svcGrid}>
                        {SERVICE_ORDER.map(id => {
                            const sv = SERVICES[id];
                            return (
                                <div key={id} style={s.svcCard} onClick={() => selectService(id)}>
                                    <span style={{ fontSize: 30, marginBottom: 8, display: 'block' }}>{sv.icon}</span>
                                    <div style={{ fontSize: 13, fontWeight: 800 }}>{sv.name}</div>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: sv.type === 'repair' ? '#059669' : '#d97706' }}>{sv.price}</div>
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ marginTop: 16, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 22 }}>📞</span>
                        <div><div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Need Help? Call Us</div>
                            <a href="tel:+919574004969" style={{ fontSize: 15, fontWeight: 800, color: '#1d4ed8', textDecoration: 'none' }}>+91 9574004969</a></div>
                    </div>
                    <div style={{ marginTop: 12, textAlign: 'center' }}><Link href="/shop" style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 700 }}>🛍️ Visit our Shop</Link></div>
                </div>
            </div></div>
        );
    }

    if (step === 'repair-type' && svc) {
        return (
            <div style={s.page}><div style={s.card}>
                <div style={s.header}><div style={s.h1}>Choose Service Type</div><div style={s.badge}>{svc.icon} {svc.name}</div></div>
                <div style={s.body}>
                    <button style={s.back} onClick={() => setStep('home')}>‹ Back to Services</button>
                    <div style={s.sectionTitle}>How would you like service?</div>
                    <div style={s.card2} onClick={() => selectRepairType('onsite')}>
                        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>🏠 Onsite Visit</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: '#059669', marginBottom: 6 }}>₹649<span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>/- Visit Charges</span></div>
                        <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>✅ Engineer visits your home or office<br />✅ Service within <b>24 working hours</b><br />✅ No need to carry your device</div>
                    </div>
                    <div style={s.card2} onClick={() => selectRepairType('carry-in')}>
                        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>🏪 Carry In</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: '#d97706', marginBottom: 6 }}>₹413<span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>/- Service Charges</span></div>
                        <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>✅ Bring device to our office<br />✅ Repair in <b>2–3 working days</b><br />✅ Lower cost option</div>
                    </div>
                    <div style={s.info}>💡 Both services include a detailed diagnosis. Additional spare parts or repair charges will be quoted separately before any work begins.</div>
                </div>
            </div></div>
        );
    }

    if (step === 'service-info' && svc) {
        return (
            <div style={s.page}><div style={s.card}>
                <div style={s.header}><div style={s.h1}>Service Details</div><div style={s.badge}>{svc.price}</div></div>
                <div style={s.body}>
                    <button style={s.back} onClick={() => setStep('home')}>‹ Back to Services</button>
                    <div style={{ background: 'linear-gradient(135deg,#f8fafc,#eff6ff)', border: '1.5px solid #bfdbfe', borderRadius: 14, padding: 20, marginBottom: 16, textAlign: 'center' }}>
                        <div style={{ fontSize: 44, marginBottom: 10 }}>{svc.icon}</div>
                        <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1d4ed8', marginBottom: 4 }}>{svc.name}</h2>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#d97706', marginBottom: 12 }}>{svc.price}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{svc.sub}</div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 10 }}>What&apos;s Included</div>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {(svc.includes || []).map((i, idx) => <li key={idx} style={{ fontSize: 13, padding: '6px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 8 }}>✅ {i}</li>)}
                    </ul>
                    <div style={s.info}>💡 <b>No obligation.</b> Our team will review your inquiry and contact you with a detailed quotation before any work begins.</div>
                </div>
                <div style={s.footer}><button style={s.btnPrimary} onClick={() => setStep('lang')}>I&apos;m Interested — Proceed →</button></div>
            </div></div>
        );
    }

    if (step === 'terms' && svc) {
        const isCarryIn = repairType === 'carry-in';
        const charges = isCarryIn ? 413 : 649;
        return (
            <div style={s.page}><div style={s.card}>
                <div style={s.header}><div style={s.h1}>Terms &amp; Conditions</div><div style={s.badge}>Please Read Carefully</div></div>
                <div style={s.body}>
                    <button style={s.back} onClick={() => setStep('repair-type')}>‹ Back</button>
                    <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: 16, marginBottom: 16 }}>
                        <h3 style={{ fontSize: 12, fontWeight: 800, color: '#1d4ed8', textAlign: 'center', marginBottom: 12, paddingBottom: 10, borderBottom: '2px solid #e2e8f0' }}>📋 Service Terms &amp; Conditions</h3>
                        {isCarryIn ? (
                            <>
                                <TermItem n={1} b={`Carry In Service Charges: Rs. ${charges}/- (Non-Refundable)`} text="Payable at our office when you drop your device." />
                                <TermItem n={2} b="Spare Parts & Additional Charges" text="If your product requires spare parts, our technician will provide a written estimate." />
                                <TermItem n={3} b="Repair Estimate Not Accepted" text={`If the estimate isn't acceptable, the Rs. ${charges}/- charge remains payable and non-refundable.`} />
                                <TermItem n={4} b="Carry In Service Scope & Timing" text="Repair completed within 2–3 working days. Bhavi Electronics & Automation | +91 9574004969" />
                            </>
                        ) : (
                            <>
                                <TermItem n={1} b={`Engineer Visit Charges: Rs. ${charges}/- (Non-Refundable)`} text="Payable directly to the engineer upon arrival." />
                                <TermItem n={2} b="Spare Parts & Additional Charges" text="If your product requires spare parts, the engineer will provide a written estimate." />
                                <TermItem n={3} b="Repair Estimate Not Accepted" text={`If the estimate isn't acceptable, the Rs. ${charges}/- charge remains payable and non-refundable.`} />
                                <TermItem n={4} b="Service Scope & Timing" text="Engineer attends within 24 working hours." />
                            </>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 14, background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 12, marginBottom: 14, cursor: 'pointer' }} onClick={() => { setAgree(!agree); setAgreeErr(false); }}>
                        <input type="checkbox" checked={agree} onChange={() => { setAgree(!agree); setAgreeErr(false); }} style={{ width: 20, height: 20, marginTop: 2, flexShrink: 0 }} />
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#92400e', lineHeight: 1.5 }}>I have read and agree to the above Terms &amp; Conditions. I agree to pay Rs. {charges}/- as the service charge, regardless of whether I accept the final repair estimate.</label>
                    </div>
                    {agreeErr && <div style={s.err}>Please accept the Terms &amp; Conditions to proceed.</div>}
                    <button style={s.btnPrimary} onClick={proceedAfterTerms}>✅ I Agree &amp; Proceed →</button>
                    <button style={s.btnOutline} onClick={() => setStep('home')}>✖ Cancel</button>
                </div>
            </div></div>
        );
    }

    if (step === 'lang') {
        return (
            <div style={s.page}><div style={s.card}>
                <div style={s.header}><div style={s.h1}>Bhavi Electronics &amp; Automation</div><div style={s.tagline}>WHERE CUSTOMER DELIGHT IS FIRST</div><div style={s.badge}>Select Language</div></div>
                <div style={s.body}>
                    <button style={s.back} onClick={() => setStep(svc?.type === 'repair' ? 'terms' : 'service-info')}>‹ Back</button>
                    <div style={s.sectionTitle}>Select Language / ભાષા / भाषा</div>
                    {[['gu', 'ગુ', 'ગુજરાતી', 'Gujarati'], ['hi', 'हि', 'हिंदी', 'Hindi'], ['en', 'EN', 'English', 'English']].map(([code, badge, name, sub]) => (
                        <button key={code} onClick={() => chooseLang(code as Lang)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', border: '1.5px solid #e2e8f0', borderRadius: 14, background: '#fff', cursor: 'pointer', width: '100%', marginBottom: 10 }}>
                            <div style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, background: '#eff6ff', color: '#1565c0', flexShrink: 0 }}>{badge}</div>
                            <div style={{ textAlign: 'left' }}><span style={{ fontSize: 15, fontWeight: 700, display: 'block' }}>{name}</span><span style={{ fontSize: 11, color: '#64748b' }}>{sub}</span></div>
                            <span style={{ marginLeft: 'auto', color: '#64748b' }}>›</span>
                        </button>
                    ))}
                </div>
            </div></div>
        );
    }

    if (step === 'mobile') {
        return (
            <div style={s.page}><div style={s.card}>
                <div style={s.header}><div style={s.h1}>{t('mobile-title')}</div><div style={s.badge}>Step 2</div></div>
                <div style={s.body}>
                    <button style={s.back} onClick={() => setStep('lang')}>‹ {t('back')}</button>
                    <div style={s.sectionTitle}>{t('mobile-title')}</div>
                    <div style={s.grp}>
                        <label style={s.label}>{t('mobile-lbl')} <span style={s.req}>*</span></label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input style={s.inp} type="tel" maxLength={10} placeholder="10 digit mobile" value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, ''))} />
                            <button style={{ ...s.btnPrimary, width: 'auto', padding: '11px 16px' }} disabled={checkingMobile} onClick={checkMobile}>{checkingMobile ? '...' : t('check')}</button>
                        </div>
                    </div>
                    {mobileErr && <div style={s.err}>{mobileErr}</div>}
                    {foundMsg && <div style={s.info}>{foundMsg}</div>}
                </div>
            </div></div>
        );
    }

    if (step === 'customer') {
        return (
            <div style={s.page}><div style={s.card}>
                <div style={s.header}><div style={s.h1}>Your Details</div><div style={s.badge}>Step 3</div></div>
                <div style={s.body}>
                    <button style={s.back} onClick={() => setStep('mobile')}>‹ {t('back')}</button>
                    <div style={s.sectionTitle}>{t('cust-title')}</div>
                    <div style={{ ...s.row2, marginBottom: 14 }}>
                        <div><label style={s.label}>{t('fname')} <span style={s.req}>*</span></label><input style={s.inp} value={firstName} onChange={e => setFirstName(e.target.value)} /></div>
                        <div><label style={s.label}>{t('lname')} <span style={s.req}>*</span></label><input style={s.inp} value={lastName} onChange={e => setLastName(e.target.value)} /></div>
                    </div>
                    <div style={{ ...s.row2, marginBottom: 14 }}>
                        <div><label style={s.label}>{t('mob')} <span style={s.req}>*</span></label><input style={{ ...s.inp, background: '#f3f4f6' }} value={mobile} readOnly /></div>
                        <div><label style={s.label}>{t('alt')}</label><input style={s.inp} type="tel" maxLength={10} value={altMobile} onChange={e => setAltMobile(e.target.value.replace(/\D/g, ''))} /></div>
                    </div>
                    <div style={s.grp}><label style={s.label}>{t('addr')} <span style={s.req}>*</span></label><input style={s.inp} placeholder="House No, Street, Building..." value={addr1} onChange={e => setAddr1(e.target.value)} /></div>
                    <div style={s.grp}><label style={s.label}>Address Line 2</label><input style={s.inp} placeholder="Society, Landmark, Colony..." value={addr2} onChange={e => setAddr2(e.target.value)} /></div>
                    <div style={s.grp}>
                        <label style={s.label}>{t('state')} <span style={s.req}>*</span></label>
                        <select style={s.inp} value={custState} onChange={e => { setCustState(e.target.value); setArea(''); }}>
                            <option value="">— Select State —</option>
                            {INDIAN_STATES.map(st => <option key={st}>{st}</option>)}
                        </select>
                    </div>
                    <div style={s.grp}><label style={s.label}>{t('city')} <span style={s.req}>*</span></label><input style={s.inp} placeholder="City / District" value={city} onChange={e => setCity(e.target.value)} /></div>
                    <div style={s.row2}>
                        <div style={{ position: 'relative' }}>
                            <label style={s.label}>{t('pin')} <span style={s.req}>*</span></label>
                            <input style={s.inp} autoComplete="off" placeholder="Type area or 6-digit pin..." value={pin}
                                onChange={e => onPinInput(e.target.value)} onFocus={() => setShowPinDrop(pinResults.length > 0)}
                                onBlur={() => setTimeout(() => setShowPinDrop(false), 200)} />
                            {showPinDrop && pinResults.length > 0 && (
                                <div style={{ position: 'absolute', zIndex: 500, top: '100%', left: 0, right: 0, maxHeight: 200, overflowY: 'auto', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,.12)', marginTop: 2 }}>
                                    {pinResults.map(r => (
                                        <div key={r.pincode} onMouseDown={() => pickPin(r)} style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: '#2563eb' }}>{r.area ? `${r.area} - ` : ''}{r.pincode}</span>
                                            {r.district && <span style={{ fontSize: 11, color: '#94a3b8' }}>{r.district}</span>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div><label style={s.label}>Area</label><input style={{ ...s.inp, background: '#f8fafc', color: '#64748b' }} readOnly value={area} placeholder="Auto-filled from Pin Code" /></div>
                    </div>
                    {custErr && <div style={s.err}>{custErr}</div>}
                </div>
                <div style={s.footer}><button style={s.btnPrimary} onClick={submitCustomer}>{t('save-cont')}</button></div>
            </div></div>
        );
    }

    if (step === 'warranty') {
        return (
            <div style={s.page}><div style={s.card}>
                <div style={s.header}><div style={s.h1}>Warranty Status</div><div style={s.badge}>Step 4</div></div>
                <div style={s.body}>
                    <button style={s.back} onClick={() => setStep(isNew ? 'customer' : 'mobile')}>‹ {t('back')}</button>
                    <div style={s.sectionTitle}>{t('warr-title')}</div>
                    {[['warranty', '✅', t('w1'), t('w1s')], ['out_of_warranty', '❌', t('w2'), t('w2s')], ['not_sure', '❓', t('w3'), t('w3s')]].map(([val, icon, label, sub]) => (
                        <div key={val} style={{ ...s.card2, marginBottom: 10 }} onClick={() => selectWarranty(val as WarrantyType)}>
                            <div style={{ fontSize: 15, fontWeight: 800 }}>{icon} {label}</div>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>{sub}</div>
                        </div>
                    ))}
                </div>
            </div></div>
        );
    }

    if (step === 'warranty-info') {
        return (
            <div style={s.page}><div style={s.card}>
                <div style={s.headerGreen}><div style={s.h1}>✅ Warranty Service</div><div style={s.badge}>Canon Warranty Support</div></div>
                <div style={s.body}>
                    <button style={s.back} onClick={() => setStep('warranty')}>‹ Back</button>
                    <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '2px solid #86efac', borderRadius: 14, padding: 16, marginBottom: 14 }}>
                        <div style={{ textAlign: 'center', fontSize: 32, marginBottom: 8 }}>🖨️</div>
                        <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 800, color: '#166534', marginBottom: 6 }}>Canon India Pvt. Ltd.</div>
                        <div style={{ textAlign: 'center', fontSize: 12, color: '#16a34a' }}>Your product is covered under Canon warranty. Please contact Canon India directly — their engineer will visit your premises for service.</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#fff', borderRadius: 10, marginBottom: 8, border: '1px solid #bbf7d0' }}>
                        <span style={{ fontSize: 22 }}>📞</span>
                        <div><div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Toll Free</div><div style={{ fontSize: 14, fontWeight: 700 }}><a href="tel:18002083366" style={{ color: '#1d4ed8' }}>1800 208 3366</a></div></div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#fff', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                        <span style={{ fontSize: 22 }}>💬</span>
                        <div><div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>WhatsApp</div><div style={{ fontSize: 14, fontWeight: 700 }}><a href="https://wa.me/919108510853" style={{ color: '#1d4ed8' }}>+91 91085 10853</a></div></div>
                    </div>
                    <button style={s.btnOutline} onClick={() => { setStep('home'); setServiceId(''); }}>🏠 Home</button>
                </div>
            </div></div>
        );
    }

    if (step === 'product') {
        return (
            <div style={s.page}><div style={s.card}>
                <div style={s.header}><div style={s.h1}>Product Details</div><div style={s.badge}>Step 5</div></div>
                <div style={s.body}>
                    <button style={s.back} onClick={() => setStep('warranty')}>‹ {t('back')}</button>
                    <div style={s.sectionTitle}>{t('prod-title')}</div>
                    <div style={{ ...s.grp, position: 'relative' }}>
                        <label style={s.label}>{t('model')} <span style={s.req}>*</span></label>
                        <input style={s.inp} autoComplete="off" placeholder="Type model number..." value={modelQuery}
                            onChange={e => { setModelQuery(e.target.value); setModelDrop(true); }} onFocus={() => setModelDrop(true)}
                            onBlur={() => setTimeout(() => setModelDrop(false), 200)} />
                        {modelDrop && modelMatches.length > 0 && (
                            <div style={{ position: 'absolute', zIndex: 500, background: '#fff', border: '1.5px solid #3b82f6', borderRadius: 10, maxHeight: 200, overflowY: 'auto', width: '100%', boxShadow: '0 4px 16px rgba(29,78,216,.12)' }}>
                                {modelMatches.map(m => (
                                    <div key={m.id} onMouseDown={() => { setModelQuery(m.model_no); setModelDrop(false); }} style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f1f5f9' }}>
                                        <b>{m.model_no}</b>{m.model_name ? <span style={{ color: '#64748b' }}> — {m.model_name}</span> : ''}
                                    </div>
                                ))}
                            </div>
                        )}
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{t('model-hint')}</div>
                    </div>
                    <div style={s.grp}><label style={s.label}>{t('serial')}</label><input style={s.inp} placeholder="Product serial number (optional)" value={serialNo} onChange={e => setSerialNo(e.target.value)} /></div>
                    <div style={s.grp}>
                        <label style={s.label}>{t('problem')} <span style={s.req}>*</span></label>
                        <select style={s.inp} value={problem} onChange={e => setProblem(e.target.value)}>
                            <option value="">— Select problem —</option>
                            {PROBLEM_OPTIONS.map(p => <option key={p}>{p}</option>)}
                        </select>
                    </div>
                    <div style={s.grp}><label style={s.label}>{t('remarks')}</label><textarea style={{ ...s.inp, minHeight: 80, resize: 'none' as const }} placeholder="Describe the problem in detail..." value={remarks} onChange={e => setRemarks(e.target.value)} /></div>
                    {prodErr && <div style={s.err}>{prodErr}</div>}
                </div>
                <div style={s.footer}><button style={s.btnPrimary} onClick={goToSign}>Continue to Signature →</button></div>
            </div></div>
        );
    }

    if (step === 'inquiry' && svc) {
        return (
            <div style={s.page}><div style={s.card}>
                <div style={s.header}><div style={s.h1}>{svc.name}</div><div style={s.badge}>Step 5</div></div>
                <div style={s.body}>
                    <button style={s.back} onClick={() => setStep(isNew ? 'customer' : 'mobile')}>‹ {t('back')}</button>
                    <div style={s.sectionTitle}>{t('inq-title')}</div>
                    {(svc.fields || []).map(f => (
                        <div key={f.id} style={s.grp}>
                            <label style={s.label}>{f.label}</label>
                            {f.type === 'select' ? (
                                <select style={s.inp} value={inqValues[f.label] || ''} onChange={e => setInqValues(v => ({ ...v, [f.label]: e.target.value }))}>
                                    <option value="">— Select —</option>
                                    {(f.opts || []).map(o => <option key={o}>{o}</option>)}
                                </select>
                            ) : (
                                <input style={s.inp} placeholder={f.placeholder} value={inqValues[f.label] || ''} onChange={e => setInqValues(v => ({ ...v, [f.label]: e.target.value }))} />
                            )}
                        </div>
                    ))}
                    <div style={s.grp}>
                        <label style={s.label}>{t('inq-remarks')} <span style={s.req}>*</span></label>
                        <textarea style={{ ...s.inp, minHeight: 80, resize: 'none' as const }} placeholder="Please describe your requirement in detail..." value={inqRemarks} onChange={e => setInqRemarks(e.target.value)} />
                    </div>
                    {inqErr && <div style={s.err}>{inqErr}</div>}
                </div>
                <div style={s.footer}><button style={s.btnPrimary} disabled={submitting} onClick={goToSign}>{submitting ? 'Submitting...' : '✅ Submit →'}</button></div>
            </div></div>
        );
    }

    if (step === 'sign') {
        return (
            <div style={s.page}><div style={s.card}>
                <div style={s.header}><div style={s.h1}>Signature</div><div style={s.badge}>Step 6</div></div>
                <div style={s.body}>
                    <button style={s.back} onClick={() => setStep('product')}>‹ Back</button>
                    <div style={s.sectionTitle}>{t('sign-title')}</div>
                    <div style={{ border: '2px solid #e2e8f0', borderRadius: 12, background: '#fafcff', overflow: 'hidden', position: 'relative', marginBottom: 12 }}>
                        <canvas ref={canvasRef} height={200} style={{ display: 'block', width: '100%', cursor: 'crosshair', touchAction: 'none' }} />
                        {signHint && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#cbd5e1', fontSize: 13, fontWeight: 600, pointerEvents: 'none', textAlign: 'center' }}>✍️ Sign here with finger or stylus</div>}
                    </div>
                    <button style={s.btnOutline} onClick={clearSign}>🗑️ {t('clear-sign')}</button>
                    <div style={{ ...s.info, marginTop: 14 }}>{t('sign-note')}</div>
                    {signErr && <div style={s.err}>{signErr}</div>}
                </div>
                <div style={s.footer}><button style={s.btnPrimary} disabled={submitting} onClick={doSubmit}>{submitting ? 'Submitting...' : t('submit')}</button></div>
            </div></div>
        );
    }

    if (step === 'success' && svc) {
        const isRepair = svc.type === 'repair';
        return (
            <div style={s.page}><div style={s.card}>
                <div style={s.headerGreen}><div style={s.h1}>{isRepair ? '✅ Complaint Registered!' : '✅ Inquiry Submitted!'}</div><div style={s.badge}>{isRepair ? `Job Sheet: ${resultId}` : svc.name}</div></div>
                <div style={s.body}>
                    <div style={{ background: isRepair ? 'linear-gradient(135deg,#1e3a8a,#1d4ed8)' : 'linear-gradient(135deg,#065f46,#059669)', color: '#fff', borderRadius: 16, padding: '24px 20px', textAlign: 'center', marginBottom: 14 }}>
                        {isRepair ? (
                            <>
                                <div style={{ fontSize: 11, opacity: .8 }}>JOB SHEET NUMBER</div>
                                <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 3, margin: '6px 0' }}>{resultId}</div>
                            </>
                        ) : (
                            <>
                                <div style={{ fontSize: 11, opacity: .8 }}>INQUIRY RECEIVED</div>
                                <div style={{ fontSize: 44, margin: '10px 0' }}>{svc.icon}</div>
                                <div style={{ fontSize: 16, fontWeight: 800 }}>{svc.name}</div>
                            </>
                        )}
                        <div style={{ fontSize: 11, opacity: .7, marginTop: 6 }}>{createdAt}</div>
                    </div>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, marginBottom: 12 }}>
                        <InfoRow lbl="👤 Name" val={isNew ? `${firstName} ${lastName}` : (existingCust?.cname || 'Customer')} />
                        <InfoRow lbl="📱 Mobile" val={mobile} />
                        <InfoRow lbl="🛠️ Service" val={svc.name} />
                        {isRepair && <InfoRow lbl="⚠️ Problem" val={problem} />}
                    </div>
                    <div style={s.info}>{isRepair ? (repairType === 'carry-in' ? 'Your complaint has been registered. Please bring your device to our office. Repair will be completed within 2–3 working days.' : 'Your complaint has been registered. Our engineer will contact you within 24 working hours to confirm the visit timing.') : 'Thank you! Our team will review your inquiry and contact you shortly with a detailed quotation.'}</div>
                    {successErr && <div style={s.err}>{successErr}</div>}
                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: 12, fontSize: 12, color: '#166534' }}>
                        📍 <b>Bhavi Electronics &amp; Automation</b><br />📞 <a href="tel:+919574004969" style={{ color: '#166534', fontWeight: 700 }}>+91 9574004969</a>
                    </div>
                </div>
                <div style={{ ...s.footer, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {isRepair && <button style={s.btnPrimary} onClick={printDoc}>🖨️ Download / Print</button>}
                    <button style={s.btnOutline} onClick={() => { setStep('home'); setServiceId(''); }}>🏠 Back to Home</button>
                </div>
            </div></div>
        );
    }

    return null;
}

function TermItem({ n, b, text }: { n: number; b: string; text: string }) {
    return (
        <div style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ width: 24, height: 24, background: '#1d4ed8', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{n}</div>
            <div style={{ fontSize: 12, color: '#1e293b', lineHeight: 1.6 }}><b style={{ color: '#1d4ed8' }}>{b}</b><br />{text}</div>
        </div>
    );
}

function InfoRow({ lbl, val }: { lbl: string; val: string }) {
    return (
        <div style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '1px solid #e2e8f0', fontSize: 13 }}>
            <span style={{ color: '#64748b', fontWeight: 600, width: 80, flexShrink: 0 }}>{lbl}</span>
            <span style={{ color: '#1e293b', fontWeight: 500 }}>{val}</span>
        </div>
    );
}