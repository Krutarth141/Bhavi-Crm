'use client';

import { useState, useMemo, useCallback } from 'react';
import { WCDailyReport } from '@/types/reports';

interface WCDailyReportsTabProps {
    reports: WCDailyReport[];
    loading: boolean;
}

export default function WCDailyReportsTab({ reports, loading }: WCDailyReportsTabProps) {
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [filterWC, setFilterWC] = useState('');
    const [detailReport, setDetailReport] = useState<WCDailyReport | null>(null);

    const wcNames = useMemo(() => [...new Set(reports.map((r) => r.wc_name).filter(Boolean))], [reports]);

    const filteredReports = useMemo(() =>
        reports.filter((r) =>
            (!fromDate || r.report_date >= fromDate) &&
            (!toDate || r.report_date <= toDate) &&
            (!filterWC || r.wc_name === filterWC)
        ),
        [reports, fromDate, toDate, filterWC]
    );

    const setDateRange = (range: 'today' | 'week' | 'month') => {
        const now = new Date();
        const to = now.toLocaleDateString('en-CA');
        let from = to;
        if (range === 'week') {
            const d = new Date(now);
            d.setDate(d.getDate() - d.getDay());
            from = d.toLocaleDateString('en-CA');
        } else if (range === 'month') {
            from = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA');
        }
        setFromDate(from);
        setToDate(to);
    };

    const handleExcel = useCallback(async () => {
        if (!reports.length) return;
        const XLSX = await import('xlsx');
        const data = reports.map((r) => ({
            'WC Name': r.wc_name,
            'Date': r.report_date,
            'Warranty Calls': r.customer_inward,
            'Non-Warranty Calls': r.customer_outward,
            'Other Inquiry': r.other_inquiry,
            'Total Inquiries': r.total_inquiries,
            'Google Reviews': r.total_reviews,
            'Remarks': r.remarks || '',
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'WC Daily Reports');
        XLSX.writeFile(wb, 'wc_daily_reports.xlsx');
    }, [reports]);

    // Totals for filtered rows
    const totals = useMemo(() => ({
        w: filteredReports.reduce((s, r) => s + (r.customer_inward || 0), 0),
        nw: filteredReports.reduce((s, r) => s + (r.customer_outward || 0), 0),
        o: filteredReports.reduce((s, r) => s + (r.other_inquiry || 0), 0),
        t: filteredReports.reduce((s, r) => s + (r.total_inquiries || 0), 0),
        rev: filteredReports.reduce((s, r) => s + (r.total_reviews || 0), 0),
    }), [filteredReports]);

    if (loading) return <p className="loading">Loading WC daily reports...</p>;

    if (!reports.length) {
        return <div className="alert alert-info">🎯 No WC daily reports yet. Data will appear once the WC submits reports.</div>;
    }

    return (
        <div>
            {/* Filters */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>From:</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={fieldStyle} />
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>To:</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={fieldStyle} />
                <select value={filterWC} onChange={(e) => setFilterWC(e.target.value)} style={fieldStyle}>
                    <option value="">All WC</option>
                    {wcNames.map((n) => <option key={n}>{n}</option>)}
                </select>
                <button className="btn btn-outline btn-sm" onClick={() => setDateRange('today')}>Today</button>
                <button className="btn btn-outline btn-sm" onClick={() => setDateRange('week')}>Week</button>
                <button className="btn btn-outline btn-sm" onClick={() => setDateRange('month')}>Month</button>
                {(fromDate || toDate || filterWC) && (
                    <button className="btn btn-outline btn-sm" onClick={() => { setFromDate(''); setToDate(''); setFilterWC(''); }}>Clear</button>
                )}
                <button className="btn btn-success btn-sm" onClick={handleExcel}>📊 Excel</button>
            </div>

            <div className="card">
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                <th>Date</th>
                                <th>WC Name</th>
                                <th style={{ color: '#1d4ed8' }}>Warranty</th>
                                <th style={{ color: '#1d4ed8' }}>Non-Warranty</th>
                                <th style={{ color: '#d97706' }}>Other</th>
                                <th>Total</th>
                                <th style={{ color: '#065f46' }}>Reviews</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReports.map((r) => (
                                <tr key={r.id}>
                                    <td><strong>{r.report_date}</strong></td>
                                    <td>{r.wc_name}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#1d4ed8' }}>{r.customer_inward || 0}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#1d4ed8' }}>{r.customer_outward || 0}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#d97706' }}>{r.other_inquiry || 0}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{r.total_inquiries || 0}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#065f46' }}>⭐ {r.total_reviews || 0}</td>
                                    <td>
                                        <button className="btn btn-outline btn-sm" onClick={() => setDetailReport(r)}>👁 View</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {/* Totals row */}
                        {filteredReports.length > 0 && (
                            <tfoot>
                                <tr style={{ background: '#f0f9ff', fontWeight: 700, borderTop: '2px solid var(--primary)' }}>
                                    <td colSpan={2} style={{ padding: '10px', color: 'var(--primary)' }}>
                                        📊 TOTAL ({filteredReports.length} entries)
                                    </td>
                                    <td style={{ textAlign: 'center', color: '#1d4ed8', fontSize: '15px' }}>{totals.w}</td>
                                    <td style={{ textAlign: 'center', color: '#1d4ed8', fontSize: '15px' }}>{totals.nw}</td>
                                    <td style={{ textAlign: 'center', color: '#d97706', fontSize: '15px' }}>{totals.o}</td>
                                    <td style={{ textAlign: 'center', fontSize: '16px', color: 'var(--primary)' }}>{totals.t}</td>
                                    <td style={{ textAlign: 'center', color: '#065f46', fontSize: '15px' }}>⭐ {totals.rev}</td>
                                    <td />
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
                {filteredReports.length === 0 && <p className="empty-message">No reports match filters</p>}
            </div>

            {/* Detail panel */}
            {detailReport && (
                <WCReportDetail report={detailReport} onClose={() => setDetailReport(null)} />
            )}
        </div>
    );
}

function WCReportDetail({ report: r, onClose }: { report: WCDailyReport; onClose: () => void }) {
    const reviews = r.google_reviews || [];
    const ib = r.inward_breakdown;
    const ob = r.outward_breakdown;

    return (
        <div className="card" style={{ marginTop: '14px', borderLeft: '4px solid #7c3aed' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                    <h3 style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 4px' }}>{r.wc_name} — {r.report_date}</h3>
                    <span className="badge badge-approve">✅ Submitted</span>
                </div>
                <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
                <div style={{ background: '#eff6ff', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#1d4ed8', marginBottom: '4px' }}>📥 Inward Total</div>
                    <div style={{ fontWeight: 700, fontSize: '24px', color: '#1d4ed8' }}>{r.customer_inward || 0}</div>
                    {ib && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>W:{ib.warranty} | NW:{ib.non_warranty} | O:{ib.other}</div>}
                </div>
                <div style={{ background: '#fff7ed', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#d97706', marginBottom: '4px' }}>📤 Outward Total</div>
                    <div style={{ fontWeight: 700, fontSize: '24px', color: '#d97706' }}>{r.customer_outward || 0}</div>
                    {ob && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>W:{ob.warranty} | NW:{ob.non_warranty} | O:{ob.other}</div>}
                </div>
                <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#065f46', marginBottom: '4px' }}>Grand Total</div>
                    <div style={{ fontWeight: 700, fontSize: '24px', color: '#065f46' }}>{r.total_inquiries || 0}</div>
                </div>
            </div>

            {reviews.length > 0 ? (
                <>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>⭐ Google Reviews ({reviews.length})</h4>
                    <div className="table-wrap">
                        <table style={{ fontSize: '13px' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    <th style={{ textAlign: 'left' }}>Customer</th>
                                    <th>Rating</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reviews.map((rv, i) => (
                                    <tr key={i}>
                                        <td>{rv.customer}</td>
                                        <td>{'⭐'.repeat(rv.stars || 5)} ({rv.stars})</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: '#f0fdf4' }}>
                                    <td style={{ fontWeight: 700 }}>Total Reviews</td>
                                    <td style={{ fontWeight: 700, color: '#065f46' }}>{reviews.length}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </>
            ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>No Google reviews today</p>
            )}

            {r.remarks && (
                <div style={{ marginTop: '12px', padding: '10px', background: 'var(--bg)', borderRadius: '8px', fontSize: '13px' }}>
                    <strong>Remarks:</strong> {r.remarks}
                </div>
            )}
        </div>
    );
}

const fieldStyle: React.CSSProperties = {
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '6px 10px',
    fontSize: '13px',
    background: 'var(--card)',
    color: 'var(--text)',
};