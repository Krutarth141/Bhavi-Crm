'use client';

import { useEffect, useRef, useState } from 'react';
import { SERVICE_GALLERY_OPTIONS, ServiceGalleryPhoto } from '@/types/masters';
import { fetchServiceGalleryPhotos, uploadServiceGalleryPhoto, deleteServiceGalleryPhoto } from '@/services/masterService';

export default function ServiceGalleryTab() {
    const [photos, setPhotos] = useState<ServiceGalleryPhoto[]>([]);
    const [loading, setLoading] = useState(true);
    const [serviceId, setServiceId] = useState(SERVICE_GALLERY_OPTIONS[0].id);
    const [caption, setCaption] = useState('');
    const [preview, setPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState<{ msg: string; ok: boolean } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const load = async () => {
        setLoading(true);
        setPhotos(await fetchServiceGalleryPhotos());
        setLoading(false);
    };
    useEffect(() => { load(); }, []);

    const handleFileChange = () => {
        const file = fileRef.current?.files?.[0];
        if (!file) { setPreview(null); return; }
        const reader = new FileReader();
        reader.onload = e => setPreview(e.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleAdd = async () => {
        const file = fileRef.current?.files?.[0];
        if (!serviceId || !file) { alert('Service and photo required'); return; }
        if (file.size > 5 * 1024 * 1024) { alert('File too large — max 5MB'); return; }
        setUploading(true);
        setStatus({ msg: '⏳ Uploading photo...', ok: true });
        const r = await uploadServiceGalleryPhoto(serviceId, file, caption.trim());
        setUploading(false);
        if (r.success) {
            setStatus({ msg: '✅ Photo uploaded successfully!', ok: true });
            setCaption('');
            setPreview(null);
            if (fileRef.current) fileRef.current.value = '';
            await load();
        } else {
            setStatus({ msg: `❌ Error: ${r.error}`, ok: false });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this photo?')) return;
        await deleteServiceGalleryPhoto(id);
        await load();
    };

    const svcName = (id: string) => SERVICE_GALLERY_OPTIONS.find(s => s.id === id)?.name || id;

    return (
        <div>
            <div className="card" style={{ marginBottom: 12 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>📸 Add Service Photo</h3>
                <div style={{ display: 'grid', gap: 10 }}>
                    <div className="form-group">
                        <label>Service</label>
                        <select value={serviceId} onChange={e => setServiceId(e.target.value)} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, width: '100%' }}>
                            {SERVICE_GALLERY_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Photo Upload</label>
                        <div style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: 16, textAlign: 'center', cursor: 'pointer', background: '#fafafa' }} onClick={() => fileRef.current?.click()}>
                            <div style={{ fontSize: 28, marginBottom: 4 }}>📷</div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Click to select photo</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>JPG, PNG, WEBP — max 5MB</div>
                        </div>
                        <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                        {preview && (
                            <div style={{ marginTop: 8 }}>
                                <img src={preview} style={{ maxHeight: 120, borderRadius: 8, border: '1px solid var(--border)' }} />
                                <button onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = ''; }} style={{ marginLeft: 8, background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 12 }}>✕ Remove</button>
                            </div>
                        )}
                    </div>
                    <div className="form-group">
                        <label>Caption (optional)</label>
                        <input type="text" value={caption} onChange={e => setCaption(e.target.value)} placeholder="e.g. Home automation project in Ahmedabad" style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, width: '100%' }} />
                    </div>
                    {status && <div style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8, background: status.ok ? '#eff6ff' : '#fef2f2', color: status.ok ? '#1d4ed8' : '#dc2626' }}>{status.msg}</div>}
                    <button className="btn btn-primary" onClick={handleAdd} disabled={uploading}>➕ Add Photo</button>
                </div>
            </div>
            <div className="card">
                <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Current Photos</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
                    {loading ? (
                        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
                    ) : photos.length === 0 ? (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>No photos yet.</div>
                    ) : photos.map(p => (
                        <div key={p.id} style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                            <img src={p.image_url} style={{ width: '100%', height: 100, objectFit: 'cover' }} />
                            <div style={{ padding: '6px 8px' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)' }}>{svcName(p.service_id)}</div>
                                {p.caption && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{p.caption}</div>}
                                <button onClick={() => handleDelete(p.id)} style={{ marginTop: 6, background: 'none', border: 'none', color: 'var(--danger)', fontSize: 11, cursor: 'pointer', padding: 0 }}>🗑️ Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}