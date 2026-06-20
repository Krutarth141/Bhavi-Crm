'use client';

import { useState, useMemo, useCallback } from 'react';
import { DailyReport } from '@/types/reports';

interface DailyReportsTabProps {
    reports: DailyReport[];
    loading: boolean;
}

export default function DailyReportsTab({ reports, loading }: DailyReportsTabProps) {
    const [filterDate, setFilterDate] = useState('');
    const [filterEng, setFilterEng] = useState('');
    const [detailReport, setDetailReport] = useState<DailyReport | null>(null);

    const engineers = useMemo(() => [...new Set(reports.map((r) => r.eng_name).filter(Boolean))], [reports]);

    const filteredReports = useMemo(() =>
        reports.filter((r) =>
            (!filterDate || r.report_date === filterDate) &&
            (!filterEng || r.eng_name === filterEng)
        ),
        [reports, filterDate, filterEng]
    );

    const handleExcel = useCallback(async () => {
        if (!reports.length) return;
        const XLSX = await import('xlsx');
        const data = reports.map((r) => ({
            'Engineer': r.eng_name,
            'Date': r.report_date,
            'W-Installation': r.warranty_installation,
            'W-Breakdown': r.warranty_breakdown,
            'OW-Breakdown': r.outwarranty_breakdown,
            'OW-Other': r.outwarranty_other,
            'Total Calls': r.total_calls,
            'Petrol KM': r.petrol_km,
            'Total Collection': r.total_amount,
            'Remarks': r.remarks || '',
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Daily Reports');
        XLSX.writeFile(wb, 'daily_reports.xlsx');
    }, [reports]);

    if (loading) return <p className="loading">Loading daily reports...</p>;

    if (!reports.length) {
        return <div className="alert alert-info">📋 No daily reports yet. Data will appear once engineers submit their reports.</div>;
    }

    return (
        <div>
            {/* Filters */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={fieldStyle} />
                <select value={filterEng} onChange={(e) => setFilterEng(e.target.value)} style={fieldStyle}>
                    <option value="">All Engineers</option>
                    {engineers.map((n) => <option key={n}>{n}</option>)}
                </select>
                {(filterDate || filterEng) && (
                    <button className="btn btn-outline btn-sm" onClick={() => { setFilterDate(''); setFilterEng(''); }}>Clear</button>
                )}
                <button className="btn btn-success btn-sm" onClick={handleExcel}>📊 Excel</button>
            </div>

            <div className="card">
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                <th>Date</th>
                                <th>Engineer</th>
                                <th style={{ background: '#eff6ff', color: '#1d4ed8' }}>W-Install</th>
                                <th style={{ background: '#eff6ff', color: '#1d4ed8' }}>W-Break</th>
                                <th style={{ background: '#fff7ed', color: '#d97706' }}>OW-Break</th>
                                <th style={{ background: '#fff7ed', color: '#d97706' }}>OW-Other</th>
                                <th>Total</th>
                                <th>KM</th>
                                <th style={{ color: '#065f46' }}>Collection</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReports.map((r) => (
                                <tr key={r.id}>
                                    <td><strong>{r.report_date}</strong></td>
                                    <td>{r.eng_name}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#1d4ed8' }}>{r.warranty_installation || 0}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#1d4ed8' }}>{r.warranty_breakdown || 0}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#d97706' }}>{r.outwarranty_breakdown || 0}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#d97706' }}>{r.outwarranty_other || 0}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{r.total_calls || 0}</td>
                                    <td style={{ textAlign: 'center' }}>{r.petrol_km || 0} km</td>
                                    <td style={{ fontWeight: 700, color: '#065f46' }}>₹{r.total_amount || 0}</td>
                                    <td>
                                        <button
                                            className="btn btn-outline btn-sm"
                                            onClick={() => setDetailReport(r)}
                                        >
                                            👁 View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredReports.length === 0 && <p className="empty-message">No reports match filters</p>}
            </div>

            {/* Detail panel */}
            {detailReport && (
                <DailyReportDetail report={detailReport} onClose={() => setDetailReport(null)} />
            )}
        </div>
    );
}

function DailyReportDetail({ report: r, onClose }: { report: DailyReport; onClose: () => void }) {
    const pays = r.payment_details || [];

    return (
        <div className="card" style={{ marginTop: '14px', borderLeft: '4px solid var(--primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                    <h3 style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 4px' }}>{r.eng_name} — {r.report_date}</h3>
                    <span className="badge badge-approve">✅ Submitted</span>
                </div>
                <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            {/* Stat grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '14px' }}>
                {[
                    { label: 'Warranty Installation', value: r.warranty_installation || 0, color: '#1d4ed8', bg: '#eff6ff' },
                    { label: 'Warranty Breakdown', value: r.warranty_breakdown || 0, color: '#1d4ed8', bg: '#eff6ff' },
                    { label: 'OW Breakdown', value: r.outwarranty_breakdown || 0, color: '#d97706', bg: '#fff7ed' },
                    { label: 'OW Other', value: r.outwarranty_other || 0, color: '#d97706', bg: '#fff7ed' },
                ].map((s) => (
                    <div key={s.label} style={{ background: s.bg, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: s.color, marginBottom: '4px' }}>{s.label}</div>
                        <div style={{ fontWeight: 700, fontSize: '24px', color: s.color }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Summary row */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '14px', padding: '10px', background: 'var(--bg)', borderRadius: '10px', fontSize: '13px' }}>
                <span>📞 Total Calls: <strong>{r.total_calls || 0}</strong></span>
                <span>🚗 KM: <strong>{r.petrol_km || 0}</strong></span>
                <span>💰 Total Collection: <strong style={{ color: '#065f46', fontSize: '15px' }}>₹{r.total_amount || 0}</strong></span>
            </div>

            {/* Payment details */}
            {pays.length > 0 ? (
                <>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>💳 Payment Details</h4>
                    <div className="table-wrap">
                        <table style={{ fontSize: '13px' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    <th style={{ textAlign: 'left' }}>Customer</th>
                                    <th style={{ textAlign: 'right' }}>Amount</th>
                                    <th>Mode</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pays.map((p, i) => (
                                    <tr key={i}>
                                        <td>{p.customer}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{p.amount}</td>
                                        <td><span className={`badge ${p.mode === 'Cash' ? 'badge-approve' : 'badge-open'}`}>{p.mode}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: '#f0fdf4' }}>
                                    <td style={{ fontWeight: 700 }}>Total</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#065f46' }}>₹{r.total_amount}</td>
                                    <td />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </>
            ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No payment details</p>
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