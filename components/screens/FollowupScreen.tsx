'use client';

import { useState, useEffect, useCallback } from 'react';
import { FollowupTicket, FollowupFilterType } from '@/types/followup';
import { fetchFollowups, markFollowupDone, snoozeFollowup, setFollowup, searchTicketsForFollowup } from '@/services/followupService';
import { fetchCompanyInfo } from '@/services/settingsService';

const todayStr = () => new Date().toLocaleDateString('en-CA');
const filterColors: Record<FollowupFilterType, string> = { overdue: '#ef4444', today: '#f59e0b', upcoming: '#3b82f6', all: '#6366f1' };

export default function FollowupScreen() {
    const [all, setAll] = useState<FollowupTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FollowupFilterType>('overdue');
    const [setModalOpen, setSetModalOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<{ id: string; cname?: string; mobile?: string }[]>([]);
    const [pickedTicket, setPickedTicket] = useState<{ id: string; cname?: string } | null>(null);
    const [fuDate, setFuDate] = useState(todayStr());
    const [fuNote, setFuNote] = useState('');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setAll(await fetchFollowups());
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const today = todayStr();
    const overdue = all.filter(r => (r.follow_up_date || '') < today);
    const todayList = all.filter(r => r.follow_up_date === today);
    const upcoming = all.filter(r => (r.follow_up_date || '') > today);
    const filtered = filter === 'overdue' ? overdue : filter === 'today' ? todayList : filter === 'upcoming' ? upcoming : all;

    const handleWhatsApp = async (r: FollowupTicket) => {
        const ci = await fetchCompanyInfo();
        const msg = `Dear ${r.cname},\n\nThis is a follow-up from *${ci?.company_name || 'Bhavi Electronics'}*.\n\nRegarding your service request for: *${r.model}*\nIssue: ${r.problem}\n\nPlease contact us to schedule the service.\n\n${ci?.phone ? '📞 ' + ci.phone : ''}`;
        let mob = (r.mobile || '').replace(/\D/g, '');
        if (mob.length === 10) mob = '91' + mob;
        window.open(`https://wa.me/${mob}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleDone = async (id: string) => {
        if (!confirm('Mark this follow-up as done?')) return;
        const r = await markFollowupDone(id);
        if (r.success) await load(); else alert('Error: ' + r.error);
    };

    const handleSnooze = async (id: string) => {
        const r = await snoozeFollowup(id);
        if (r.success) await load(); else alert('Error: ' + r.error);
    };

    const handleSearch = async (v: string) => {
        setQuery(v); setPickedTicket(null);
        if (!v || v.length < 2) { setResults([]); return; }
        setResults(await searchTicketsForFollowup(v));
    };

    const handleSetSave = async () => {
        if (!pickedTicket) { alert('Please select a ticket'); return; }
        setSaving(true);
        const r = await setFollowup(pickedTicket.id, fuDate, fuNote);
        setSaving(false);
        if (r.success) {
            setSetModalOpen(false); setQuery(''); setPickedTicket(null); setFuNote(''); setFuDate(todayStr());
            await load();
        } else alert('Error: ' + r.error);
    };

    return (
        <div style={{ padding: '20px 24px', maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>📞 Follow-up Tracker</h1>
                <button onClick={() => setSetModalOpen(true)} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>+ Set Follow-up</button>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                {([
                    { id: 'overdue', label: '🔴 Overdue' },
                    { id: 'today', label: '📅 Today' },
                    { id: 'upcoming', label: '⏰ Upcoming' },
                    { id: 'all', label: 'All' },
                ] as { id: FollowupFilterType; label: string }[]).map(t => (
                    <button key={t.id} onClick={() => setFilter(t.id)} style={{ padding: '7px 16px', borderRadius: 20, border: `2px solid ${filter === t.id ? filterColors[t.id] : '#e2e8f0'}`, background: filter === t.id ? filterColors[t.id] : '#fff', color: filter === t.id ? '#fff' : '#374151', cursor: 'pointer', fontSize: 13, fontWeight: filter === t.id ? 600 : 400 }}>{t.label}</button>
                ))}
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                {[
                    { icon: '🔴', label: 'Overdue', val: overdue.length, color: '#ef4444' },
                    { icon: '📅', label: 'Today', val: todayList.length, color: '#f59e0b' },
                    { icon: '⏰', label: 'Upcoming', val: upcoming.length, color: '#3b82f6' },
                    { icon: '📋', label: 'Total Open', val: all.length, color: '#6366f1' },
                ].map(c => (
                    <div key={c.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 22 }}>{c.icon}</span>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: c.color }}>{c.val}</div>
                            <div style={{ fontSize: 11, color: '#6b7280' }}>{c.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</p>
                : filtered.length === 0 ? <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No follow-ups in this category.</div>
                    : (
                        <div style={{ display: 'grid', gap: 10 }}>
                            {filtered.map(r => {
                                const isOverdue = (r.follow_up_date || '') < today;
                                const isToday = r.follow_up_date === today;
                                const borderColor = isOverdue ? '#ef4444' : isToday ? '#f59e0b' : '#3b82f6';
                                const badge = isOverdue
                                    ? <span style={{ background: '#fef2f2', color: '#dc2626', padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>🔴 Overdue</span>
                                    : isToday
                                        ? <span style={{ background: '#fffbeb', color: '#d97706', padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>📅 Today</span>
                                        : <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>⏰ {r.follow_up_date}</span>;
                                return (
                                    <div key={r.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, borderLeft: `4px solid ${borderColor}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                            <div>
                                                <div style={{ fontSize: 15, fontWeight: 700 }}>{r.cname}</div>
                                                <div style={{ fontSize: 12, color: '#6b7280' }}>📱 {r.mobile} &nbsp;|&nbsp; 🔧 {r.model} — {r.problem}</div>
                                                {r.assigned_name && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>👷 {r.assigned_name}</div>}
                                            </div>
                                            {badge}
                                        </div>
                                        {r.follow_up_note && <div style={{ marginTop: 8, fontSize: 12, color: '#374151', background: '#f9fafb', padding: '6px 10px', borderRadius: 6 }}>📝 {r.follow_up_note}</div>}
                                        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                                            <button onClick={() => handleWhatsApp(r)} style={{ padding: '5px 12px', border: '1px solid #25d366', borderRadius: 6, color: '#25d366', background: '#fff', cursor: 'pointer', fontSize: 12 }}>📲 WA Remind</button>
                                            <button onClick={() => handleDone(r.id)} style={{ padding: '5px 12px', border: '1px solid #10b981', borderRadius: 6, color: '#10b981', background: '#fff', cursor: 'pointer', fontSize: 12 }}>✅ Mark Done</button>
                                            <button onClick={() => handleSnooze(r.id)} style={{ padding: '5px 12px', border: '1px solid #f59e0b', borderRadius: 6, color: '#f59e0b', background: '#fff', cursor: 'pointer', fontSize: 12 }}>⏰ Snooze 1d</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

            {setModalOpen && (
                <div onClick={() => setSetModalOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420 }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: 17 }}>📞 Set Follow-up</h2>
                            <button onClick={() => setSetModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
                        </div>
                        <div style={{ padding: 20 }}>
                            <div style={{ marginBottom: 10, position: 'relative' }}>
                                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Search Ticket (ID / Customer / Mobile)</label>
                                <input type="text" value={query} onChange={e => handleSearch(e.target.value)} placeholder="Search..." style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box' }} />
                                {results.length > 0 && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, marginTop: 4, maxHeight: 180, overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                        {results.map(t => (
                                            <div key={t.id} onClick={() => { setPickedTicket(t); setQuery(`${t.id} — ${t.cname || ''}`); setResults([]); }} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f1f5f9' }}>
                                                {t.id} — {t.cname} ({t.mobile})
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div style={{ marginBottom: 10 }}>
                                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Follow-up Date</label>
                                <input type="date" value={fuDate} onChange={e => setFuDate(e.target.value)} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Note (optional)</label>
                                <textarea value={fuNote} onChange={e => setFuNote(e.target.value)} rows={2} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }} />
                            </div>
                        </div>
                        <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button onClick={() => setSetModalOpen(false)} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                            <button onClick={handleSetSave} disabled={saving} style={{ padding: '8px 14px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : '✅ Set Follow-up'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}