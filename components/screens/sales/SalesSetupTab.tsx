'use client';

import { useRef, useState } from 'react';
import { BHAVI_PAYMENT } from '@/types/sales';
import { saveCompanyInfo } from '@/services/settingsService';

interface Props {
    upiQrUrl: string | null;
    onUpdated: () => void;
}

export default function SalesSetupTab({ upiQrUrl, onUpdated }: Props) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [status, setStatus] = useState('');
    const [uploading, setUploading] = useState(false);

    const handleUpload = async () => {
        const file = fileRef.current?.files?.[0];
        if (!file) { setStatus('Select a file first'); return; }
        setUploading(true);
        try {
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            await saveCompanyInfo({ upi_qr_url: base64 });
            setStatus('✅ QR saved — visible on all devices!');
            onUpdated();
        } catch (e: any) {
            setStatus('Error: ' + e.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={{ maxWidth: 500 }}>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>📱 UPI QR Code Setup</h2>
                <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7 }}>
                    Upload your UPI QR code once — it is stored on the server and will appear on <b>all devices</b> automatically.<br />
                    <span style={{ fontSize: 11 }}>Works with: GPay, PhonePe, Paytm, BHIM, any UPI app</span>
                </p>
                {upiQrUrl ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                        <img src={upiQrUrl} style={{ width: 110, height: 110, objectFit: 'contain', border: '2px solid #e2e8f0', borderRadius: 10 }} />
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>✅ QR Code Active</div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>Visible on all devices</div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>Included in all payment messages</div>
                        </div>
                    </div>
                ) : (
                    <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>No QR code uploaded yet.</div>
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: 10, padding: 14, cursor: 'pointer' }}>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={() => setStatus(fileRef.current?.files?.[0] ? `Selected: ${fileRef.current.files[0].name}` : '')} />
                    <span style={{ fontSize: 22 }}>📷</span>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{upiQrUrl ? 'Replace UPI QR Code' : 'Upload UPI QR Code'}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>Click to browse — JPG or PNG</div>
                    </div>
                </label>
                <button onClick={handleUpload} disabled={uploading} style={{ marginTop: 10, padding: '8px 16px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, opacity: uploading ? 0.6 : 1 }}>{uploading ? 'Uploading...' : 'Save QR Code'}</button>
                {status && <div style={{ marginTop: 8, fontSize: 12 }}>{status}</div>}
            </div>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>🏦 Bank Details</h2>
                <div style={{ fontSize: 13, lineHeight: 2.1 }}>
                    <b>Bank:</b> {BHAVI_PAYMENT.bank}<br /><b>Account Name:</b> {BHAVI_PAYMENT.name}<br />
                    <b>Account No:</b> {BHAVI_PAYMENT.account}<br /><b>Account Type:</b> {BHAVI_PAYMENT.type}<br />
                    <b>IFSC Code:</b> {BHAVI_PAYMENT.ifsc}<br /><b>Branch:</b> {BHAVI_PAYMENT.branch}<br />
                    <b>GSTIN:</b> {BHAVI_PAYMENT.gstin}
                </div>
                <div style={{ fontSize: 12, color: '#10b981', marginTop: 10 }}>✅ Auto-included in all payment WhatsApp messages.</div>
            </div>
        </div>
    );
}