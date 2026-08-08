'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
    mode: 'in' | 'out';
    onSubmit: (data: { photo: string; lat: number | null; lng: number | null; meter: string; remark?: string }) => Promise<{ success: boolean; error?: string; needsRemark?: boolean }>;
    onClose: () => void;
}

export default function PunchModal({ mode, onSubmit, onClose }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [photo, setPhoto] = useState<string | null>(null);
    const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
    const [gpsStatus, setGpsStatus] = useState<'pending' | 'ready' | 'error'>('pending');
    const [meter, setMeter] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [needsRemark, setNeedsRemark] = useState(false);
    const [remark, setRemark] = useState('');

    useEffect(() => {
        let mounted = true;
        navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user' } }).then((stream) => {
            if (!mounted) { stream.getTracks().forEach((t) => t.stop()); return; }
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
        }).catch(() => setError('Could not access camera. Please allow camera permission.'));

        navigator.geolocation?.getCurrentPosition(
            (pos) => { setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsStatus('ready'); },
            () => setGpsStatus('error'),
            { enableHighAccuracy: true, timeout: 15000 }
        );

        return () => {
            mounted = false;
            streamRef.current?.getTracks().forEach((t) => t.stop());
        };
    }, []);

    const capture = () => {
        const video = videoRef.current;
        if (!video) return;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setPhoto(canvas.toDataURL('image/jpeg', 0.7));
    };

    const retake = () => setPhoto(null);

    const handleSubmit = async () => {
        if (!photo) { setError('Please take a selfie first.'); return; }
        if (!loc) { setError('GPS location is required. Please allow location access.'); return; }
        if (needsRemark && !remark.trim()) { setError('A reason is required.'); return; }
        setSubmitting(true);
        setError('');
        try {
            const result = await onSubmit({ photo, lat: loc.lat, lng: loc.lng, meter, remark: needsRemark ? remark : undefined });
            if (!result.success) {
                if (result.needsRemark) { setNeedsRemark(true); setError(result.error || 'A reason is required.'); return; }
                setError(result.error || 'Failed.');
                return;
            }
            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={boxStyle} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <h3 style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>{mode === 'in' ? '▶ Punch In' : '⏹ Punch Out'}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                    <span style={{ ...chipStyle, ...(gpsStatus === 'ready' ? chipReady : gpsStatus === 'error' ? chipError : chipPending) }}>
                        📍 {gpsStatus === 'ready' ? 'GPS Ready' : gpsStatus === 'error' ? 'GPS Not Available' : 'Fetching GPS...'}
                    </span>
                    <span style={{ ...chipStyle, ...(photo ? chipReady : chipPending) }}>
                        📸 {photo ? 'Selfie Captured' : 'Selfie Pending'}
                    </span>
                </div>

                {!photo ? (
                    <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', maxHeight: 240, borderRadius: 10, background: '#000', transform: 'scaleX(-1)' }} />
                ) : (
                    <img src={photo} style={{ width: '100%', maxHeight: 240, borderRadius: 10, objectFit: 'cover' }} alt="Selfie preview" />
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 8, marginBottom: 12 }}>
                    {!photo ? (
                        <button onClick={capture} style={{ ...btnPrimary, flex: 1 }}>📸 Take Selfie</button>
                    ) : (
                        <button onClick={retake} style={{ ...btnSecondary, flex: 1 }}>🔄 Retake</button>
                    )}
                </div>

                <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>
                        {mode === 'in' ? 'Start' : 'End'} Meter Reading (optional)
                    </label>
                    <input type="number" value={meter} onChange={(e) => setMeter(e.target.value)} placeholder="Odometer / meter reading" style={inputStyle} />
                </div>

                {needsRemark && (
                    <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', display: 'block', marginBottom: 4 }}>
                            ⚠️ Late / Next-Day Punch Out — Reason Required (Admin approval needed)
                        </label>
                        <textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                    </div>
                )}

                {error && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 10 }}>{error}</div>}

                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={onClose} style={{ ...btnSecondary, flex: 1 }}>Cancel</button>
                    <button onClick={handleSubmit} disabled={submitting || !photo || !loc} style={{ ...btnPrimary, flex: 2, opacity: (submitting || !photo || !loc) ? 0.5 : 1 }}>
                        {submitting ? 'Submitting...' : mode === 'in' ? '✅ Punch In' : '⏹ Punch Out'}
                    </button>
                </div>
            </div>
        </div>
    );
}

const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 };
const boxStyle: React.CSSProperties = { background: '#fff', borderRadius: 14, padding: 20, width: 380, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' };
const chipStyle: React.CSSProperties = { fontSize: 12, padding: '4px 10px', borderRadius: 20, fontWeight: 600 };
const chipPending: React.CSSProperties = { background: '#fef3c7', color: '#92400e' };
const chipReady: React.CSSProperties = { background: '#d1fae5', color: '#065f46' };
const chipError: React.CSSProperties = { background: '#fee2e2', color: '#991b1b' };
const btnPrimary: React.CSSProperties = { padding: 8, background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const btnSecondary: React.CSSProperties = { padding: 8, background: '#64748b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' };