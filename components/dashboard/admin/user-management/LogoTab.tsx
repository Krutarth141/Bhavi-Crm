'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const fieldStyle = {
    width: '100%', padding: '8px 12px', border: '1px solid var(--border)',
    borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' as const,
};

export default function LogoTab() {
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    // Company info state
    const [companyName, setCompanyName] = useState('BHAVI ELECTRONICS');
    const [companyPhone, setCompanyPhone] = useState('');
    const [companyEmail, setCompanyEmail] = useState('');
    const [companyAddress, setCompanyAddress] = useState('');
    const [savingInfo, setSavingInfo] = useState(false);

    const fileRef = useRef<HTMLInputElement>(null);

    // ── Fetch logo + company info ──────────────────────────────────────────────

    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await supabase
                    .from('company_info')
                    .select('*')
                    .single();
                if (data) {
                    setLogoUrl(data.logo_url || null);
                    setCompanyName(data.company_name || 'BHAVI ELECTRONICS');
                    setCompanyPhone(data.phone || '');
                    setCompanyEmail(data.email || '');
                    setCompanyAddress(data.address || '');
                }
            } catch {
                // company_info may not exist yet — ok
            }
        };
        load();
    }, []);

    const showMsg = (msg: string, error = false) => {
        setMessage(msg);
        setIsError(error);
        setTimeout(() => setMessage(''), 3000);
    };

    // ── Upload logo ────────────────────────────────────────────────────────────

    const handleUpload = async () => {
        const file = fileRef.current?.files?.[0];
        if (!file) { showMsg('Select a file first', true); return; }
        if (file.size > 2 * 1024 * 1024) { showMsg('Max 2MB allowed', true); return; }

        setUploading(true);
        try {
            // Convert to base64
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            // Upsert into company_info
            const { error } = await supabase
                .from('company_info')
                .upsert([{ id: 1, logo_url: base64, company_name: companyName }]);

            if (error) throw error;
            setLogoUrl(base64);
            if (fileRef.current) fileRef.current.value = '';
            showMsg('✅ Logo uploaded successfully!');
        } catch (e: any) {
            showMsg('Upload failed: ' + e.message, true);
        } finally {
            setUploading(false);
        }
    };

    // ── Remove logo ────────────────────────────────────────────────────────────

    const handleRemove = async () => {
        if (!confirm('Remove company logo?')) return;
        try {
            await supabase.from('company_info').upsert([{ id: 1, logo_url: null }]);
            setLogoUrl(null);
            showMsg('Logo removed');
        } catch (e: any) {
            showMsg('Failed: ' + e.message, true);
        }
    };

    // ── Save company info ──────────────────────────────────────────────────────

    const handleSaveInfo = async () => {
        setSavingInfo(true);
        try {
            const { error } = await supabase
                .from('company_info')
                .upsert([{
                    id: 1,
                    company_name: companyName,
                    phone: companyPhone,
                    email: companyEmail,
                    address: companyAddress,
                }]);
            if (error) throw error;
            showMsg('✅ Company info saved!');
        } catch (e: any) {
            showMsg('Failed: ' + e.message, true);
        } finally {
            setSavingInfo(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {message && (
                <div style={{
                    padding: '10px 14px', borderRadius: 6, fontSize: 13,
                    background: isError ? '#fee2e2' : '#d1fae5',
                    color: isError ? '#dc2626' : '#065f46',
                }}>
                    {message}
                </div>
            )}

            {/* Logo upload */}
            <div className="card">
                <h3 style={{ marginTop: 0, marginBottom: 16 }}>🖼️ Company Logo</h3>

                {/* Preview */}
                <div style={{ marginBottom: 16 }}>
                    {logoUrl ? (
                        <img
                            src={logoUrl}
                            alt="Company Logo"
                            style={{ maxHeight: 80, maxWidth: 200, border: '1px solid var(--border)', borderRadius: 8, padding: 4 }}
                        />
                    ) : (
                        <div style={{ padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                            No logo uploaded
                        </div>
                    )}
                </div>

                {/* Upload */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={() => {
                            const name = fileRef.current?.files?.[0]?.name;
                            if (name) setMessage('Selected: ' + name);
                        }}
                    />
                    <button
                        onClick={() => fileRef.current?.click()}
                        style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontSize: 13, background: 'transparent' }}
                    >
                        📁 Choose File
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={uploading}
                        style={{ padding: '8px 14px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, cursor: uploading ? 'not-allowed' : 'pointer', fontSize: 13, opacity: uploading ? 0.6 : 1 }}
                    >
                        {uploading ? 'Uploading...' : '⬆️ Upload'}
                    </button>
                    {logoUrl && (
                        <button
                            onClick={handleRemove}
                            style={{ padding: '8px 14px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                        >
                            🗑️ Remove
                        </button>
                    )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                    PNG, JPG, SVG — Max 2MB
                </div>
            </div>

            {/* Company info */}
            <div className="card">
                <h3 style={{ marginTop: 0, marginBottom: 16 }}>🏢 Company Information</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 14 }}>Company Name</label>
                            <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} style={fieldStyle} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 14 }}>Phone</label>
                            <input type="tel" placeholder="+91 98765 43210" value={companyPhone} onChange={e => setCompanyPhone(e.target.value)} style={fieldStyle} />
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 14 }}>Email</label>
                        <input type="email" placeholder="contact@bhavi.com" value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} style={fieldStyle} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 14 }}>Address</label>
                        <textarea
                            placeholder="Company address..."
                            value={companyAddress}
                            onChange={e => setCompanyAddress(e.target.value)}
                            rows={3}
                            style={{ ...fieldStyle, resize: 'vertical' }}
                        />
                    </div>
                    <button
                        onClick={handleSaveInfo}
                        disabled={savingInfo}
                        style={{ padding: '8px 16px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, cursor: savingInfo ? 'not-allowed' : 'pointer', fontSize: 14, opacity: savingInfo ? 0.6 : 1, alignSelf: 'flex-start' }}
                    >
                        {savingInfo ? 'Saving...' : '💾 Save Info'}
                    </button>
                </div>
            </div>
        </div>
    );
}