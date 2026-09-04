'use client';

import { useState, useEffect, useRef } from 'react';
import { BHAVI_PAYMENT } from '@/types/sales';
import { fetchCompanyInfo, saveCompanyInfo } from '@/services/settingsService';

interface Props {
    isAdmin: boolean;
    onClose: () => void;
}

const paymentDetailsText = () => {
    const p = BHAVI_PAYMENT;
    return `BHAVI ELECTRONICS — Payment Details\n🏦 Bank: ${p.bank}\n🔢 A/C No: ${p.account} (${p.type})\n🏢 Branch: ${p.branch}\n🔑 IFSC: ${p.ifsc}\n🧾 GSTIN: ${p.gstin}\n🆔 PAN: ${p.pan}`;
};

export default function PaymentQrModal({ isAdmin, onClose }: Props) {
    const [qrUrl, setQrUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const fileRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');
    const [showLightbox, setShowLightbox] = useState(false);

    useEffect(() => {
        fetchCompanyInfo().then(ci => { setQrUrl(ci?.upi_qr_url || null); setLoading(false); });
    }, []);

    const handleShare = async () => {
        const text = paymentDetailsText();
        try {
            if (qrUrl && (navigator as any).canShare) {
                const blob = await (await fetch(qrUrl)).blob();
                const file = new File([blob], 'Bhavi_Payment_QR.png', { type: blob.type || 'image/png' });
                if ((navigator as any).canShare({ files: [file] })) {
                    await (navigator as any).share({ files: [file], title: 'Bhavi Electronics — Payment', text });
                    return;
                }
            }
        } catch (e: any) { if (e?.name === 'AbortError') return; }
        try {
            if (navigator.share) { await navigator.share({ title: 'Bhavi Electronics — Payment', text: text + (qrUrl ? `\n\nQR: ${qrUrl}` : '') }); return; }
        } catch (e: any) { if (e?.name === 'AbortError') return; }
        window.open(`https://wa.me/?text=${encodeURIComponent(text + (qrUrl ? `\n\nQR: ${qrUrl}` : ''))}`, '_blank');
    };

    const handleCopy = () => {
        const text = paymentDetailsText();
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(text).then(() => alert('✅ Payment details copied!')).catch(() => prompt('Copy the details:', text));
        } else prompt('Copy the details:', text);
    };

    const handleDownload = async () => {
        if (!qrUrl) return;
        try {
            const blob = await (await fetch(qrUrl)).blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'Bhavi_Payment_QR.png';
            document.body.appendChild(a); a.click(); a.remove();
        } catch { window.open(qrUrl, '_blank'); }
    };

    const handleUpload = async () => {
        const file = fileRef.current?.files?.[0];
        if (!file) { setUploadStatus('Select a file first'); return; }
        setUploading(true);
        setUploadStatus('Uploading...');
        try {
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            await saveCompanyInfo({ upi_qr_url: base64 });
            setQrUrl(base64);
            setUploadStatus('✅ QR saved — visible on all devices!');
        } catch (e: any) {
            setUploadStatus('Error: ' + e.message);
        } finally {
            setUploading(false);
        }
    };

    const p = BHAVI_PAYMENT;

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, maxHeight: '92vh', overflowY: 'auto' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: 17 }}>💳 Payment QR — Bhavi Electronics</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ padding: '14px 18px' }}>
                    {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 20 }}>Loading...</p> : (
                        <>
                            {qrUrl ? (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                                        <img
                                            src={`${qrUrl}${qrUrl.startsWith('data:') ? '' : `?t=${Date.now()}`}`}
                                            alt="Payment QR"
                                            style={{ width: 230, height: 230, objectFit: 'contain', borderRadius: 12, border: '2px solid #bfdbfe', background: '#fff', cursor: 'pointer' }}
                                            onClick={() => setShowLightbox(true)}
                                        />
                                    </div>
                                    <div style={{ textAlign: 'center', fontSize: 12, color: '#64748b', marginBottom: 10 }}>Customer can scan &amp; pay via any UPI app (GPay / PhonePe / Paytm / BHIM)</div>
                                </>
                            ) : (
                                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 14, textAlign: 'center', fontSize: 13, color: '#92400e', marginBottom: 10 }}>
                                    ⚠️ Payment QR is not uploaded yet.{isAdmin ? ' Upload it below.' : ' Ask Admin to upload it.'}
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                                {qrUrl && <button onClick={handleShare} style={{ padding: '6px 14px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>📤 Share</button>}
                                <button onClick={handleCopy} style={{ padding: '6px 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>📋 Copy Details</button>
                                {qrUrl && <button onClick={handleDownload} style={{ padding: '6px 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>⬇️ Download QR</button>}
                            </div>
                            <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10, padding: 6, marginBottom: 10 }}>
                                <table style={{ width: '100%' }}>
                                    <tbody>
                                        {[['Name', 'BHAVI ELECTRONICS'], ['Bank', p.bank], ['A/C No', p.account], ['Type', p.type], ['Branch', p.branch], ['IFSC', p.ifsc], ['GSTIN', p.gstin], ['PAN', p.pan]].map(([k, v]) => (
                                            <tr key={k}>
                                                <td style={{ padding: '4px 8px', color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' }}>{k}</td>
                                                <td style={{ padding: '4px 8px', fontSize: 12, fontWeight: 700, wordBreak: 'break-all' }}>{v}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {isAdmin && (
                                <div style={{ borderTop: '1px dashed #e5e7eb', paddingTop: 10, fontSize: 12 }}>
                                    <b>{qrUrl ? 'Change' : 'Upload'} QR (Admin):</b> <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} disabled={uploading} style={{ fontSize: 12 }} />
                                    {uploadStatus && <div style={{ marginTop: 6 }}>{uploadStatus}</div>}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            {showLightbox && qrUrl && (
                // index.html:25275-25282 showPhotoFull() — full-screen click-to-close lightbox.
                <div
                    onClick={(e) => { e.stopPropagation(); setShowLightbox(false); }}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                    <img
                        src={`${qrUrl}${qrUrl.startsWith('data:') ? '' : `?t=${Date.now()}`}`}
                        alt="Payment QR"
                        style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                    />
                </div>
            )}
        </div>
    );
}