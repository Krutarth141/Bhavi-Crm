'use client';

const PORTAL_URL = 'https://bhavi-crm.github.io/bhavi-crm/complaint.html';

interface Props {
    onClose: () => void;
}

export default function CustomerPortalQrModal({ onClose }: Props) {
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=6&data=${encodeURIComponent(PORTAL_URL)}`;

    const handlePrint = () => {
        const printQrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=8&data=${encodeURIComponent(PORTAL_URL)}`;
        const win = window.open('', '_blank', 'width=480,height=620');
        if (!win) return;
        win.document.write(`<!DOCTYPE html><html><head><title>Bhavi Electronics — Book a Service QR</title>
<style>body{font-family:Arial,sans-serif;text-align:center;padding:30px;background:#fff;}
h2{color:#1d4ed8;font-size:20px;margin-bottom:4px;}
.tag{font-size:11px;color:#888;letter-spacing:.8px;margin-bottom:20px;display:block;}
img{border:2px solid #bfdbfe;border-radius:10px;}
.title{font-size:16px;font-weight:800;color:#1d4ed8;margin:16px 0 6px;}
.sub{font-size:12px;color:#555;margin:0 0 4px;line-height:1.6;}
.url{font-size:10px;color:#94a3b8;margin-top:14px;word-break:break-all;}
@media print{body{margin:0;padding:20px;}}
</style></head><body>
<h2>Bhavi Electronics &amp; Automation</h2>
<span class="tag">WHERE CUSTOMER DELIGHT IS FIRST</span>
<div><img src="${printQrSrc}" width="300" height="300" onload="window.print();"></div>
<div class="title">📱 Scan to Book a Service / Shop</div>
<div class="sub">Printer &amp; Scanner Repair &nbsp;·&nbsp; Camera Repair<br>CCTV Install &nbsp;·&nbsp; Home Automation &nbsp;·&nbsp; Shop</div>
<div class="sub" style="color:#059669;font-weight:700;margin-top:8px;">✅ Visit Charges: Rs. 649/- only</div>
<div style="margin-top:14px;padding:10px;background:#f0f9ff;border-radius:8px;display:inline-block;">📞 <b>+91 9574004969</b></div>
<div class="url">${PORTAL_URL}</div>
</body></html>`);
        win.document.close();
    };

    const handleCopy = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(PORTAL_URL).then(() => alert('Link copied!\n' + PORTAL_URL));
        } else {
            const t = document.createElement('textarea');
            t.value = PORTAL_URL;
            document.body.appendChild(t);
            t.select();
            document.execCommand('copy');
            document.body.removeChild(t);
            alert('Link copied!\n' + PORTAL_URL);
        }
    };

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400, textAlign: 'center' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: 17 }}>📱 Customer Booking Portal QR</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ padding: 20 }}>
                    <div style={{ background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', borderRadius: 12, padding: 16, marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                            <img
                                src={qrSrc}
                                width={220}
                                height={220}
                                alt="Customer Portal QR"
                                style={{ borderRadius: 8, border: '2px solid #bfdbfe' }}
                                onError={(e) => {
                                    (e.currentTarget.parentElement as HTMLElement).innerHTML =
                                        '<div style="font-size:13px;color:#6b7280;padding:20px;">QR load failed.<br>Use the link below.</div>';
                                }}
                            />
                        </div>
                        <div style={{ fontSize: 11, color: '#1e40af', wordBreak: 'break-all', fontWeight: 600 }}>{PORTAL_URL}</div>
                    </div>
                    <div style={{ fontSize: 13, color: '#374151', marginBottom: 14, lineHeight: 1.6 }}>
                        Customers can scan this QR to book services or purchase products from the shop. Display it at the shop counter.
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <a href={PORTAL_URL} target="_blank" rel="noreferrer" style={{ padding: '6px 14px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>🔗 Open Portal</a>
                        <button onClick={handlePrint} style={{ padding: '6px 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>🖨️ Print QR</button>
                        <button onClick={handleCopy} style={{ padding: '6px 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>📋 Copy Link</button>
                    </div>
                </div>
            </div>
        </div>
    );
}