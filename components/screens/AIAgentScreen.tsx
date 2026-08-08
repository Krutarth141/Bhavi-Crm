'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabase';
import { isCspManager } from '@/lib/permissions';

type Tab = 'social' | 'inquiry' | 'payment' | 'calls' | 'log';
type TemplateType = 'offer' | 'service' | 'festival' | 'product' | 'review' | 'custom';

interface LogEntry { type: string; msg: string; cls: string; time: Date; }

const AUTO_ENG_IDS = ['ENG002', 'ENG008'];

const TEMPLATES: { id: TemplateType; icon: string; label: string }[] = [
    { id: 'offer', icon: '🎁', label: 'Offer / Sale' },
    { id: 'service', icon: '🔧', label: 'Service Tips' },
    { id: 'festival', icon: '🎉', label: 'Festival' },
    { id: 'product', icon: '📦', label: 'New Product' },
    { id: 'review', icon: '⭐', label: 'Customer Review' },
    { id: 'custom', icon: '✏️', label: 'Custom' },
];

const HASHTAG_SETS: Record<TemplateType, string[]> = {
    offer: ['#BhaviElectronics', '#ElectronicsRepair', '#ACService', '#AhmedabadElectronics', '#HomeAppliances', '#ServiceCenter', '#SpecialOffer', '#DiscountAlert', '#SummerSale', '#Ahmedabad', '#Gujarat', '#RepairService', '#TechService', '#ApplianceRepair'],
    service: ['#BhaviElectronics', '#ServiceTips', '#ACMaintenance', '#HomeAppliances', '#ElectronicsRepair', '#ProTips', '#Ahmedabad', '#Gujarat', '#TechTips', '#DIYRepair', '#ApplianceCare', '#MaintenanceTips'],
    festival: ['#BhaviElectronics', '#FestivalOffer', '#Diwali', '#Navratri', '#Gujarat', '#Ahmedabad', '#FestiveSeason', '#SpecialDiscount', '#ElectronicsGifts', '#HomeAppliances', '#FestivalSale', '#CelebrationDeals'],
    product: ['#BhaviElectronics', '#NewArrival', '#ElectronicsIndia', '#HomeAppliances', '#Ahmedabad', '#Gujarat', '#TechProducts', '#Innovation', '#SmartHome', '#BestBuy', '#QualityProducts', '#NewProduct'],
    review: ['#BhaviElectronics', '#CustomerReview', '#HappyCustomer', '#5Stars', '#Ahmedabad', '#Gujarat', '#TrustedService', '#BestService', '#CustomerSatisfaction', '#Reviews', '#ServiceExcellence', '#Recommend'],
    custom: ['#BhaviElectronics', '#Ahmedabad', '#Gujarat', '#ElectronicsRepair', '#HomeAppliances', '#ServiceCenter', '#TechService'],
};

const TMPL_CFG: Record<TemplateType, { bg1: string; bg2: string; accent: string; badge: string; badgeTxt: string; icon: string; label: string }> = {
    offer: { bg1: '#d4380d', bg2: '#fa8c16', accent: '#fff', badge: '#fff', badgeTxt: '#d4380d', icon: '🎁', label: 'SPECIAL OFFER' },
    service: { bg1: '#003eb3', bg2: '#1d4ed8', accent: '#fff', badge: '#fff', badgeTxt: '#003eb3', icon: '🔧', label: 'SERVICE TIP' },
    festival: { bg1: '#7c3aed', bg2: '#f59e0b', accent: '#fff', badge: '#fff', badgeTxt: '#7c3aed', icon: '🎉', label: 'FESTIVAL SPECIAL' },
    product: { bg1: '#065f46', bg2: '#059669', accent: '#fff', badge: '#fff', badgeTxt: '#065f46', icon: '📦', label: 'NEW ARRIVAL' },
    review: { bg1: '#0f172a', bg2: '#1d4ed8', accent: '#fff', badge: '#fbbf24', badgeTxt: '#0f172a', icon: '⭐', label: 'CUSTOMER REVIEW' },
    custom: { bg1: '#1e2a3a', bg2: '#7c3aed', accent: '#fff', badge: '#fff', badgeTxt: '#1e2a3a', icon: '✨', label: 'BHAVI ELECTRONICS' },
};

