'use client';

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useEngineers } from '@/hooks/useEngineers';
import { loadEngDailyReport, sendDigestNow, EdrRow, EdrClosedCall } from '@/services/engDailyReportService';

const fieldStyle = { border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 13, boxSizing: 'border-box' as const };

const monthStart = () => new Date().toLocaleDateString('en-CA').substring(0, 8) + '01';
const today = () => new Date().toLocaleDateString('en-CA');

export default function EngDailyReportScreen() {
    const { engineers } = useEngineers();
    const [engFilter, setEngFilter] = useState('');
    const [from, setFrom] = useState(monthStart());
    const [to, setTo] = useState(today());
    const [rows, setRows] = useState<EdrRow[]>([]);
    const [range, setRange] = useState({ from: '', to: '' });
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [detailRow, setDetailRow] = useState<EdrRow | null>(null);

    const runSearch = async (f: string, t: string, eng: string) => {
        setLoading(true);
        try {
            const engList = engineers.map(e => ({ user_id: e.user_id, name: e.name }));
            const r = await loadEngDailyReport(f, t, eng, engList);
            setRows(r); setRange({ from: f, to: t });
        } catch (e: any) { alert('Error: ' + e.message); }
        setLoading(false);
    };

    useEffect(() => { if (engineers.length) runSearch(from, to, engFilter); }, [engineers.length]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleEngChange = (val: string) => { setEngFilter(val); runSearch(from, to, val); };
    const search = () => runSearch(from, to, engFilter);
    const quick = (type: 'today' | 'week' | 'month' | 'year') => {
        const t = new Date();
        const toStr = t.toLocaleDateString('en-CA');
        let fromStr: string;
        if (type === 'today') fromStr = toStr;
        else if (type === 'week') { const d = new Date(t); d.setDate(t.getDate() - t.getDay() + 1); fromStr = d.toLocaleDateString('en-CA'); }
        else if (type === 'year') fromStr = `${t.getFullYear()}-01-01`;
        else fromStr = monthStart();
        setFrom(fromStr); setTo(toStr);
        runSearch(fromStr, toStr, engFilter);
    };

    const handleSendNow = async () => {
        setSending(true);
        const r = await sendDigestNow();
        setSending(false);
        if (r.success) {
            alert(`✅ Report sent!\n\n📱 Telegram: ${r.telegramOk ? 'Sent' : 'Check delivery'}\n✉️ Email: ${r.emailOk ? 'Sent' : 'Check delivery'}\n\n👷 Engineers with data today: ${r.engineers}`);
        } else {
            alert('❌ Send failed.\n\n' + (r.error || 'Unknown error') + '\n\nCheck that the daily-digest function is deployed.');
        }
    };

    const totW = rows.reduce((a, r) => a + r.w, 0);
    const totOW = rows.reduce((a, r) => a + r.ow, 0);
    const totPending = rows.reduce((a, r) => a + r.pending, 0);
    const totPayment = rows.reduce((a, r) => a + r.paymentCollected, 0);
    const totOtherWork = rows.reduce((a, r) => a + r.otherWork, 0);

    const downloadExcel = () => {
        if (!rows.length) { alert('No data to download — run Search first.'); return; }
        const data = rows.map(r => ({
            Engineer: r.name, 'Total Closed': r.total, 'Warranty Closed': r.w, 'Non-Warranty Closed': r.ow,
            Pending: r.pending, 'Payment Collection (₹)': r.paymentCollected || 0, 'Other Work': r.otherWork || 0,
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Engineer Report');
        XLSX.writeFile(wb, `Engineer_Daily_Report_${range.from}_to_${range.to}.xlsx`);
    };

    const fmtClosedCell = (x: EdrClosedCall) => {
        const dt = new Date(x.date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
        return (
            <>
                {dt}
                {x.time ? <div style={{ fontSize: 10, color: '#64748b' }}>🕐 {x.time}</div> : x.backdated ? <div style={{ fontSize: 10, color: '#b45309' }}>back-dated</div> : null}
            </>
        );
    };

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 4 }}>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>📅 Engineer Daily Report</h1>
                <button onClick={handleSendNow} disabled={sending} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: sending ? 0.6 : 1 }}>
                    {sending ? '⏳ Sending...' : "📤 Send Today's Report Now"}
                </button>
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', margin: '-2px 0 14px' }}>Sends a Telegram + Email summary of today&apos;s work so far — same as the 8PM auto-send, triggered on demand.</div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
                <div><label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 3 }}>Engineer</label>
                    <select value={engFilter} onChange={e => handleEngChange(e.target.value)} style={{ ...fieldStyle, minWidth: 170 }}>
                        <option value="">All Engineers</option>
                        {engineers.map(e => <option key={e.id} value={e.user_id}>{e.name}</option>)}
                    </select>
                </div>
                <div><label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 3 }}>From</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} style={fieldStyle} /></div>
                <div><label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 3 }}>To</label><input type="date" value={to} onChange={e => setTo(e.target.value)} style={fieldStyle} /></div>
                <button onClick={search} style={{ ...fieldStyle, height: 36, background: '#185FA5', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>🔍 Search</button>
                <button onClick={() => quick('today')} style={{ ...fieldStyle, height: 36, background: '#fff', cursor: 'pointer' }}>Today</button>
                <button onClick={() => quick('week')} style={{ ...fieldStyle, height: 36, background: '#fff', cursor: 'pointer' }}>This Week</button>
                <button onClick={() => quick('month')} style={{ ...fieldStyle, height: 36, background: '#fff', cursor: 'pointer' }}>This Month</button>
                <button onClick={() => quick('year')} style={{ ...fieldStyle, height: 36, background: '#fff', cursor: 'pointer' }}>This Year</button>
                <button onClick={downloadExcel} style={{ ...fieldStyle, height: 36, background: '#fff', cursor: 'pointer' }}>⬇️ Download Excel</button>
            </div>

            {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</p> : (
                <>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                        <div style={{ background: '#eff6ff', borderRadius: 10, padding: '10px 16px' }}><div style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 700 }}>🛡️ Warranty Closed</div><div style={{ fontSize: 20, fontWeight: 800, color: '#1d4ed8' }}>{totW}</div></div>
                        <div style={{ background: '#fff7ed', borderRadius: 10, padding: '10px 16px' }}><div style={{ fontSize: 11, color: '#c2410c', fontWeight: 700 }}>💳 Non-Warranty Closed</div><div style={{ fontSize: 20, fontWeight: 800, color: '#c2410c' }}>{totOW}</div></div>
                        <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '10px 16px' }}><div style={{ fontSize: 11, color: '#15803d', fontWeight: 700 }}>✅ Total Closed</div><div style={{ fontSize: 20, fontWeight: 800, color: '#15803d' }}>{totW + totOW}</div></div>
                        <div style={{ background: '#fefce8', borderRadius: 10, padding: '10px 16px' }}><div style={{ fontSize: 11, color: '#a16207', fontWeight: 700 }}>⏳ Total Pending</div><div style={{ fontSize: 20, fontWeight: 800, color: '#a16207' }}>{totPending}</div></div>
                        <div style={{ background: '#f5f3ff', borderRadius: 10, padding: '10px 16px' }}><div style={{ fontSize: 11, color: '#6d28d9', fontWeight: 700 }}>💰 Payment Collection</div><div style={{ fontSize: 20, fontWeight: 800, color: '#6d28d9' }}>₹{totPayment.toLocaleString('en-IN')}</div></div>
                        <div style={{ background: '#eef7f4', borderRadius: 10, padding: '10px 16px' }}><div style={{ fontSize: 11, color: '#0d9488', fontWeight: 700 }}>🚚 Other Work</div><div style={{ fontSize: 20, fontWeight: 800, color: '#0d9488' }}>{totOtherWork}</div></div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                                <th style={{ padding: '8px' }}>Engineer</th>
                                <th style={{ padding: '8px', textAlign: 'center' }}>Total Closed</th>
                                <th style={{ padding: '8px', textAlign: 'center' }}>Warranty Closed</th>
                                <th style={{ padding: '8px', textAlign: 'center' }}>Non-Warranty Closed</th>
                                <th style={{ padding: '8px', textAlign: 'center' }}>Pending</th>
                                <th style={{ padding: '8px', textAlign: 'center' }}>💰 Payment Collection</th>
                                <th style={{ padding: '8px', textAlign: 'center' }}>🚚 Other Work</th>
                            </tr></thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20, color: '#9ca3af' }}>No data</td></tr>
                                ) : rows.map(r => (
                                    <tr key={r.id} onClick={() => r.total > 0 && setDetailRow(r)} title={r.total > 0 ? `Click to see which ${r.total} calls are counted` : undefined}
                                        style={{ borderBottom: '1px solid #f1f5f9', cursor: r.total > 0 ? 'pointer' : 'default' }}>
                                        <td style={{ padding: '8px', fontWeight: 600 }}>{r.name}{r.total > 0 && <span style={{ color: '#1d4ed8', fontSize: 11 }}> 🔍</span>}</td>
                                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: 800, color: '#15803d', fontSize: 15 }}>{r.total}</td>
                                        <td style={{ padding: '8px', textAlign: 'center' }}>{r.w}</td>
                                        <td style={{ padding: '8px', textAlign: 'center' }}>{r.ow}</td>
                                        <td style={{ padding: '8px', textAlign: 'center' }}>{r.pending}</td>
                                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700, color: '#6d28d9' }}>₹{(r.paymentCollected || 0).toLocaleString('en-IN')}</td>
                                        <td style={{ padding: '8px', textAlign: 'center', color: '#0d9488', fontWeight: 700 }}>{r.otherWork || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {detailRow && (
                <div onClick={() => setDetailRow(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: 17 }}>✅ {detailRow.name} — Closed Calls</h2>
                                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                                    {range.from} → {range.to} &nbsp;|&nbsp; Total {detailRow.total} (Warranty {detailRow.w}, Non-Warranty {detailRow.ow})
                                </div>
                            </div>
                            <button onClick={() => setDetailRow(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
                        </div>
                        <div style={{ padding: '12px 16px' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                                        <th style={{ padding: '6px 8px' }}>#</th>
                                        <th style={{ padding: '6px 8px' }}>Ticket</th>
                                        <th style={{ padding: '6px 8px' }}>Closed Date</th>
                                        <th style={{ padding: '6px 8px' }}>Model</th>
                                        <th style={{ padding: '6px 8px' }}>Type</th>
                                        <th style={{ padding: '6px 8px' }}>Status</th>
                                    </tr></thead>
                                    <tbody>
                                        {detailRow.list.slice().sort((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0)).map((x, i) => (
                                            <tr key={x.id + i} style={{ borderBottom: '1px solid #eef2f7' }}>
                                                <td style={{ padding: '6px 8px' }}>{i + 1}</td>
                                                <td style={{ padding: '6px 8px', fontWeight: 700, color: '#1d4ed8' }}>{x.id}</td>
                                                <td style={{ padding: '6px 8px' }}>{fmtClosedCell(x)}</td>
                                                <td style={{ padding: '6px 8px' }}>{x.model || '-'}</td>
                                                <td style={{ padding: '6px 8px' }}>{x.call_type || x.type}</td>
                                                <td style={{ padding: '6px 8px' }}><span style={{ background: '#f0fdf4', color: '#15803d', borderRadius: 5, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{x.status}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>&quot;Closed Date&quot; = the day the engineer completed the call (Closed / Pending for Delivery / Repaired / Resolved By Phone / Customer Reject) — not the delivery or invoice date.</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}