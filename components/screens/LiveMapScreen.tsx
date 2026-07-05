'use client';

import { useState } from 'react';
import { useLiveMap } from '@/hooks/useLiveMap';
import { timeAgo, isOnline } from '@/types/liveMap';

export default function LiveMapScreen() {
    const { locations, engineers, latestByEng, loading, lastRefresh, onlineCount, refetch } = useLiveMap();
    const [selected, setSelected] = useState<string | null>(null);

    const sel = selected ? latestByEng[selected] : null;

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>📍 Live Map</h1>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Last refreshed: {lastRefresh.toLocaleTimeString('en-IN')} | Auto-refresh every 2 min</div>
                </div>
                <button onClick={refetch} disabled={loading} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontSize: 13, background: 'white', opacity: loading ? 0.6 : 1 }}>🔄 Refresh</button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
                {[
                    { label: 'Total Engineers', value: engineers.length, color: '#185FA5' },
                    { label: '🟢 Online', value: onlineCount, color: '#059669' },
                    { label: '⚫ Offline/Unknown', value: engineers.length - onlineCount, color: '#6b7280' },
                ].map(s => (
                    <div key={s.label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</p> : (
                <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
                    {/* Engineer list */}
                    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, fontSize: 14 }}>👷 Engineers</div>
                        {engineers.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#6b7280', padding: 20, fontSize: 13 }}>No location data yet</p>
                        ) : (
                            engineers.map(eng => {
                                const online_ = isOnline(eng.timestamp);
                                const isSel = selected === eng.eng_name;
                                return (
                                    <div key={eng.eng_name} onClick={() => setSelected(isSel ? null : (eng.eng_name || null))} style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: isSel ? '#eff6ff' : 'white', borderLeft: isSel ? '3px solid #185FA5' : '3px solid transparent' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ fontWeight: 600, fontSize: 14 }}>{eng.eng_name}</div>
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: online_ ? '#059669' : '#d1d5db' }} />
                                        </div>
                                        {eng.address && <div style={{ fontSize: 12, color: '#374151', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {eng.address}</div>}
                                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{timeAgo(eng.timestamp)}{eng.battery !== undefined ? ` | 🔋 ${eng.battery}%` : ''}</div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Detail panel */}
                    {sel ? (
                        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
                                <div style={{ fontWeight: 700, fontSize: 16 }}>{sel.eng_name}</div>
                                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: isOnline(sel.timestamp) ? '#d1fae5' : '#f3f4f6', color: isOnline(sel.timestamp) ? '#065f46' : '#6b7280' }}>
                                        {isOnline(sel.timestamp) ? '🟢 Online' : '⚫ Offline'}
                                    </span>
                                    <span style={{ fontSize: 12, color: '#6b7280', padding: '2px 0' }}>{timeAgo(sel.timestamp)}</span>
                                </div>
                            </div>
                            <div style={{ padding: 16 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                    {[
                                        { label: 'Last Address', value: sel.address || '—' },
                                        { label: 'Coordinates', value: sel.lat && sel.lng ? `${sel.lat.toFixed(4)}, ${sel.lng.toFixed(4)}` : '—' },
                                        { label: 'Battery', value: sel.battery !== undefined ? `${sel.battery}%` : '—' },
                                        { label: 'Last Updated', value: sel.timestamp ? new Date(sel.timestamp).toLocaleString('en-IN') : '—' },
                                    ].map(item => (
                                        <div key={item.label} style={{ background: '#f9fafb', borderRadius: 6, padding: '10px 12px' }}>
                                            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>{item.label}</div>
                                            <div style={{ fontSize: 13, fontWeight: 500 }}>{item.value}</div>
                                        </div>
                                    ))}
                                </div>
                                {sel.lat && sel.lng ? (
                                    <a href={`https://maps.google.com/?q=${sel.lat},${sel.lng}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#185FA5', color: '#fff', borderRadius: 6, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                                        🗺️ Open in Google Maps
                                    </a>
                                ) : (
                                    <div style={{ color: '#6b7280', fontSize: 13 }}>No coordinates available</div>
                                )}
                            </div>
                            {/* History */}
                            <div style={{ borderTop: '1px solid #e5e7eb', padding: 16 }}>
                                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>📍 Location History</div>
                                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                                    {locations.filter(l => l.eng_name === sel.eng_name).slice(0, 10).map(l => (
                                        <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontSize: 12 }}>
                                            <span style={{ color: '#374151', flex: 1 }}>{l.address || `${l.lat?.toFixed(4)}, ${l.lng?.toFixed(4)}` || '—'}</span>
                                            <span style={{ color: '#9ca3af', marginLeft: 8, whiteSpace: 'nowrap' }}>{timeAgo(l.timestamp)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: 40, minHeight: 300 }}>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
                            <div style={{ fontWeight: 600, fontSize: 15, color: '#374151' }}>Select an engineer</div>
                            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Click to view location details</div>
                        </div>
                    )}
                </div>
            )}
            <div style={{ marginTop: 16, padding: '10px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, fontSize: 12, color: '#1e40af' }}>
                💡 Location data updates when engineers use the mobile app with location tracking enabled.
            </div>
        </div>
    );
}