function generatePostContent(template: TemplateType, userDetail: string, city: string) {
    const companyName = 'Bhavi Electronics & Automation';
    const c = city || 'Ahmedabad';
    const templates: Record<TemplateType, { headline: string; body: string; cta: string; hashtags: string }> = {
        offer: { headline: '🎉 SPECIAL OFFER!', body: userDetail || 'Trusted electronics repair service — contact us today.', cta: '📞 Call Now | ✅ Expert Technicians | 🏠 Home Service Available', hashtags: `#${c}Electronics #BhaviElectronics #SpecialOffer #DiscountAlert #ElectronicsRepair #ACService #HomeAppliances #ServiceCenter #${c}Gujarat` },
        service: { headline: '🔧 PROFESSIONAL SERVICE', body: userDetail || `AC, TV, Washing Machine, Refrigerator — trusted repair service for all your home electronics. ${companyName}, ${c}.`, cta: '🏠 On-Site Service | 🔧 All Brands | ⚡ Same Day', hashtags: `#${c}Service #ACRepair #TVRepair #ApplianceRepair #BhaviElectronics #HomeService #${c}Electronics #Gujarat` },
        festival: { headline: '🪔 FESTIVE GREETINGS!', body: userDetail || `${companyName} wishes you and your family a very Happy Festival! Thank you for your trust and continued support.`, cta: `💙 ${companyName} Team`, hashtags: `#FestivalGreetings #BhaviElectronics #${c} #Gujarat #Celebration #HappyFestival` },
        product: { headline: '✨ NEW PRODUCT', body: userDetail || `Latest automation products available at ${companyName}! Smart home, CCTV, Home Theatre and more.`, cta: '🏪 Visit Us | 📞 Call for Demo | 🚚 Installation Available', hashtags: `#NewProduct #SmartHome #HomeAutomation #CCTV #${c} #BhaviElectronics #Automation` },
        review: { headline: '⭐ CUSTOMER REVIEW', body: userDetail || `Thank you for trusting ${companyName} with your service needs!`, cta: '🙏 Thank You for Your Trust', hashtags: `#BhaviElectronics #CustomerReview #HappyCustomer #${c} #Gujarat` },
        custom: { headline: '📢 ANNOUNCEMENT', body: userDetail || `${companyName} — your trusted partner for Electronics Repair and Automation Solutions in ${c}.`, cta: '📞 Call Now | 🌐 bhavi-electronics.com', hashtags: `#BhaviElectronics #${c} #Electronics #Automation #Gujarat #TrustedService` },
    };
    return templates[template] || templates.custom;
}

function canvasWrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
    const words = text.split(' ');
    let line = '', ly = y;
    for (const w of words) {
        const t = line + w + ' ';
        if (ctx.measureText(t).width > maxW && line !== '') { ctx.fillText(line.trim(), x, ly); ly += lineH; line = w + ' '; }
        else line = t;
    }
    if (line.trim()) ctx.fillText(line.trim(), x, ly);
    return ly + lineH;
}

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: boolean) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
    if (fill) ctx.fill();
}

