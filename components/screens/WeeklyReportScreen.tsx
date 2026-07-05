'use client';

import { useWeeklyReport } from '@/hooks/useWeeklyReport';
import * as XLSX from 'xlsx';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function WeeklyReportScreen() {
    const {
        filter, setFilter,
        engReports, wcReports,
        loading, error,
        totalCalls, closedCalls, totalRev,
        engSummary,
    } = useWeeklyReport();

    const exportExcel = () => {
        const rows = engReports.map(r => ({
            'Date': r.report_date,
            'Engineer': r.eng_name,
            'Calls Done': r.calls_done || 0,
            'Calls Closed': r.calls_closed || 0,
            'Google Reviews': r.google_reviews || 0,
            'Remarks': r.remarks || '',
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Weekly Report');
        XLSX.writeFile(wb, `weekly_report_${filter.from}_${filter.to}.xlsx`);
    };

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>📋 Weekly Report</h1>
                <button onClick={exportExcel} style={{ padding: '8px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>📊 Export Excel</button>
            </div>

            {/* Date filter */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                    <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 3 }}>From</label>
                    <input type="date" value={filter.from} onChange={e => setFilter(f => ({ ...f, from: e.target.value }))} style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }} />
                </div>
                <div>
                    <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 3 }}>To</label>
                    <input type="date" value={filter.to} onChange={e => setFilter(f => ({ ...f, to: e.target.value }))} style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }} />
                </div>
                {error && <span style={{ color: '#dc2626', fontSize: 13 }}>Error: {error}</span>}
            </div>

            {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</p> : (
                <>
                    {/* KPI */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
                        {[
                            { label: 'Total Calls', value: String(totalCalls), color: '#185FA5' },
                            { label: 'Closed Calls', value: String(closedCalls), color: '#059669' },
                            { label: 'Revenue (NW)', value: '₹' + totalRev.toLocaleString('en-IN', { maximumFractionDigits: 0 }), color: '#d97706' },
                        ].map(s => (
                            <div key={s.label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                                <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
                                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Engineer summary */}
                    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 16, overflow: 'hidden' }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, fontSize: 14 }}>👷 Engineer Daily Summary</div>
                        {Object.keys(engSummary).length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#6b7280', padding: 20 }}>No daily reports submitted for this period</p>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: '#f9fafb' }}>
                                        {['Engineer', 'Calls Done', 'Closed', 'Google Reviews'].map(h => (
                                            <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#374151' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(engSummary).map(([name, s]) => (
                                        <tr key={name} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                            <td style={{ padding: '8px 12px', fontWeight: 600 }}>{name}</td>
                                            <td style={{ padding: '8px 12px' }}>{s.calls}</td>
                                            <td style={{ padding: '8px 12px', color: '#059669' }}>{s.closed}</td>
                                            <td style={{ padding: '8px 12px', color: '#7c3aed' }}>{s.reviews}</td>
                                        </tr>
                                    ))}
                                    <tr style={{ background: '#f9fafb', fontWeight: 700 }}>
                                        <td style={{ padding: '8px 12px' }}>Total</td>
                                        <td style={{ padding: '8px 12px' }}>{Object.values(engSummary).reduce((s, e) => s + e.calls, 0)}</td>
                                        <td style={{ padding: '8px 12px', color: '#059669' }}>{Object.values(engSummary).reduce((s, e) => s + e.closed, 0)}</td>
                                        <td style={{ padding: '8px 12px', color: '#7c3aed' }}>{Object.values(engSummary).reduce((s, e) => s + e.reviews, 0)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Detailed daily reports */}
                    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 16, overflow: 'hidden' }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, fontSize: 14 }}>📅 Daily Reports Detail ({engReports.length})</div>
                        {engReports.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#6b7280', padding: 20 }}>No reports for this period</p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ background: '#f9fafb' }}>
                                            {['Date', 'Engineer', 'Calls Done', 'Closed', 'Google Reviews', 'Remarks'].map(h => (
                                                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {engReports.map(r => (
                                            <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <td style={{ padding: '8px 12px', fontSize: 12, whiteSpace: 'nowrap' }}>{r.report_date}</td>
                                                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{r.eng_name}</td>
                                                <td style={{ padding: '8px 12px' }}>{r.calls_done ?? '—'}</td>
                                                <td style={{ padding: '8px 12px', color: '#059669' }}>{r.calls_closed ?? '—'}</td>
                                                <td style={{ padding: '8px 12px', color: '#7c3aed' }}>{r.google_reviews ?? '—'}</td>
                                                <td style={{ padding: '8px 12px', fontSize: 12, color: '#6b7280', maxWidth: 200 }}>{r.remarks || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* WC Reports */}
                    {wcReports.length > 0 && (
                        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, fontSize: 14 }}>🎯 WC Daily Reports ({wcReports.length})</div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ background: '#f9fafb' }}>
                                            {['Date', 'WC Name', 'Registered', 'Allocated', 'Pending', 'Walk-in', 'Remarks'].map(h => (
                                                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#374151' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {wcReports.map(r => (
                                            <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <td style={{ padding: '8px 12px', fontSize: 12 }}>{r.report_date}</td>
                                                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{r.wc_name}</td>
                                                <td style={{ padding: '8px 12px' }}>{r.calls_registered ?? '—'}</td>
                                                <td style={{ padding: '8px 12px' }}>{r.calls_allocated ?? '—'}</td>
                                                <td style={{ padding: '8px 12px', color: '#dc2626' }}>{r.pending_calls ?? '—'}</td>
                                                <td style={{ padding: '8px 12px' }}>{r.walkin_count ?? '—'}</td>
                                                <td style={{ padding: '8px 12px', fontSize: 12, color: '#6b7280' }}>{r.remarks || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}