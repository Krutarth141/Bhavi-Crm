'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface LocPoint {
    eng_id: string;
    eng_name: string;
    lat: number;
    lng: number;
    event_type?: string;
    recorded_at: string;
    ticket_id?: string;
}

interface EngGroup {
    eid: string;
    name: string;
    points: LocPoint[];
    latest: LocPoint | null;
    totalKm: number;
    color: string;
}

// Office logins that don't need live GPS tracking — mirrors HTML's LIVE_TRACKING_EXCLUDED_IDS.
const LIVE_TRACKING_EXCLUDED_IDS = ['WC001', 'WC002', 'ACCT001'];

const NAMED_COLORS: Record<string, string> = {
    yogesh: '#2563eb', shailesh: '#dc2626', hiren: '#16a34a', jay: '#ec4899',
    gaurav: '#111827', dharmesh: '#fb923c', anjana: '#6b7280',
};
const FALLBACK_COLORS = ['#7c3aed', '#0891b2', '#ca8a04', '#4338ca', '#92400e', '#0e7490', '#a21caf'];

const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const todayStr = () => new Date().toLocaleDateString('en-CA');

function loadLeaflet(): Promise<any> {
    return new Promise((resolve, reject) => {
        if ((window as any).L) { resolve((window as any).L); return; }
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(css);
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => resolve((window as any).L);
        script.onerror = reject;
        document.body.appendChild(script);
    });
}