function drawPostCanvas(content: { headline: string; body: string; cta: string; hashtags: string }, city: string, template: TemplateType) {
    const S = 1080;
    const canvas = document.createElement('canvas');
    canvas.width = S; canvas.height = S;
    const ctx = canvas.getContext('2d')!;
    const cfg = TMPL_CFG[template] || TMPL_CFG.custom;

    const gr = ctx.createLinearGradient(0, 0, S, S);
    gr.addColorStop(0, cfg.bg1); gr.addColorStop(1, cfg.bg2);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, S, S);

    ctx.save(); ctx.globalAlpha = 0.06; ctx.strokeStyle = '#fff'; ctx.lineWidth = 40;
    for (let i = -S; i < S * 2; i += 80) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + S, S); ctx.stroke(); }
    ctx.restore();

    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 12;
    drawRoundRect(ctx, 24, 24, S - 48, S - 48, 24, false); ctx.stroke(); ctx.restore();

    ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, S, 145); ctx.restore();

    ctx.save();
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 8;
    ctx.font = 'bold 58px Arial'; ctx.fillText('BHAVI ELECTRONICS', S / 2, 74);
    ctx.font = '500 30px Arial'; ctx.globalAlpha = 0.85; ctx.fillText('& Automation — Service CRM', S / 2, 115);
    ctx.restore();

    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(60, 148); ctx.lineTo(S - 60, 148); ctx.stroke(); ctx.restore();

    if (content.headline) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.textAlign = 'center';
        ctx.font = 'bold 44px Arial'; ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 6;
        ctx.fillText(content.headline, S / 2, 210); ctx.restore();
    } else {
        ctx.save();
        const bw = 380, bh = 66, bx = (S - bw) / 2, by = 168;
        ctx.fillStyle = cfg.badge; drawRoundRect(ctx, bx, by, bw, bh, 33, true);
        ctx.fillStyle = cfg.badgeTxt; ctx.font = 'bold 30px Arial'; ctx.textAlign = 'center';
        ctx.fillText(cfg.label, S / 2, 213); ctx.restore();
    }

    ctx.save(); ctx.font = '110px serif'; ctx.textAlign = 'center';
    ctx.fillText(cfg.icon, S / 2, 360); ctx.restore();

    ctx.save(); ctx.fillStyle = cfg.accent; ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 6;
    const detail = content.body || '';
    const fs = detail.length > 100 ? 34 : detail.length > 70 ? 38 : detail.length > 50 ? 42 : 46;
    ctx.font = 'bold ' + fs + 'px Arial';
    const nextY = canvasWrapText(ctx, detail, S / 2, 400, 920, fs + 18);
    ctx.restore();

    if (content.cta) {
        ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.textAlign = 'center';
        ctx.font = 'italic 28px Arial';
        const ctaY = Math.max(nextY + 10, 620);
        canvasWrapText(ctx, content.cta, S / 2, ctaY, 900, 36);
        ctx.restore();
    }

    ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#000'; ctx.fillRect(0, 710, S, 70); ctx.restore();
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = '30px Arial'; ctx.textAlign = 'center';
    ctx.fillText('📍 ' + city + '   |   📞 Call Now   |   ✅ Expert Service', S / 2, 754); ctx.restore();

    ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = '#000'; ctx.fillRect(0, 800, S, 280); ctx.restore();

    const hashTags = content.hashtags ? content.hashtags.split(' ').filter(Boolean) : (HASHTAG_SETS[template] || HASHTAG_SETS.custom);
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.72)'; ctx.font = '22px Arial'; ctx.textAlign = 'center';
    ctx.fillText(hashTags.slice(0, 5).join('  '), S / 2, 850);
    ctx.fillText(hashTags.slice(5, 10).join('  '), S / 2, 882); ctx.restore();

    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(60, 910); ctx.lineTo(S - 60, 910); ctx.stroke(); ctx.restore();

    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = 'bold 28px Arial'; ctx.textAlign = 'center';
    ctx.fillText('🌐 bhavi-electronics.com  |  Bhavi Electronics & Automation', S / 2, 952);
    ctx.font = '22px Arial'; ctx.globalAlpha = 0.6;
    ctx.fillText('📷 Follow us on Instagram  •  Facebook  •  WhatsApp', S / 2, 990); ctx.restore();

    return canvas;
}

const waMe = (phone: string, text: string) => `https://wa.me/91${phone}?text=${encodeURIComponent(text)}`;

