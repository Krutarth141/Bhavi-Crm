'use client';

import { useWeeklyReport } from '@/hooks/useWeeklyReport';
import { getWeekRange, getLastWeekRange } from '@/types/weeklyReport';
import * as XLSX from 'xlsx';

const pct = (curr: number, prev: number) => {
    if (!prev) return curr > 0 ? '🆕 New' : '—';
    const p = Math.round((curr - prev) / prev * 100);
    return (p >= 0 ? '▲ +' : '▼ ') + p + '%';
};
const pctColor = (curr: number, prev: number) => !prev ? '#6366f1' : (curr >= prev ? '#10b981' : '#ef4444');

export default function WeeklyReportScreen() {
    const {
        filter, setFilter,
        engReports, wcReports,
        loading, error,
        closed, prevClosed, revenue, prevRevenue, newTickets,
        collected, totalKm, presentDays,
        engScorecard, dayLabels, dayVals,
    } = useWeeklyReport();

    const exportExcel = () => {
        const wb = XLSX.utils.book_new();
        const sumRows = [
            ['Weekly Master Report', ''],
            ['Period', `${filter.from} to ${filter.to}`],
            ['', ''],
            ['Metric', 'Value'],
            ['Calls Closed', closed],
            ['New Tickets', newTickets],
            ['Revenue', revenue],
            ['Collected', collected],
            ['Total KM', totalKm],
            ['Present Days', presentDays],
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sumRows), 'Summary');

        const scoreRows = engScorecard.map(e => ({ Engineer: e.name, Closed: e.closed, 'New Assigned': e.newCalls, Revenue: e.revenue }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(scoreRows), 'Engineer Scorecard');

        const dailyRows = engReports.map(r => ({
            Date: r.report_date, Engineer: r.eng_name,
            'W-Installation': r.warranty_installation, 'W-Breakdown': r.warranty_breakdown,
            'OW-Breakdown': r.outwarranty_breakdown, 'OW-Other': r.outwarranty_other,
            'Total Calls': r.total_calls, 'Petrol KM': r.petrol_km, 'Collection': r.total_amount, Remarks: r.remarks || '',
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailyRows), 'Engineer Daily Reports');

        if (wcReports.length) {
            const wcRows = wcReports.map(r => ({
                Date: r.report_date, WC: r.wc_name, Inward: r.customer_inward, Outward: r.customer_outward,
                'Total Inquiries': r.total_inquiries, 'Total Reviews': r.total_reviews, Remarks: r.remarks || '',
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(wcRows), 'WC Daily Reports');
        }

        XLSX.writeFile(wb, `weekly_master_report_${filter.from}_${filter.to}.xlsx`);
    };

    const maxDay = Math.max(...dayVals, 1);
    const maxRev = engScorecard.length ? Math.max(...engScorecard.map(e => e.revenue)) : 1;

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>📊 Weekly Master Report</h1>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => setFilter(getWeekRange())} style={{ padding: '8px 14px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>📅 This Week</button>
                    <button onClick={() => setFilter(getLastWeekRange())} style={{ padding: '8px 14px', background: '#64748b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>◀ Last Week</button>
                    <button onClick={exportExcel} style={{ padding: '8px 14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>📥 Download Excel</button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>From:</label>
                <input type="date" value={filter.from} onChange={e => setFilter(f => ({ ...f, from: e.target.value }))} style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13 }} />
                <label style={{ fontSize: 13, fontWeight: 600 }}>To:</label>
                <input type="date" value={filter.to} onChange={e => setFilter(f => ({ ...f, to: e.target.value }))} style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13 }} />
                {error && <span style={{ color: '#dc2626', fontSize: 13 }}>Error: {error}</span>}
            </div>

            {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</p> : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
                        {[
                            { icon: '🎫', label: 'Calls Closed', curr: closed, prev: prevClosed },
                            { icon: '📥', label: 'New Tickets', curr: newTickets, prev: null },
                            { icon: '💰', label: 'Revenue ₹', curr: '₹' + Math.round(revenue).toLocaleString('en-IN'), prev: prevRevenue, currRaw: revenue },
                            { icon: '💵', label: 'Collected ₹', curr: '₹' + Math.round(collected).toLocaleString('en-IN'), prev: null },
                            { icon: '🚗', label: 'Total KM', curr: totalKm + ' km', prev: null },
                            { icon: '👷', label: 'Present Days', curr: presentDays, prev: null },
                        ].map(c => {
                            const currRaw = (c as any).currRaw ?? c.curr;
                            const trend = c.prev !== null ? pct(currRaw as number, c.prev as number) : '';
                            const tColor = c.prev !== null ? pctColor(currRaw as number, c.prev as number) : '#6366f1';
                            return (
                                <div key={c.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, textAlign: 'center' }}>
                                    <div style={{ fontSize: 26 }}>{c.icon}</div>
                                    <div style={{ fontSize: 20, fontWeight: 800, color: '#1f2937', margin: '4px 0' }}>{c.curr}</div>
                                    <div style={{ fontSize: 11, color: '#6b7280' }}>{c.label}</div>
                                    {trend && <div style={{ fontSize: 12, fontWeight: 700, color: tColor, marginTop: 4 }}>{trend} vs prev</div>}
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, marginBottom: 16, padding: 16 }}>
                        <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>📈 Daily Trend — Calls Closed</h3>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
                            {dayVals.map((v, i) => (
                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8' }}>{v}</div>
                                    <div style={{ width: '100%', height: Math.round(v / maxDay * 80), background: v === maxDay && v > 0 ? '#7c3aed' : '#1d4ed8', borderRadius: '4px 4px 0 0', minHeight: 2 }} />
                                    <div style={{ fontSize: 9, color: '#9ca3af' }}>{dayLabels[i]}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, marginBottom: 16, overflow: 'hidden' }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: 15 }}>👷 Engineer Scorecard</div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead><tr style={{ background: '#f8fafc' }}>
                                    <th style={{ padding: 10, textAlign: 'left' }}>Engineer</th>
                                    <th style={{ padding: 10, textAlign: 'center' }}>Closed</th>
                                    <th style={{ padding: 10, textAlign: 'center' }}>New Assigned</th>
                                    <th style={{ padding: 10, textAlign: 'right' }}>Revenue</th>
                                    <th style={{ padding: 10 }}>Performance</th>
                                </tr></thead>
                                <tbody>
                                    {engScorecard.map(e => (
                                        <tr key={e.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: 10, fontWeight: 700 }}>{e.name}</td>
                                            <td style={{ padding: 10, textAlign: 'center', fontSize: 18, fontWeight: 800, color: '#1d4ed8' }}>{e.closed}</td>
                                            <td style={{ padding: 10, textAlign: 'center' }}>{e.newCalls}</td>
                                            <td style={{ padding: 10, textAlign: 'right', fontWeight: 700, color: '#10b981' }}>₹{Math.round(e.revenue).toLocaleString('en-IN')}</td>
                                            <td style={{ padding: 10, minWidth: 100 }}>
                                                <div style={{ background: '#f1f5f9', borderRadius: 4, height: 8 }}>
                                                    <div style={{ background: '#7c3aed', height: 8, borderRadius: 4, width: `${maxRev > 0 ? Math.round(e.revenue / maxRev * 100) : 0}%` }} />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, marginBottom: 16, overflow: 'hidden' }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: 15 }}>📅 Engineer Daily Reports ({engReports.length})</div>
                        {engReports.length === 0 ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 20 }}>No reports for this period</p> : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead><tr style={{ background: '#f8fafc' }}>
                                        {['Date', 'Engineer', 'W-Install', 'W-Break', 'OW-Break', 'Total Calls', 'KM', 'Collection', 'Remarks'].map(h => (
                                            <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr></thead>
                                    <tbody>
                                        {engReports.map(r => (
                                            <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '8px 12px', fontSize: 12, whiteSpace: 'nowrap' }}>{r.report_date}</td>
                                                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{r.eng_name}</td>
                                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>{r.warranty_installation || 0}</td>
                                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>{r.warranty_breakdown || 0}</td>
                                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>{r.outwarranty_breakdown || 0}</td>
                                                <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700 }}>{r.total_calls || 0}</td>
                                                <td style={{ padding: '8px 12px' }}>{r.petrol_km || 0} km</td>
                                                <td style={{ padding: '8px 12px', fontWeight: 600, color: '#065f46' }}>₹{r.total_amount || 0}</td>
                                                <td style={{ padding: '8px 12px', fontSize: 12, color: '#6b7280', maxWidth: 200 }}>{r.remarks || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {wcReports.length > 0 && (
                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: 15 }}>🎯 WC Daily Reports ({wcReports.length})</div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead><tr style={{ background: '#f8fafc' }}>
                                        {['Date', 'WC', 'Inward', 'Outward', 'Total Inq.', 'Reviews', 'Remarks'].map(h => (
                                            <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#374151' }}>{h}</th>
                                        ))}
                                    </tr></thead>
                                    <tbody>
                                        {wcReports.map(r => (
                                            <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '8px 12px', fontSize: 12 }}>{r.report_date}</td>
                                                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{r.wc_name}</td>
                                                <td style={{ padding: '8px 12px' }}>{r.customer_inward ?? '—'}</td>
                                                <td style={{ padding: '8px 12px' }}>{r.customer_outward ?? '—'}</td>
                                                <td style={{ padding: '8px 12px' }}>{r.total_inquiries ?? '—'}</td>
                                                <td style={{ padding: '8px 12px' }}>{r.total_reviews ?? '—'}</td>
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