export default function LiveMapScreen() {
    const mapDivRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<any>(null);
    const layersRef = useRef<{ street: any; satellite: any } | null>(null);
    const [date, setDate] = useState(todayStr());
    const [layer, setLayer] = useState<'street' | 'satellite'>('street');
    const [loading, setLoading] = useState(true);
    const [engGroups, setEngGroups] = useState<EngGroup[]>([]);
    const [refreshTick, setRefreshTick] = useState(0);

    const load = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('engineer_locations')
                .select('eng_id, eng_name, lat, lng, event_type, recorded_at, ticket_id')
                .eq('session_date', date)
                .order('recorded_at', { ascending: true })
                .limit(2000);
            if (error) throw error;

            const L = await loadLeaflet();
            if (!mapDivRef.current) return;

            if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
            (mapDivRef.current as any)._leaflet_id = null;

            const map = L.map(mapDivRef.current).setView([23.0225, 72.5714], 11);
            mapRef.current = map;
            const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 });
            const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: '© Esri World Imagery', maxZoom: 19 });
            layersRef.current = { street: streetLayer, satellite: satelliteLayer };
            (layer === 'satellite' ? satelliteLayer : streetLayer).addTo(map);

            const engMap: Record<string, EngGroup> = {};
            let fallbackIdx = 0;
            const colorForEng = (name: string) => {
                const first = (name || '').trim().split(' ')[0].toLowerCase();
                if (NAMED_COLORS[first]) return NAMED_COLORS[first];
                const c = FALLBACK_COLORS[fallbackIdx % FALLBACK_COLORS.length];
                fallbackIdx++;
                return c;
            };

            (data || []).forEach((l: any) => {
                if (LIVE_TRACKING_EXCLUDED_IDS.includes(l.eng_id)) return;
                if (!l.lat || !l.lng) return;
                if (!engMap[l.eng_id]) engMap[l.eng_id] = { eid: l.eng_id, name: l.eng_name, points: [], latest: null, totalKm: 0, color: colorForEng(l.eng_name) };
                engMap[l.eng_id].points.push(l);
                engMap[l.eng_id].latest = l;
            });

            const bounds: [number, number][] = [];

            Object.values(engMap).forEach((eng) => {
                let totalKm = 0;
                for (let i = 1; i < eng.points.length; i++) {
                    const d = haversineKm(eng.points[i - 1].lat, eng.points[i - 1].lng, eng.points[i].lat, eng.points[i].lng);
                    if (d >= 0.1 && d < 5) totalKm += d;
                }
                eng.totalKm = Math.round(totalKm * 10) / 10;

                const pts = eng.points.map((p) => [p.lat, p.lng]);
                if (pts.length > 1) {
                    L.polyline(pts, { color: eng.color, weight: 3, opacity: 0.6 }).addTo(map)
                        .bindPopup(`<b>${eng.name}</b><br>🛣️ Total: <b>${eng.totalKm} km</b><br>📍 ${eng.points.length} points`);
                }

                eng.points.forEach((p) => {
                    const evtIcon = p.event_type === 'punch_in' ? '🟢' : p.event_type === 'punch_out' ? '🔴' : p.event_type === 'ticket_close' ? '✅' : '📍';
                    const size = p.event_type === 'track' ? 8 : 14;
                    const circle = L.circleMarker([p.lat, p.lng], { radius: size, fillColor: eng.color, color: '#fff', weight: 2, opacity: 1, fillOpacity: 0.85 }).addTo(map);
                    const time = p.recorded_at ? new Date(p.recorded_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-';
                    circle.bindPopup(`<b>${eng.name}</b><br>${evtIcon} ${p.event_type || ''}${p.ticket_id ? `<br>Ticket: ${p.ticket_id}` : ''}<br>🕐 ${time}`);
                    bounds.push([p.lat, p.lng]);
                });

                if (eng.latest) {
                    const latestTime = new Date(eng.latest.recorded_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                    const minsAgo = Math.round((Date.now() - new Date(eng.latest.recorded_at).getTime()) / 60000);
                    const liveLabel = minsAgo <= 5 ? '🟢 LIVE' : minsAgo <= 30 ? `🟡 ${minsAgo}m ago` : `🔴 ${minsAgo}m ago`;
                    const divIcon = L.divIcon({
                        className: '',
                        html: `<div style="background:${eng.color};color:#fff;padding:3px 8px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);">👷 ${eng.name} · ${latestTime}</div>`,
                        iconAnchor: [0, 0],
                    });
                    L.marker([eng.latest.lat, eng.latest.lng], { icon: divIcon }).addTo(map)
                        .bindPopup(`<b>${eng.name}</b><br>Last seen: ${latestTime} (${liveLabel})<br>📍 ${eng.points.length} points tracked`);
                }
            });

            if (bounds.length) map.fitBounds(bounds, { padding: [30, 30] });

            setEngGroups(Object.values(engMap));
        } catch (e) {
            console.error('LiveMap load error:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date, refreshTick]);

    const switchLayer = (l: 'street' | 'satellite') => {
        setLayer(l);
        if (!mapRef.current || !layersRef.current) return;
        const map = mapRef.current;
        Object.values(layersRef.current).forEach((ly: any) => map.hasLayer(ly) && map.removeLayer(ly));
        layersRef.current[l].addTo(map);
    };

    const focusEng = (eng: EngGroup) => {
        if (!mapRef.current || !eng.latest) return;
        mapRef.current.setView([eng.latest.lat, eng.latest.lng], 15);
    };

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>📍 Live Map</h1>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Date</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 12px', fontSize: 13 }} />
                    </div>
                    <button onClick={() => setRefreshTick((t) => t + 1)} style={{ padding: '8px 14px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>🔄 Refresh</button>
                    <div style={{ display: 'flex', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                        <button onClick={() => switchLayer('street')} style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: layer === 'street' ? '#1d4ed8' : '#f8fafc', color: layer === 'street' ? '#fff' : '#374151' }}>🗺️ Map</button>
                        <button onClick={() => switchLayer('satellite')} style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: layer === 'satellite' ? '#1d4ed8' : '#f8fafc', color: layer === 'satellite' ? '#fff' : '#374151' }}>🛰️ Satellite</button>
                    </div>
                </div>
            </div>

            <div ref={mapDivRef} style={{ width: '100%', height: 460, borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb', background: '#e8f4f8' }} />

            <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {loading ? (
                    <span style={{ color: '#6b7280', fontSize: 13 }}>Loading...</span>
                ) : engGroups.length === 0 ? (
                    <span style={{ color: '#6b7280', fontSize: 13 }}>{date} — No location data found</span>
                ) : engGroups.map((eng) => {
                    const minsAgo = eng.latest ? Math.round((Date.now() - new Date(eng.latest.recorded_at).getTime()) / 60000) : null;
                    const liveLabel = minsAgo == null ? '' : minsAgo <= 5 ? '🟢 LIVE' : minsAgo <= 30 ? `🟡 ${minsAgo}m ago` : `🔴 ${minsAgo}m ago`;
                    const latestTime = eng.latest ? new Date(eng.latest.recorded_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
                    return (
                        <span key={eng.eid} onClick={() => focusEng(eng)} style={{ background: eng.color, color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            👷 {eng.name} &nbsp;🛣️ {eng.totalKm} km{latestTime ? ` \u00a0🕐 ${latestTime} · ${liveLabel}` : ''}
                        </span>
                    );
                })}
            </div>

            {!loading && (
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, marginTop: 16, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 700, fontSize: 15 }}>📊 Day Summary — {date}</div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    <th style={{ padding: 8, textAlign: 'left' }}>Engineer</th>
                                    <th style={{ padding: 8 }}>🛣️ GPS KM</th>
                                    <th style={{ padding: 8 }}>Points</th>
                                    <th style={{ padding: 8 }}>First Seen</th>
                                    <th style={{ padding: 8 }}>Last Seen</th>
                                    <th style={{ padding: 8 }}>Ticket Closes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {engGroups.map((eng) => {
                                    const closes = eng.points.filter((p) => p.event_type === 'ticket_close').length;
                                    const first = eng.points[0] ? new Date(eng.points[0].recorded_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-';
                                    const last = eng.latest ? new Date(eng.latest.recorded_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-';
                                    return (
                                        <tr key={eng.eid} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                            <td style={{ padding: 8, fontWeight: 600 }}>{eng.name}</td>
                                            <td style={{ padding: 8, textAlign: 'center', fontWeight: 700, color: '#7c3aed' }}>{eng.totalKm} km</td>
                                            <td style={{ padding: 8, textAlign: 'center' }}>{eng.points.length}</td>
                                            <td style={{ padding: 8, textAlign: 'center' }}>{first}</td>
                                            <td style={{ padding: 8, textAlign: 'center' }}>{last}</td>
                                            <td style={{ padding: 8, textAlign: 'center' }}>{closes || '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div style={{ padding: '10px 16px 14px', fontSize: 12, color: '#9ca3af' }}>
                        ⚠️ GPS KM = auto-calculated from GPS tracking. Actual road distance may be slightly higher.
                    </div>
                </div>
            )}
        </div>
    );
}