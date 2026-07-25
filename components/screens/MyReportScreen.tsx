'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { fetchMyReport, MyReportDayRow } from '@/services/myReportService';

const todayStr = () => new Date().toLocaleDateString('en-CA');
const monthStartStr = () => todayStr().slice(0, 8) + '01';

export default function MyReportScreen() {
    const { data: session } = useSession();
    const engId = (session?.user as any)?.id ?? '';

    const [from, setFrom] = useState(monthStartStr());
    const [to, setTo] = useState(todayStr());
    const [rows, setRows] = useState<MyReportDayRow[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        if (!from || !to || !engId) return;
        setLoading(true);
        try { setRows(await fetchMyReport(engId, from, to)); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [engId, from, to]);

    const quick = (type: 'week' | 'month' | 'year') => {
        const today = new Date();
        let f: string;
        const t = todayStr();
        if (type === 'week') {
            const d = new Date(today);
            d.setDate(today.getDate() - today.getDay() + 1);
            f = d.toLocaleDateString('en-CA');
        } else if (type === 'year') {
            f = today.getFullYear() + '-01-01';
        } else {
            f = monthStartStr();
        }
        setFrom(f); setTo(t);
    };

    const totals = rows.reduce((acc, r) => ({
        w: acc.w + r.w, ow: acc.ow + r.ow, pending: acc.pending + r.pending, invoice: acc.invoice + r.invoice,
    }), { w: 0, ow: 0, pending: 0, invoice: 0 });

    return (
        <div style={{ padding: '20px 24px' }}>
            <h1 style={{ margin: '0 0 16px', fontSize: 28, fontWeight: 700 }}>📊 My Report</h1>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}>
                <div><label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>From</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 13 }} /></div>
                <div><label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>To</label><input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 13 }} /></div>
                <button onClick={load} style={{ padding: '8px 14px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, height: 36 }}>🔍 Search</button>
                <button onClick={() => quick('week')} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13, height: 36 }}>This Week</button>
                <button onClick={() => quick('month')} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13, height: 36 }}>This Month</button>
                <button onClick={() => quick('year')} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13, height: 36 }}>This Year</button>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                <div style={{ background: '#eff6ff', borderRadius: 10, padding: '10px 16px' }}><div style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 700 }}>🛡️ Warranty Closed</div><div style={{ fontSize: 20, fontWeight: 800, color: '#1d4ed8' }}>{totals.w}</div></div>
                <div style={{ background: '#fff7ed', borderRadius: 10, padding: '10px 16px' }}><div style={{ fontSize: 11, color: '#c2410c', fontWeight: 700 }}>💳 Non-Warranty Closed</div><div style={{ fontSize: 20, fontWeight: 800, color: '#c2410c' }}>{totals.ow}</div></div>
                <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '10px 16px' }}><div style={{ fontSize: 11, color: '#15803d', fontWeight: 700 }}>✅ Total Closed</div><div style={{ fontSize: 20, fontWeight: 800, color: '#15803d' }}>{totals.w + totals.ow}</div></div>
                <div style={{ background: '#fefce8', borderRadius: 10, padding: '10px 16px' }}><div style={{ fontSize: 11, color: '#a16207', fontWeight: 700 }}>⏳ Total Pending</div><div style={{ fontSize: 20, fontWeight: 800, color: '#a16207' }}>{totals.pending}</div></div>
                <div style={{ background: '#f5f3ff', borderRadius: 10, padding: '10px 16px' }}><div style={{ fontSize: 11, color: '#6d28d9', fontWeight: 700 }}>🧾 Payment/Invoice Done</div><div style={{ fontSize: 20, fontWeight: 800, color: '#6d28d9' }}>{totals.invoice}</div></div>
            </div>

            <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                        <tr style={{ background: '#f9fafb' }}>
                            {['Date', 'Warranty Closed', 'Non-Warranty Closed', 'Total Closed', 'Pending', 'Payment/Invoice Done'].map(h => (
                                <th key={h} style={{ padding: 8, textAlign: h === 'Date' ? 'left' : 'center', fontWeight: 600, fontSize: 12 }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20 }}>Loading...</td></tr>
                        ) : rows.length === 0 ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>No data</td></tr>
                        ) : rows.map(r => (
                            <tr key={r.date} style={{ borderTop: '1px solid #f3f4f6' }}>
                                <td style={{ padding: 8 }}>{new Date(r.date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' })}</td>
                                <td style={{ padding: 8, textAlign: 'center' }}>{r.w}</td>
                                <td style={{ padding: 8, textAlign: 'center' }}>{r.ow}</td>
                                <td style={{ padding: 8, textAlign: 'center', fontWeight: 700 }}>{r.w + r.ow}</td>
                                <td style={{ padding: 8, textAlign: 'center' }}>{r.pending}</td>
                                <td style={{ padding: 8, textAlign: 'center' }}>{r.invoice}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}