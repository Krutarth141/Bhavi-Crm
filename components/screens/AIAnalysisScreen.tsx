'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Statuses considered "done" / "cancelled" for these analytics — adapted from
// HTML's TICKET_DONE_STATUSES to the real Next.js status vocabulary
// (types/tickets.ts statusOptions — no 'Delivered'/'Cancelled' status exists here).
const DONE_STATUSES = ['Closed', 'Repaired', 'Pending for Delivery', 'Resolved By Phone'];
const CANCELLED_STATUSES = ['Customer Reject', 'Call Cancel'];
const isDone = (s?: string) => !!s && DONE_STATUSES.includes(s);
const isCancelled = (s?: string) => !!s && CANCELLED_STATUSES.includes(s);
const isActive = (s?: string) => !isDone(s) && !isCancelled(s);

const attToMin = (t?: string): number | null => {
    if (!t) return null;
    const s = String(t).trim();
    const isPM = /pm/i.test(s), isAM = /am/i.test(s);
    const clean = s.replace(/[^0-9:]/g, '');
    const [h0, m0] = clean.split(':');
    let h = parseInt(h0, 10);
    const m = parseInt(m0, 10) || 0;
    if (isNaN(h)) return null;
    if (isPM && h !== 12) h += 12;
    if (isAM && h === 12) h = 0;
    return h * 60 + m;
};

type Gran = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
const GRAN_LIMIT: Record<Gran, number> = { daily: 30, weekly: 12, monthly: 12, quarterly: 8, yearly: 5 };