export default function AIAgentScreen() {
    const { data: session } = useSession();
    const user = session?.user as any;
    const hasAccess = user && ((user.roleType === 'admin') || AUTO_ENG_IDS.includes(user.email));
    // CSP Manager (ENG001) is intentionally NOT granted access here — HTML gates
    // this screen to Admin + ENG002/ENG008 only, CSP Mgr's extra access is
    // Tickets/Reports/Attendance, not the Virtual Agent.
    void isCspManager;

    const [tab, setTab] = useState<Tab>('social');
    const [kpi, setKpi] = useState({ pendingCalls: 0, pendingInquiries: 0, totalCustomers: 0 });

    // Social
    const [template, setTemplate] = useState<TemplateType>('offer');
    const [postInput, setPostInput] = useState('');
    const [city, setCity] = useState('Ahmedabad');
    const [previewUrl, setPreviewUrl] = useState('');
    const [hashtags, setHashtags] = useState<string[]>([]);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Lists
    const [inquiries, setInquiries] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [calls, setCalls] = useState<any[]>([]);
    const [log, setLog] = useState<LogEntry[]>([]);

    const addLog = (type: string, msg: string, cls: string) => {
        setLog((l) => [{ type, msg, cls, time: new Date() }, ...l].slice(0, 100));
    };

    useEffect(() => {
        if (!hasAccess) return;
        (async () => {
            try {
                const [{ count: callsCount }, { count: inqCount }, { count: custCount }] = await Promise.all([
                    supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'Open'),
                    supabase.from('auto_inquiries').select('id', { count: 'exact', head: true }).in('status', ['open', 'followup']),
                    supabase.from('customers').select('id', { count: 'exact', head: true }),
                ]);
                setKpi({ pendingCalls: callsCount || 0, pendingInquiries: inqCount || 0, totalCustomers: custCount || 0 });
            } catch { /* best-effort KPI counts */ }
        })();
        loadInquiries();
        loadPayments();
        loadCalls();
    }, [hasAccess]);

    const loadInquiries = async () => {
        const { data } = await supabase.from('auto_inquiries').select('*').in('status', ['open', 'followup']).order('followup_date', { ascending: true }).limit(30);
        setInquiries(data || []);
    };
    const loadPayments = async () => {
        const { data } = await supabase.from('tickets').select('*').in('status', ['Completed', 'Closed']).not('call_type', 'in', '(Warranty,Warranty Repeat)').eq('invoice_done', false).order('updated_at', { ascending: false }).limit(30);
        setPayments(data || []);
    };
    const loadCalls = async () => {
        const { data } = await supabase.from('tickets').select('*').eq('status', 'Open').order('created_at', { ascending: false }).limit(30);
        setCalls(data || []);
    };

    const generatePost = () => {
        if (!postInput.trim()) { alert('Please enter post details first!'); return; }
        const content = generatePostContent(template, postInput.trim(), city.trim() || 'Ahmedabad');
        const canvas = drawPostCanvas(content, city.trim() || 'Ahmedabad', template);
        canvasRef.current = canvas;
        setPreviewUrl(canvas.toDataURL('image/png'));
        setHashtags(content.hashtags.split(' ').filter(Boolean));
        addLog('social', `🎨 Design post generated: ${template} | ${city}`, 'log-social');
    };

    const downloadPost = () => {
        if (!canvasRef.current) return;
        const a = document.createElement('a');
        a.download = `BhaviElectronics_Post_${new Date().toISOString().slice(0, 10)}.png`;
        a.href = canvasRef.current.toDataURL('image/png');
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        addLog('social', '⬇️ PNG image downloaded (1080×1080)', 'log-social');
    };

    const copyHashtags = () => {
        navigator.clipboard?.writeText(hashtags.join(' '));
        alert('Hashtags copied!\n\nDownload the image and post it on Instagram/Facebook.');
    };

    const markInquiryDone = async (id: number) => {
        await supabase.from('auto_inquiries').update({ status: 'followup', followup_date: new Date().toISOString().slice(0, 10) }).eq('id', id);
        loadInquiries();
    };

    const sendInquiryWA = (inq: any) => {
        const phone = (inq.mobile || '').replace(/\D/g, '');
        const text = `Hello ${inq.customer_name || 'Customer'}! 🙏\n\nThis is Bhavi Electronics & Automation.\n\nYou had submitted an inquiry with us regarding — ${inq.description || 'your requirement'}.\nAre you available to speak now?\n\nPlease reply for a FREE consultation with our experts. ✅\n\n📞 Call: +91-XXXXXXXXXX\n📍 Ahmedabad, Gujarat`;
        window.open(waMe(phone, text), '_blank');
        addLog('inquiry', `💬 Inquiry WA sent to ${inq.customer_name} (${phone})`, 'log-wa');
        markInquiryDone(inq.id);
    };

    const sendPaymentWA = (t: any) => {
        const phone = (t.mobile || '').replace(/\D/g, '');
        const text = `Hello ${t.cname || 'Customer'}! 🙏\n\nThis is a reminder from Bhavi Electronics.\n\nYour ticket #${t.id} (${t.model || '-'}) service has been completed.\n\nPlease make the payment:\n• Cash / UPI / Card accepted\n• Visit us at: Bhavi Electronics, Ahmedabad\n\nIf you have any questions, please reply. Thank you! 🙏`;
        window.open(waMe(phone, text), '_blank');
        addLog('payment', `💰 Payment reminder sent to ${t.cname}`, 'log-wa');
    };

    const sendCallAck = (t: any) => {
        const phone = (t.mobile || '').replace(/\D/g, '');
        const text = `Hello ${t.cname || 'Customer'}! 🙏\n\nBhavi Electronics & Automation informs you that your service call has been *registered*.\n\n🎫 Ticket No: *${t.id}*\n📱 Product: ${t.model || '-'}\n🔧 Problem: ${t.problem || '-'}\n📍 Service Type: ${t.service_type || '-'}\n\nOur engineer will contact you within 24 hours.\n\nThank you! — Bhavi Electronics 🙏`;
        window.open(waMe(phone, text), '_blank');
        addLog('calls', `📞 Ack sent to ${t.cname} for ${t.id}`, 'log-wa');
    };

    const callCustomer = (phone: string) => {
        window.open('tel:+91' + phone.replace(/\D/g, ''), '_self');
        addLog('calls', '📞 Call initiated to +91' + phone, 'log-call');
    };

    if (!hasAccess) {
        return <div style={{ padding: 24 }}>You don't have access to this screen.</div>;
    }

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1d4ed8 60%,#7c3aed 100%)', borderRadius: 16, padding: '24px 28px', color: '#fff', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                <div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>🤖 Virtual AI Agent — Bhavi Electronics</h2>
                    <p style={{ fontSize: 13, opacity: 0.8, maxWidth: 420, margin: 0 }}>Automate your daily tasks — Social Media posts, CRM followups, Payment reminders, and Inquiry replies all in one place.</p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 30, padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4ade80' }} /><span>Agent Active</span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
                {[
                    { icon: '📢', val: 'Social', lbl: 'Post Generator', color: '#1d4ed8' },
                    { icon: '🎫', val: kpi.pendingCalls, lbl: 'Pending Calls', color: '#d97706' },
                    { icon: '🔍', val: kpi.pendingInquiries, lbl: 'Pending Inquiries', color: '#059669' },
                    { icon: '👥', val: kpi.totalCustomers, lbl: 'Total Customers', color: '#7c3aed' },
                ].map((k) => (
                    <div key={k.lbl} style={{ background: '#fff', borderRadius: 14, padding: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', borderTop: `4px solid ${k.color}`, textAlign: 'center' }}>
                        <div style={{ fontSize: 28, marginBottom: 6 }}>{k.icon}</div>
                        <div style={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.val}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 3, fontWeight: 600, textTransform: 'uppercase' }}>{k.lbl}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 4, borderRadius: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                {[
                    { id: 'social', label: '📢 Social Media' },
                    { id: 'inquiry', label: '🔍 Inquiry Followup' },
                    { id: 'payment', label: '💰 Payment Followup' },
                    { id: 'calls', label: '📞 CRM Calls' },
                    { id: 'log', label: '📋 Activity Log' },
                ].map((t) => (
                    <button key={t.id} onClick={() => setTab(t.id as Tab)} style={{ padding: '9px 18px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600, border: 'none', background: tab === t.id ? '#fff' : 'none', color: tab === t.id ? '#1d4ed8' : '#64748b', boxShadow: tab === t.id ? '0 2px 8px rgba(0,0,0,0.1)' : 'none' }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'social' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div style={cardStyle}>
                        <div style={cardTitleStyle}>📝 Select Post Type</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
                            {TEMPLATES.map((t) => (
                                <div key={t.id} onClick={() => setTemplate(t.id)} style={{ border: `2px solid ${template === t.id ? '#1d4ed8' : '#e5e7eb'}`, background: template === t.id ? '#eff6ff' : '#fff', color: template === t.id ? '#1d4ed8' : 'inherit', borderRadius: 10, padding: 12, cursor: 'pointer', fontSize: 12, textAlign: 'center' }}>
                                    <div style={{ fontSize: 20, marginBottom: 4 }}>{t.icon}</div>
                                    <div style={{ fontWeight: 600 }}>{t.label}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginBottom: 10 }}>
                            <label style={labelStyle}>Post Details (Gujarati / Hindi / English)</label>
                            <textarea rows={4} value={postInput} onChange={(e) => setPostInput(e.target.value)} placeholder="Enter post details... e.g. '25% off on all AC service this summer'" style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, fontSize: 13, width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label style={labelStyle}>City / Location Tag</label>
                            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, width: '100%', boxSizing: 'border-box' }} />
                        </div>
                        <button onClick={generatePost} style={{ width: '100%', padding: 10, background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>✨ Generate AI Post</button>
                    </div>
                    <div>
                        <div style={cardStyle}>
                            <div style={cardTitleStyle}>👁️ Post Preview</div>
                            <div style={{ background: previewUrl ? 'none' : 'linear-gradient(135deg,#667eea,#764ba2)', borderRadius: 14, minHeight: 120, padding: previewUrl ? 0 : 20, textAlign: 'center', color: '#fff' }}>
                                {previewUrl ? <img src={previewUrl} style={{ width: '100%', borderRadius: 12, display: 'block' }} alt="Post preview" /> : <span style={{ opacity: 0.6 }}>Generate a post to see the preview here...</span>}
                            </div>
                            {previewUrl && (
                                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                                    <button onClick={copyHashtags} style={smBtnStyle}>📋 Copy Hashtags</button>
                                    <button onClick={downloadPost} style={{ ...smBtnStyle, background: '#16a34a' }}>📸 Download PNG (1080×1080)</button>
                                </div>
                            )}
                        </div>
                        {hashtags.length > 0 && (
                            <div style={cardStyle}>
                                <div style={cardTitleStyle}>🏷️ Suggested Hashtags</div>
                                <div>{hashtags.map((h) => (
                                    <span key={h} onClick={() => navigator.clipboard?.writeText(h)} style={{ display: 'inline-block', background: '#e0e7ff', color: '#4338ca', borderRadius: 20, padding: '3px 10px', margin: 2, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{h}</span>
                                ))}</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {tab === 'inquiry' && (
                <div style={cardStyle}>
                    <div style={cardTitleStyle}>🔍 Pending Inquiry Followups</div>
                    {inquiries.length === 0 ? <EmptyState text="No pending inquiries. 🎉" /> : inquiries.map((inq) => (
                        <FollowupItem key={inq.id} name={`${inq.customer_name || 'Unknown'} — ${inq.inquiry_type || 'General Inquiry'}`} detail={`📞 ${inq.mobile || '-'}  |  📅 ${inq.created_at ? new Date(inq.created_at).toLocaleDateString('en-IN') : '-'}`}>
                            <button onClick={() => sendInquiryWA(inq)} style={waBtnStyle}>💬 WA</button>
                            <button onClick={() => markInquiryDone(inq.id)} style={doneBtnStyle}>✅</button>
                        </FollowupItem>
                    ))}
                </div>
            )}

            {tab === 'payment' && (
                <div style={cardStyle}>
                    <div style={cardTitleStyle}>💰 Payment Pending Tickets</div>
                    {payments.length === 0 ? <EmptyState text="No pending payments. 🎉" /> : payments.map((t) => (
                        <FollowupItem key={t.id} name={`${t.cname || 'Customer'} — ${t.model || '-'}`} detail={`📞 ${t.mobile || '-'}  |  🎫 ${t.id}  |  🔧 ${t.call_type || '-'}`}>
                            <button onClick={() => sendPaymentWA(t)} style={waBtnStyle}>💬 WA</button>
                            <button onClick={() => callCustomer(t.mobile || '')} style={callBtnStyle}>📞 Call</button>
                        </FollowupItem>
                    ))}
                </div>
            )}

            {tab === 'calls' && (
                <div style={cardStyle}>
                    <div style={cardTitleStyle}>📞 Pending Allocation Calls</div>
                    {calls.length === 0 ? <EmptyState text="No pending allocation calls. 🎉" /> : calls.map((t) => (
                        <FollowupItem key={t.id} name={`${t.cname || 'Customer'} — ${t.model || '-'}`} detail={`📞 ${t.mobile || '-'}  |  🎫 ${t.id}  |  🔧 ${t.problem || '-'}`}>
                            <button onClick={() => sendCallAck(t)} style={waBtnStyle}>💬 Ack</button>
                            <button onClick={() => callCustomer(t.mobile || '')} style={callBtnStyle}>📞 Call</button>
                        </FollowupItem>
                    ))}
                </div>
            )}

            {tab === 'log' && (
                <div style={cardStyle}>
                    <div style={{ ...cardTitleStyle, display: 'flex', justifyContent: 'space-between' }}>
                        📋 Agent Activity Log
                        <button onClick={() => setLog([])} style={{ ...smBtnStyle, background: '#64748b' }}>🗑️ Clear Log</button>
                    </div>
                    {log.length === 0 ? <EmptyState text="No activity yet. Data will appear here once the agent starts working." icon="🤖" /> : log.map((l, i) => (
                        <div key={i} style={{ padding: '10px 14px', borderRadius: 10, background: '#f8fafc', borderLeft: '3px solid #1d4ed8', marginBottom: 8, fontSize: 13 }}>
                            <div>{l.msg}</div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{l.time.toLocaleTimeString('en-IN')} — {l.time.toLocaleDateString('en-IN')}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function EmptyState({ text, icon }: { text: string; icon?: string }) {
    return <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>{icon && <div style={{ fontSize: 36, marginBottom: 10 }}>{icon}</div>}<div>{text}</div></div>;
}

function FollowupItem({ name, detail, children }: { name: string; detail: string; children: React.ReactNode }) {
    return (
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, border: '1px solid #e5e7eb' }}>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{name}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{detail}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>{children}</div>
        </div>
    );
}

const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', padding: 20, marginBottom: 16 };
const cardTitleStyle: React.CSSProperties = { fontSize: 15, fontWeight: 700, marginBottom: 14 };
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 };
const smBtnStyle: React.CSSProperties = { padding: '6px 12px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 };
const waBtnStyle: React.CSSProperties = { ...smBtnStyle, background: '#25d366' };
const callBtnStyle: React.CSSProperties = { ...smBtnStyle, background: '#f59e0b' };
const doneBtnStyle: React.CSSProperties = { ...smBtnStyle, background: '#10b981' };