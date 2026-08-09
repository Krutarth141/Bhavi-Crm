'use client';

import { useState, useRef, useEffect } from 'react';
import { fetchTodayMaxReading, saveKmLog } from '@/services/kmTrackingService';

interface Props {
    type: 'opening' | 'arrival' | 'closing';
    engId: string;
    engName: string;
    ticketId?: string | null;
    onClose: () => void;
    onDone: () => void;
}

const TITLES: Record<string, string> = { opening: '🏢 Opening KM — Day Start', arrival: '📍 Arrival KM — Reached Customer', closing: '🏁 Closing KM — Day End' };

export default function KmCaptureModal({ type, engId, engName, ticketId, onClose, onDone }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [photo, setPhoto] = useState<string | null>(null);
    const [reading, setReading] = useState('');
    const [loc, setLoc] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
    const [gpsStatus, setGpsStatus] = useState<'pending' | 'ready' | 'error'>('pending');
    const [prevMax, setPrevMax] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [camError, setCamError] = useState('');

    const startCamera = () => {
        setCamError('');
        navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } } })
            .then((stream) => {
                streamRef.current = stream;
                if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
            })
            .catch(() => setCamError('⚠️ Camera not available — please allow camera permission.'));
    };

    useEffect(() => {
        startCamera();
        navigator.geolocation?.getCurrentPosition(
            (pos) => setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy) }),
            () => setGpsStatus('error'),
            { enableHighAccuracy: true, timeout: 15000 }
        );
        fetchTodayMaxReading(engId).then(setPrevMax);
        return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [engId]);

    useEffect(() => { if (loc) setGpsStatus('ready'); }, [loc]);

    const capture = () => {
        const video = videoRef.current;
        if (!video || video.readyState < 2 || video.videoWidth === 0) { alert('⚠️ Camera is still loading — try again in a second.'); return; }
        const w = Math.min(1280, video.videoWidth);
        const h = Math.round(video.videoHeight * (w / video.videoWidth));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')?.drawImage(video, 0, 0, w, h);
        setPhoto(canvas.toDataURL('image/jpeg', 0.72));
        streamRef.current?.getTracks().forEach((t) => t.stop());
    };

    const retake = () => { setPhoto(null); setReading(''); startCamera(); };

    const handleSave = async () => {
        if (!photo) { alert('📸 Odometer photo is required! Please capture the photo first.'); return; }
        const kmVal = parseFloat(reading);
        if (isNaN(kmVal) || kmVal < 0) { alert('⚠️ Please enter the odometer reading (KM number shown on the meter).'); return; }
        if (prevMax !== null && kmVal < prevMax) {
            alert(`⚠️ Reading (${kmVal}) cannot be less than today's last reading (${prevMax}).\n\nCheck the meter — don't count the last (tenths/decimal) digit.`);
            return;
        }
        setSaving(true);
        const r = await saveKmLog({
            engId, engName, type, ticketId: ticketId || null, odometerKm: kmVal, photoDataUrl: photo,
            lat: loc?.lat ?? null, lng: loc?.lng ?? null, gpsAccuracy: loc?.accuracy ?? null,
        });
        setSaving(false);
        if (!r.success) { alert('❌ Could not save KM entry.\n\nError: ' + r.error); return; }
        onDone();
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 430, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 17 }}>{TITLES[type]}</h2>
                        {type === 'arrival' && ticketId && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Call: {ticketId}</div>}
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ padding: '14px 18px', overflowY: 'auto', flex: 1 }}>
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#92400e', marginBottom: 10 }}>
                        📸 Odometer (meter) photo is <b>mandatory</b>. Live camera only — gallery not allowed. Time &amp; GPS are saved automatically and cannot be edited.
                    </div>
                    {camError && <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 6 }}>{camError} <button onClick={startCamera} style={{ marginLeft: 6, fontSize: 12 }}>🔄 Retry</button></div>}
                    <div style={{ position: 'relative' }}>
                        {!photo ? (
                            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', borderRadius: 10, background: '#000', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
                        ) : (
                            <img src={photo} style={{ width: '100%', borderRadius: 10 }} alt="Odometer" />
                        )}
                        {!photo && (
                            <>
                                <div style={{ position: 'absolute', left: '15%', right: '15%', top: '35%', bottom: '35%', border: '2.5px dashed #fbbf24', borderRadius: 8, pointerEvents: 'none' }} />
                                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 6, textAlign: 'center', color: '#fff', fontSize: 11, fontWeight: 700, textShadow: '0 1px 3px #000', pointerEvents: 'none' }}>Frame the meter&apos;s main numbers (skip the last tenths digit)</div>
                            </>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, margin: '10px 0' }}>
                        {!photo ? (
                            <button onClick={capture} style={{ flex: 1, padding: '10px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>📸 Capture Odometer</button>
                        ) : (
                            <button onClick={retake} style={{ flex: 1, padding: '10px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>🔄 Retake</button>
                        )}
                    </div>
                    <div style={{ marginBottom: 10 }}>
                        <label style={{ fontWeight: 700, fontSize: 13 }}>Odometer Reading (KM) *</label>
                        <input type="number" inputMode="numeric" value={reading} onChange={(e) => setReading(e.target.value)} placeholder={prevMax !== null ? `Last reading today: ${prevMax}` : 'e.g. 25132'} style={{ width: '100%', fontSize: 16, fontWeight: 700, letterSpacing: 1, border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', boxSizing: 'border-box', marginTop: 4 }} />
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Type the reading shown on the meter photo (skip the last tenths digit).</div>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
                        📍 GPS: {gpsStatus === 'ready' ? <span style={{ color: '#15803d', fontWeight: 700 }}>✅ Captured (±{loc?.accuracy}m)</span> : gpsStatus === 'error' ? <span style={{ color: '#dc2626' }}>⚠️ Not available</span> : 'Getting location...'}
                        &nbsp;|&nbsp; 🕐 {new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '10px', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
                        {saving ? 'Saving...' : '💾 Save KM Entry'}
                    </button>
                </div>
            </div>
        </div>
    );
}