const bucketKey = (dateStr: string, gran: Gran) => {
    const dt = new Date(dateStr);
    if (gran === 'daily') return dt.toLocaleDateString('en-CA');
    if (gran === 'weekly') {
        const day = dt.getDay();
        const diff = (day === 0 ? -6 : 1) - day;
        const monday = new Date(dt); monday.setDate(dt.getDate() + diff);
        return monday.toLocaleDateString('en-CA');
    }
    if (gran === 'monthly') return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0');
    if (gran === 'quarterly') return dt.getFullYear() + '-Q' + (Math.floor(dt.getMonth() / 3) + 1);
    return String(dt.getFullYear());
};
const bucketLabel = (key: string, gran: Gran) => {
    if (gran === 'daily' || gran === 'weekly') return new Date(key + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    return key;
};

export default function AIAnalysisScreen() {
    const [loading, setLoading] = useState(true);
    const [ticketCount, setTicketCount] = useState(0);
    const [engScores, setEngScores] = useState<any[]>([]);
    const [repeatCalls, setRepeatCalls] = useState<any[]>([]);
    const [areaInsights, setAreaInsights] = useState<any[]>([]);
    const [travelStats, setTravelStats] = useState<any[]>([]);
    const [topSpares, setTopSpares] = useState<any[]>([]);
    const [forecast, setForecast] = useState(0);
    const [nextMonth, setNextMonth] = useState('');
    const [thisMonth, setThisMonth] = useState(0);
    const [monthTrend, setMonthTrend] = useState<[string, number][]>([]);
    const [amcOpps, setAmcOpps] = useState<any[]>([]);
    const [loadStats, setLoadStats] = useState<any[]>([]);
    const [avgLoad, setAvgLoad] = useState(0);
    const [fvrStats, setFvrStats] = useState<any[]>([]);
    const [ranking, setRanking] = useState<any[]>([]);
    const [svcTypeStats, setSvcTypeStats] = useState<any[]>([]);
    const [punctStats, setPunctStats] = useState<any[]>([]);
    const [trendTickets, setTrendTickets] = useState<any[]>([]);
    const [gran, setGran] = useState<Gran>('weekly');

    const load = async () => {
        setLoading(true);
        try {
            const d90 = new Date(); d90.setDate(d90.getDate() - 90);
            const d400 = new Date(); d400.setDate(d400.getDate() - 400);
            const d30 = new Date(); d30.setDate(d30.getDate() - 30);

            const [{ data: tickets }, { data: wlogs }, { data: trendT }, shiftRes, punchRes] = await Promise.all([
                supabase.from('tickets').select('*').gte('created_at', d90.toISOString()).order('created_at', { ascending: false }).limit(2000),
                supabase.from('work_logs').select('*').gte('log_date', d90.toLocaleDateString('en-CA')).order('log_date', { ascending: false }).limit(3000),
                supabase.from('tickets').select('id,status,created_at,service_type,call_type,service_charges').gte('created_at', d400.toISOString()).order('created_at', { ascending: true }).limit(6000),
                Promise.resolve(supabase.from('shift_settings').select('*')).catch(() => ({ data: [] as any[] })),
                Promise.resolve(supabase.from('punch_logs').select('*').gte('punch_in_date', d30.toLocaleDateString('en-CA')).order('punch_in_date', { ascending: false }).limit(2000)).catch(() => ({ data: [] as any[] })),
            ]);

            const T = tickets || [];
            const WL = wlogs || [];
            const TT = trendT || [];
            const shiftMap: Record<string, any> = {};
            (shiftRes.data || []).forEach((s: any) => { shiftMap[s.emp_id] = s; });
            const PL = punchRes.data || [];
            const now = new Date();

            setTicketCount(T.length);
            setTrendTickets(TT);

            // 1. Engineer Efficiency Score
            const engMap: Record<string, any> = {};
            T.forEach((t: any) => {
                const e = t.assigned_name || 'Unassigned';
                if (!engMap[e]) engMap[e] = { assigned: 0, closed: 0, totalDays: 0, closedWithDays: 0 };
                engMap[e].assigned++;
                if (isDone(t.status) && t.created_at && t.updated_at) {
                    engMap[e].closed++;
                    const days = (+new Date(t.updated_at) - +new Date(t.created_at)) / 86400000;
                    engMap[e].totalDays += days; engMap[e].closedWithDays++;
                }
            });
            const scores = Object.entries(engMap).filter(([e]) => e !== 'Unassigned').map(([e, d]: [string, any]) => {
                const rate = d.assigned > 0 ? d.closed / d.assigned : 0;
                const avgDays = d.closedWithDays > 0 ? d.totalDays / d.closedWithDays : 99;
                const speedFactor = avgDays <= 1 ? 1.5 : avgDays <= 3 ? 1.2 : avgDays <= 7 ? 1.0 : 0.8;
                const score = Math.round(rate * speedFactor * 100);
                return { e, score, rate: Math.round(rate * 100), assigned: d.assigned, closed: d.closed, avgDays: avgDays.toFixed(1) };
            }).sort((a, b) => b.score - a.score);
            setEngScores(scores);

            // 2. Repeat Call Analysis
            const serialGroups: Record<string, any[]> = {};
            T.filter((t: any) => t.serial && t.serial.trim()).forEach((t: any) => {
                const k = t.serial.trim().toLowerCase();
                (serialGroups[k] = serialGroups[k] || []).push(t);
            });
            const repeats: any[] = [];
            Object.entries(serialGroups).forEach(([serial, tks]) => {
                if (tks.length < 2) return;
                const sorted = tks.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
                for (let i = 1; i < sorted.length; i++) {
                    const diff = (+new Date(sorted[i].created_at) - +new Date(sorted[i - 1].created_at)) / 86400000;
                    if (diff <= 30) {
                        repeats.push({ serial, cname: sorted[i].cname, model: sorted[i].model || sorted[i - 1].model, id2: sorted[i].id, days: Math.round(diff), eng: sorted[i].assigned_name || 'Unassigned' });
                    }
                }
            });
            setRepeatCalls(repeats);

            // 3. Territory Optimization
            const areaEng: Record<string, any> = {};
            T.filter((t: any) => isDone(t.status) && t.area && t.assigned_name).forEach((t: any) => {
                const k = t.area + '__' + t.assigned_name;
                if (!areaEng[k]) areaEng[k] = { area: t.area, eng: t.assigned_name, total: 0, totalDays: 0 };
                areaEng[k].total++;
                if (t.created_at && t.updated_at) areaEng[k].totalDays += (+new Date(t.updated_at) - +new Date(t.created_at)) / 86400000;
            });
            const areas = Object.values(areaEng).filter((x: any) => x.total >= 2).map((x: any) => ({ ...x, avgDays: (x.totalDays / x.total).toFixed(1) })).sort((a: any, b: any) => a.avgDays - b.avgDays).slice(0, 10);
            setAreaInsights(areas);

            // 4. Travel Time Loss
            const travelByEng: Record<string, any> = {};
            WL.filter((w: any) => w.log_type === 'travel' && w.from_time && w.to_time && w.to_time !== 'OPEN').forEach((w: any) => {
                const e = w.eng_name || 'Unknown';
                if (!travelByEng[e]) travelByEng[e] = { eng: e, totalMins: 0, days: new Set() };
                const [fh, fm] = (w.from_time || '00:00').split(':').map(Number);
                const [th, tm] = (w.to_time || '00:00').split(':').map(Number);
                const mins = (th * 60 + tm) - (fh * 60 + fm);
                if (mins > 0 && mins < 480) { travelByEng[e].totalMins += mins; travelByEng[e].days.add(w.log_date); }
            });
            const travel = Object.values(travelByEng).map((x: any) => ({ eng: x.eng, totalMins: x.totalMins, days: x.days.size, avgMinsPerDay: x.days.size > 0 ? Math.round(x.totalMins / x.days.size) : 0 })).sort((a: any, b: any) => b.avgMinsPerDay - a.avgMinsPerDay);
            setTravelStats(travel);

            // 5. Spare Prediction
            const spareCount: Record<string, any> = {};
            T.forEach((t: any) => {
                (t.spares || []).filter((s: any) => !s.requested && s.name).forEach((s: any) => {
                    if (!spareCount[s.name]) spareCount[s.name] = { name: s.name, code: s.code || '', count: 0 };
                    spareCount[s.name].count += (s.qty || 1);
                });
            });
            const spares = Object.values(spareCount).sort((a: any, b: any) => b.count - a.count).slice(0, 10).map((s: any) => ({ ...s, predicted: Math.ceil((s.count / 3) * 1.2) }));
            setTopSpares(spares);

            // 6. Call Forecast
            const monthlyCount: Record<string, number> = {};
            T.forEach((t: any) => {
                if (!t.created_at) return;
                const d = new Date(t.created_at);
                const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
                monthlyCount[k] = (monthlyCount[k] || 0) + 1;
            });
            const monthEntries = Object.entries(monthlyCount).sort(([a], [b]) => a.localeCompare(b));
            const last3 = monthEntries.slice(-3).map(([, v]) => v);
            setForecast(last3.length > 0 ? Math.round((last3.reduce((a, b) => a + b, 0) / last3.length) * 1.05) : 0);
            setThisMonth(last3.length ? last3[last3.length - 1] : 0);
            setMonthTrend(monthEntries.slice(-4));
            setNextMonth(new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' }));

            // 7. AMC Opportunity
            const opps: any[] = []; const seenMob = new Set<string>();
            T.filter((t: any) => t.call_type && t.call_type.includes('Non-Warranty') && t.mobile && isDone(t.status)).forEach((t: any) => {
                if (!seenMob.has(t.mobile)) { seenMob.add(t.mobile); opps.push({ cname: t.cname, mobile: t.mobile, model: t.model, area: t.area || t.city }); }
            });
            setAmcOpps(opps);

            // 8. Engineer Load Balancing
            const loadMap: Record<string, any> = {};
            T.filter((t: any) => isActive(t.status) && t.assigned_name).forEach((t: any) => {
                if (!loadMap[t.assigned_name]) loadMap[t.assigned_name] = { eng: t.assigned_name, active: 0 };
                loadMap[t.assigned_name].active++;
            });
            const load = Object.values(loadMap).sort((a: any, b: any) => b.active - a.active);
            setLoadStats(load);
            setAvgLoad(load.length ? (load as any[]).reduce((a, b) => a + b.active, 0) / load.length : 0);

            // 9. First Visit Resolution % — adapted proxy: Next.js tickets don't track
            // per-visit "Visit Start"/"Work Start" timeline entries like HTML did;
            // instead count re-entries into "In Progress" as visit attempts.
            const fvrMap: Record<string, any> = {};
            T.filter((t: any) => t.assigned_name && isDone(t.status)).forEach((t: any) => {
                if (!fvrMap[t.assigned_name]) fvrMap[t.assigned_name] = { eng: t.assigned_name, total: 0, firstVisit: 0 };
                fvrMap[t.assigned_name].total++;
                const visits = (t.timeline || []).filter((x: any) => typeof x.action === 'string' && x.action.includes('In Progress')).length || 1;
                if (visits <= 1) fvrMap[t.assigned_name].firstVisit++;
            });
            const fvr = Object.values(fvrMap).filter((x: any) => x.total >= 3).map((x: any) => ({ ...x, pct: Math.round((x.firstVisit / x.total) * 100) })).sort((a: any, b: any) => b.pct - a.pct);
            setFvrStats(fvr);

            // 10. Engineer Ranking
            const rankMap: Record<string, any> = {};
            scores.forEach((x) => { rankMap[x.e] = { eng: x.e, efficiency: x.score, closed: x.closed, assigned: x.assigned, fvr: 0, travelAvg: 0 }; });
            fvr.forEach((x: any) => { if (rankMap[x.eng]) rankMap[x.eng].fvr = x.pct; });
            travel.forEach((x: any) => { if (rankMap[x.eng]) rankMap[x.eng].travelAvg = x.avgMinsPerDay; });
            const rank = Object.values(rankMap).filter((x: any) => x.assigned >= 3).map((x: any) => {
                const effScore = Math.min(x.efficiency, 100) * 0.4;
                const fvrScore = x.fvr * 0.35;
                const travelScore = Math.max(0, 100 - x.travelAvg / 1.2) * 0.25;
                return { ...x, total: Math.round(effScore + fvrScore + travelScore) };
            }).sort((a: any, b: any) => b.total - a.total);
            setRanking(rank);

            // 11. Service Type Analysis (400d)
            const svcMap: Record<string, any> = {};
            TT.forEach((t: any) => {
                const k = t.service_type || 'Not Set';
                if (!svcMap[k]) svcMap[k] = { type: k, total: 0, closed: 0, revenue: 0 };
                svcMap[k].total++;
                if (isDone(t.status)) svcMap[k].closed++;
                if (t.service_charges) svcMap[k].revenue += Number(t.service_charges) || 0;
            });
            setSvcTypeStats(Object.values(svcMap).sort((a: any, b: any) => b.total - a.total));

            // 12. Attendance Punctuality
            const punctMap: Record<string, any> = {};
            PL.forEach((l: any) => {
                if (!l.eng_id || !l.punch_in_time) return;
                const shift = shiftMap[l.eng_id] || { shift_start: '09:30' };
                const shiftStartMin = attToMin(shift.shift_start);
                const actInMin = attToMin(l.punch_in_time);
                if (shiftStartMin == null || actInMin == null) return;
                const lateMin = Math.max(0, actInMin - shiftStartMin);
                if (!punctMap[l.eng_id]) punctMap[l.eng_id] = { eng: l.eng_name || l.eng_id, days: 0, onTimeDays: 0, totalLateMin: 0 };
                punctMap[l.eng_id].days++;
                punctMap[l.eng_id].totalLateMin += lateMin;
                if (lateMin <= 5) punctMap[l.eng_id].onTimeDays++;
            });
            const punct = Object.values(punctMap).filter((x: any) => x.days >= 3).map((x: any) => ({ ...x, avgLateMin: Math.round(x.totalLateMin / x.days), onTimePct: Math.round((x.onTimeDays / x.days) * 100) })).sort((a: any, b: any) => b.onTimePct - a.onTimePct);
            setPunctStats(punct);
        } catch (e) {
            console.error('AI Analysis load error:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const trendBuckets = () => {
        const buckets: Record<string, { received: number; closed: number }> = {};
        trendTickets.forEach((t: any) => {
            if (!t.created_at) return;
            const k = bucketKey(t.created_at, gran);
            if (!buckets[k]) buckets[k] = { received: 0, closed: 0 };
            buckets[k].received++;
            if (isDone(t.status)) buckets[k].closed++;
        });
        const keys = Object.keys(buckets).sort().slice(-GRAN_LIMIT[gran]);
        const maxRecv = Math.max(...keys.map((k) => buckets[k].received), 1);
        return { buckets, keys, maxRecv };
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>⏳ Loading analytics...</div>;

    const Card = ({ title, icon, color, children }: { title: string; icon: string; color: string; children: React.ReactNode }) => (
        <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 8, borderBottom: `2px solid ${color}` }}>
                <span style={{ fontSize: 20 }}>{icon}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>{title}</span>
            </div>
            {children}
        </div>
    );
    const Bar = ({ pct, color }: { pct: number; color: string }) => (
        <div style={{ flex: 1, height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 5 }} />
        </div>
    );
    const Empty = (msg: string) => <div style={{ color: '#9ca3af', fontSize: 13 }}>{msg}</div>;
    const { buckets, keys, maxRecv } = trendBuckets();

    return (
        <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <span style={{ fontSize: 24 }}>🤖</span>
                <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b' }}>AI Analysis Dashboard</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Last 90 days · {ticketCount} tickets analysed</div>
                </div>
                <button onClick={load} style={{ marginLeft: 'auto', padding: '7px 14px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>🔄 Refresh</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Card title="Engineer Efficiency Score" icon="⚡" color="#1d4ed8">
                    {engScores.length ? engScores.map((x, i) => (
                        <div key={x.e} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }} title={`Closed: ${x.closed} | Assigned: ${x.assigned} | Avg: ${x.avgDays}d`}>
                            <div style={{ width: 20, textAlign: 'center', fontSize: 11, color: '#6b7280' }}>{i + 1}</div>
                            <div style={{ width: 110, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.e.split(' ')[0]}</div>
                            <Bar pct={x.score} color="#1d4ed8" />
                            <div style={{ width: 36, textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#1d4ed8' }}>{x.score}</div>
                            <div style={{ fontSize: 10, color: '#6b7280', width: 60 }}>{x.closed}/{x.assigned} · {x.avgDays}d</div>
                        </div>
                    )) : Empty('No data')}
                </Card>

                <Card title="Repeat Call Analysis (Serial-based, 30d)" icon="🔁" color="#dc2626">
                    {repeatCalls.length ? (
                        <>
                            <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 700, marginBottom: 8 }}>⚠️ {repeatCalls.length} repeat calls found</div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                                    <thead><tr style={{ background: '#fef2f2' }}><th style={{ padding: '4px 6px', textAlign: 'left' }}>Serial</th><th style={{ padding: '4px 6px', textAlign: 'left' }}>Customer</th><th style={{ padding: '4px 6px' }}>Model</th><th style={{ padding: '4px 6px' }}>Days</th><th style={{ padding: '4px 6px' }}>Engineer</th></tr></thead>
                                    <tbody>{repeatCalls.slice(0, 8).map((r, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #fee2e2' }}>
                                            <td style={{ padding: '4px 6px', fontWeight: 600, color: '#dc2626' }}>{r.serial}</td>
                                            <td style={{ padding: '4px 6px' }}>{r.cname || '—'}</td>
                                            <td style={{ padding: '4px 6px' }}>{r.model || '—'}</td>
                                            <td style={{ padding: '4px 6px', textAlign: 'center' }}><span style={{ background: '#fef2f2', color: '#dc2626', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>{r.days}d</span></td>
                                            <td style={{ padding: '4px 6px' }}>{(r.eng || '').split(' ')[0]}</td>
                                        </tr>
                                    ))}</tbody>
                                </table>
                            </div>
                        </>
                    ) : <div style={{ color: '#059669', fontSize: 13 }}>✅ No repeat calls in last 30 days</div>}
                </Card>

                <Card title="Territory Optimization" icon="🗺️" color="#059669">
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>Best engineer per area (by avg close days)</div>
                    {areaInsights.length ? (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                                <thead><tr style={{ background: '#f0fdf4' }}><th style={{ padding: '4px 6px', textAlign: 'left' }}>Area</th><th style={{ padding: '4px 6px', textAlign: 'left' }}>Best Engineer</th><th style={{ padding: '4px 6px' }}>Calls</th><th style={{ padding: '4px 6px' }}>Avg Days</th></tr></thead>
                                <tbody>{areaInsights.map((x, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '4px 6px', fontWeight: 600 }}>{x.area}</td>
                                        <td style={{ padding: '4px 6px' }}>{x.eng.split(' ')[0]}</td>
                                        <td style={{ padding: '4px 6px', textAlign: 'center' }}>{x.total}</td>
                                        <td style={{ padding: '4px 6px', textAlign: 'center' }}><span style={{ background: '#f0fdf4', color: '#059669', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>{x.avgDays}d</span></td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                    ) : Empty('Not enough closed tickets with area data')}
                </Card>

                <Card title="Travel Time Loss" icon="🚗" color="#f59e0b">
                    {travelStats.length ? (
                        <>
                            {travelStats.map((x: any, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <div style={{ width: 90, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.eng.split(' ')[0]}</div>
                                    <Bar pct={(x.avgMinsPerDay / 120) * 100} color="#f59e0b" />
                                    <div style={{ width: 70, textAlign: 'right', fontSize: 11, color: '#d97706', fontWeight: 700 }}>{x.avgMinsPerDay} min/day</div>
                                </div>
                            ))}
                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8, paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
                                Total travel logged: <b>{Math.round(travelStats.reduce((a: number, b: any) => a + b.totalMins, 0) / 60)}h</b> across {travelStats.reduce((a: number, b: any) => a + b.days, 0)} days
                            </div>
                        </>
                    ) : Empty('No travel logs found')}
                </Card>

                <Card title="Spare Part Prediction (Next Month)" icon="🔩" color="#7c3aed">
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>Based on last 90-day usage trend (+20% buffer)</div>
                    {topSpares.length ? (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                                <thead><tr style={{ background: '#fdf4ff' }}><th style={{ padding: '4px 6px', textAlign: 'left' }}>Part</th><th style={{ padding: '4px 6px', textAlign: 'left' }}>Code</th><th style={{ padding: '4px 6px' }}>Used (90d)</th><th style={{ padding: '4px 6px' }}>Predicted</th></tr></thead>
                                <tbody>{topSpares.map((s: any, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '4px 6px', fontWeight: 600, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.name}>{s.name}</td>
                                        <td style={{ padding: '4px 6px', color: '#6b7280' }}>{s.code || '—'}</td>
                                        <td style={{ padding: '4px 6px', textAlign: 'center' }}>{s.count}</td>
                                        <td style={{ padding: '4px 6px', textAlign: 'center' }}><span style={{ background: '#fdf4ff', color: '#7c3aed', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>{s.predicted}</span></td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                    ) : Empty('No spare usage data')}
                </Card>

                <Card title="Call Forecast" icon="📈" color="#1d4ed8">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <div style={{ background: '#eff6ff', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                            <div style={{ fontSize: 32, fontWeight: 800, color: '#1d4ed8' }}>{forecast}</div>
                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Predicted for {nextMonth}</div>
                        </div>
                        <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                            <div style={{ fontSize: 32, fontWeight: 800, color: '#059669' }}>{thisMonth}</div>
                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>This month (so far)</div>
                        </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>Monthly trend: {monthTrend.map(([k, v]) => `${k.slice(5)}: ${v}`).join(' → ')}</div>
                </Card>

                <Card title="AMC Opportunity" icon="🤝" color="#d97706">
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#d97706', marginBottom: 8 }}>💡 {amcOpps.length} Non-Warranty customers to approach for AMC</div>
                    {amcOpps.length ? (
                        <>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                                    <thead><tr style={{ background: '#fff7ed' }}><th style={{ padding: '4px 6px', textAlign: 'left' }}>Customer</th><th style={{ padding: '4px 6px', textAlign: 'left' }}>Mobile</th><th style={{ padding: '4px 6px', textAlign: 'left' }}>Model</th><th style={{ padding: '4px 6px', textAlign: 'left' }}>Area</th></tr></thead>
                                    <tbody>{amcOpps.slice(0, 8).map((a, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #fef3c7' }}>
                                            <td style={{ padding: '4px 6px', fontWeight: 600 }}>{a.cname || '—'}</td>
                                            <td style={{ padding: '4px 6px', color: '#1d4ed8' }}>{a.mobile}</td>
                                            <td style={{ padding: '4px 6px' }}>{a.model || '—'}</td>
                                            <td style={{ padding: '4px 6px' }}>{a.area || '—'}</td>
                                        </tr>
                                    ))}</tbody>
                                </table>
                            </div>
                            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>Showing top 8 · Total: {amcOpps.length}</div>
                        </>
                    ) : Empty('No non-warranty closed tickets found')}
                </Card>

                <Card title="Engineer Load Balancing" icon="⚖️" color="#0891b2">
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>Active tickets per engineer right now · Avg: {avgLoad.toFixed(1)}</div>
                    {loadStats.length ? loadStats.map((x: any, i) => {
                        const over = x.active > avgLoad * 1.5, free = x.active < avgLoad * 0.5;
                        const clr = over ? '#ef4444' : free ? '#22c55e' : '#1d4ed8';
                        const maxActive = Math.max(...loadStats.map((l: any) => l.active), 1);
                        return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                                <div style={{ width: 100, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.eng.split(' ')[0]}</div>
                                <Bar pct={(x.active / maxActive) * 100} color={clr} />
                                <div style={{ width: 24, textAlign: 'right', fontSize: 12, fontWeight: 700, color: clr }}>{x.active}</div>
                                <div style={{ width: 60, fontSize: 10, color: clr }}>{over ? '⚠️ High' : free ? '✅ Free' : 'Normal'}</div>
                            </div>
                        );
                    }) : Empty('No active tickets')}
                </Card>

                <Card title="First Visit Resolution %" icon="🎯" color="#22c55e">
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>Calls closed in first visit (engineers with 3+ closed calls)</div>
                    {fvrStats.length ? fvrStats.map((x: any, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <div style={{ width: 20, textAlign: 'center', fontSize: 11, color: '#6b7280' }}>{i + 1}</div>
                            <div style={{ width: 100, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.eng.split(' ')[0]}</div>
                            <Bar pct={x.pct} color={x.pct >= 80 ? '#22c55e' : x.pct >= 60 ? '#f59e0b' : '#ef4444'} />
                            <div style={{ width: 36, textAlign: 'right', fontSize: 12, fontWeight: 700 }}>{x.pct}%</div>
                            <div style={{ fontSize: 10, color: '#6b7280', width: 55 }}>{x.firstVisit}/{x.total}</div>
                        </div>
                    )) : Empty('Not enough data yet')}
                </Card>

                <Card title="🏆 Engineer Monthly Ranking" icon="🥇" color="#d97706">
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 11, color: '#92400e', lineHeight: 1.7 }}>
                        <b>Score = Eff×40% + FVR×35% + Travel×25%</b> (max 100)
                    </div>
                    {ranking.length ? ranking.map((x: any, i) => {
                        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : ' ';
                        const clr = i === 0 ? '#d97706' : i === 1 ? '#6b7280' : i === 2 ? '#b45309' : '#1d4ed8';
                        return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, marginBottom: 6, background: i < 3 ? '#fffbeb' : '#f8fafc', borderRadius: 8, border: `1px solid ${i < 3 ? '#fde68a' : '#e2e8f0'}` }}>
                                <div style={{ fontSize: 18, width: 28, textAlign: 'center' }}>{medal}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{x.eng.split(' ')[0]}</div>
                                    <div style={{ fontSize: 10, color: '#6b7280' }}>Eff: {x.efficiency} · FVR: {x.fvr}% · Travel: {x.travelAvg}m/day</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 20, fontWeight: 800, color: clr }}>{x.total}</div>
                                    <div style={{ fontSize: 10, color: '#6b7280' }}>/ 100</div>
                                </div>
                            </div>
                        );
                    }) : Empty('Need 3+ assigned calls per engineer')}
                </Card>

                <Card title="Call Trend Analysis" icon="📊" color="#4338ca">
                    <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                        {(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as Gran[]).map((g) => (
                            <button key={g} onClick={() => setGran(g)} style={{ padding: '5px 10px', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: gran === g ? '#4338ca' : '#f1f5f9', color: gran === g ? '#fff' : '#374151' }}>
                                {g.charAt(0).toUpperCase() + g.slice(1)}
                            </button>
                        ))}
                    </div>
                    {keys.length ? keys.map((k) => {
                        const b = buckets[k];
                        const rate = b.received ? Math.round((b.closed / b.received) * 100) : 0;
                        return (
                            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <div style={{ width: 64, fontSize: 11, color: '#6b7280', flexShrink: 0 }}>{bucketLabel(k, gran)}</div>
                                <div style={{ flex: 1, height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden', position: 'relative' }}>
                                    <div style={{ height: '100%', width: `${(b.received / maxRecv) * 100}%`, background: '#c7d2fe', borderRadius: 5 }} />
                                    <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${(b.closed / maxRecv) * 100}%`, background: '#4338ca', borderRadius: 5 }} />
                                </div>
                                <div style={{ width: 100, fontSize: 11, textAlign: 'right', color: '#374151', flexShrink: 0 }}>{b.closed}/{b.received} ({rate}%)</div>
                            </div>
                        );
                    }) : Empty('No data')}
                    <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 8 }}>Light bar = total received · Dark bar = closed (of those)</div>
                </Card>

                <Card title="Service Type Analysis (400d)" icon="🧰" color="#0e7490">
                    {svcTypeStats.length ? (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                                <thead><tr style={{ background: '#ecfeff' }}><th style={{ padding: '4px 6px', textAlign: 'left' }}>Service Type</th><th style={{ padding: '4px 6px' }}>Total</th><th style={{ padding: '4px 6px' }}>Closed</th><th style={{ padding: '4px 6px' }}>Closure %</th><th style={{ padding: '4px 6px' }}>Revenue ₹</th></tr></thead>
                                <tbody>{svcTypeStats.map((s: any, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '4px 6px', fontWeight: 600 }}>{s.type}</td>
                                        <td style={{ padding: '4px 6px', textAlign: 'center' }}>{s.total}</td>
                                        <td style={{ padding: '4px 6px', textAlign: 'center' }}>{s.closed}</td>
                                        <td style={{ padding: '4px 6px', textAlign: 'center' }}><span style={{ background: '#ecfeff', color: '#0e7490', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>{s.total ? Math.round((s.closed / s.total) * 100) : 0}%</span></td>
                                        <td style={{ padding: '4px 6px', textAlign: 'right' }}>{s.revenue ? '₹' + s.revenue.toLocaleString('en-IN') : '—'}</td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                    ) : Empty('No data')}
                </Card>

                <Card title="Attendance Punctuality (Last 30 days)" icon="⏰" color="#f97316">
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>On-time = within 5 min of shift start</div>
                    {punctStats.length ? punctStats.map((x: any, i) => {
                        const clr = x.onTimePct >= 90 ? '#22c55e' : x.onTimePct >= 70 ? '#f59e0b' : '#ef4444';
                        return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <div style={{ width: 20, textAlign: 'center', fontSize: 11, color: '#6b7280' }}>{i + 1}</div>
                                <div style={{ width: 100, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(x.eng || '').split(' ')[0]}</div>
                                <Bar pct={x.onTimePct} color={clr} />
                                <div style={{ width: 36, textAlign: 'right', fontSize: 12, fontWeight: 700, color: clr }}>{x.onTimePct}%</div>
                                <div style={{ fontSize: 10, color: '#6b7280', width: 100 }}>{x.onTimeDays}/{x.days}d · avg {x.avgLateMin}m late</div>
                            </div>
                        );
                    }) : Empty('Not enough punch-in data — configure Shift Timing in Settings first')}
                </Card>
            </div>
        </div>
    );
}