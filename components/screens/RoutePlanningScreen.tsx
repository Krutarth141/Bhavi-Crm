'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface EngLocation {
    id: string;
    eng_id?: string;
    eng_name?: string;
    lat?: number;
    lng?: number;
    address?: string;
    pincode?: string;
    timestamp?: string;
    created_at?: string;
}

interface Ticket {
    id: string;
    cname?: string;
    mobile?: string;
    address?: string;
    pin?: string;
    assigned_name?: string;
    status?: string;
}

export default function RoutePlanningScreen() {
    const [locations, setLocations] = useState<EngLocation[]>([]);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [engFilter, setEngFilter] = useState('');
    const [engineers, setEngineers] = useState<string[]>([]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [locRes, tixRes] = await Promise.all([
                supabase.from('engineer_locations').select('*').order('timestamp', { ascending: false }).limit(100),
                supabase.from('service_tickets').select('id, cname, mobile, address, pin, assigned_name, status').in('status', ['Pending Allocation', 'In Progress', 'Pending Parts', 'Pending Repair']).order('created_at', { ascending: false }),
            ]);
            const locs = locRes.data || [];
            const tix = tixRes.data || [];
            setLocations(locs);
            setTickets(tix);
            setEngineers([...new Set([
                ...locs.map((l: any) => l.eng_name).filter(Boolean),
                ...tix.map((t: any) => t.assigned_name).filter(Boolean),
            ])].sort());
        } catch (err) { console.error('RoutePlanning load error:', err); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filteredLocations = engFilter ? locations.filter(l => l.eng_name === engFilter) : locations;
    const filteredTickets = engFilter ? tickets.filter(t => t.assigned_name === engFilter) : tickets;

    // Group latest location per engineer
    const latestLocations: Record<string, EngLocation> = {};
    locations.forEach(l => {
        if (l.eng_name && !latestLocations[l.eng_name]) latestLocations[l.eng_name] = l;
    });

    // Group pending tickets per engineer
    const ticketsByEng: Record<string, Ticket[]> = {};
    tickets.forEach(t => {
        const k = t.assigned_name || 'Unassigned';
        if (!ticketsByEng[k]) ticketsByEng[k] = [];
        ticketsByEng[k].push(t);
    });

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>🗺️ Route Planning</h1>
                <button onClick={load} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontSize: 13, background: 'white' }}>🔄 Refresh</button>
            </div>

            {/* Filter */}
            <div style={{ marginBottom: 16 }}>
                <select value={engFilter} onChange={e => setEngFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14 }}>
                    <option value="">All Engineers</option>
                    {engineers.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
            </div>

            {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</p> : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {/* Engineer Last Locations */}
                    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, fontSize: 14 }}>
                            📍 Engineer Last Locations ({Object.keys(latestLocations).length})
                        </div>
                        {Object.keys(latestLocations).length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#6b7280', padding: 20 }}>No location data available</p>
                        ) : (
                            <div>
                                {Object.entries(latestLocations)
                                    .filter(([name]) => !engFilter || name === engFilter)
                                    .map(([name, loc]) => (
                                        <div key={name} style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
                                            <div style={{ fontWeight: 600, marginBottom: 4 }}>{name}</div>
                                            {loc.address && <div style={{ fontSize: 12, color: '#374151', marginBottom: 2 }}>📍 {loc.address}</div>}
                                            {loc.pincode && <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>PIN: {loc.pincode}</div>}
                                            {loc.lat && loc.lng && (
                                                <a href={`https://maps.google.com/?q=${loc.lat},${loc.lng}`} target="_blank" rel="noreferrer"
                                                    style={{ fontSize: 11, color: '#185FA5', textDecoration: 'none' }}>
                                                    🗺️ View on Map
                                                </a>
                                            )}
                                            {loc.timestamp && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Last seen: {new Date(loc.timestamp).toLocaleString('en-IN')}</div>}
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>

                    {/* Pending Tickets by Engineer */}
                    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, fontSize: 14 }}>
                            🎫 Pending Tickets by Engineer ({tickets.length})
                        </div>
                        {Object.keys(ticketsByEng).length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#6b7280', padding: 20 }}>No pending tickets</p>
                        ) : (
                            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                                {Object.entries(ticketsByEng)
                                    .filter(([name]) => !engFilter || name === engFilter)
                                    .sort((a, b) => b[1].length - a[1].length)
                                    .map(([name, tix]) => (
                                        <div key={name} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                            <div style={{ padding: '10px 16px', background: '#f9fafb', fontWeight: 600, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                                                <span>{name}</span>
                                                <span style={{ background: '#dbeafe', color: '#1e40af', padding: '1px 8px', borderRadius: 10, fontSize: 11 }}>{tix.length} pending</span>
                                            </div>
                                            {tix.map(t => (
                                                <div key={t.id} style={{ padding: '8px 16px', borderBottom: '1px solid #f9f9f9' }}>
                                                    <div style={{ fontSize: 13, fontWeight: 500 }}>{t.cname || '—'}</div>
                                                    {t.address && <div style={{ fontSize: 11, color: '#6b7280' }}>📍 {t.address} {t.pin ? `(${t.pin})` : ''}</div>}
                                                    <div style={{ fontSize: 11, color: '#374151', marginTop: 2 }}>
                                                        <span style={{ padding: '1px 6px', borderRadius: 8, background: '#fef3c7', color: '#92400e', fontSize: 10 }}>{t.status}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Note about maps */}
            <div style={{ marginTop: 16, padding: '10px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, fontSize: 12, color: '#1e40af' }}>
                💡 For live map tracking, engineers must have location tracking enabled on their device. Location data updates automatically during field visits.
            </div>
        </div>
    );
}