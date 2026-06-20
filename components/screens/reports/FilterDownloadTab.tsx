'use client';

import { Ticket, ReportFilters, BarChartItem, ReportType } from '@/types/reports';
import { getTicketFinancials } from '@/hooks/useReports';
import ReportsBarChart from '@/components/screens/reports/ReportsBarChart';
import { STATUS_OPTIONS, CALL_TYPE_OPTIONS, SERVICE_TYPE_OPTIONS } from '@/types/reports';

interface FilterDownloadTabProps {
    period: string;
    setPeriod: (v: string) => void;
    customFrom: string;
    setCustomFrom: (v: string) => void;
    customTo: string;
    setCustomTo: (v: string) => void;
    filters: ReportFilters;
    setFilters: React.Dispatch<React.SetStateAction<ReportFilters>>;
    engineers: string[];
    filtered: Ticket[];
    totalClosed: number;
    totalRevenue: number;
    reportType: ReportType;
    setReportType: (t: ReportType) => void;
    callTypeChartData: BarChartItem[];
    statusChartData: BarChartItem[];
    engineerChartData: BarChartItem[];
    revenueChartData: BarChartItem[];
    engData: [string, { calls: number; closed: number; revenue: number }][];
    handleDownload: () => void;
    handlePrint: () => void;
}

export default function FilterDownloadTab({
    period, setPeriod,
    customFrom, setCustomFrom,
    customTo, setCustomTo,
    filters, setFilters,
    engineers,
    filtered,
    totalClosed,
    totalRevenue,
    reportType, setReportType,
    callTypeChartData,
    statusChartData,
    engineerChartData,
    revenueChartData,
    engData,
    handleDownload,
    handlePrint,
}: FilterDownloadTabProps) {
    const totalCalls = filtered.length;
    const active = filtered.filter((t) => !['Closed', 'Call Cancel', 'Customer Reject'].includes(t.status)).length;
    const ci = filtered.filter((t) => t.service_type === 'Carry In').length;
    const os = filtered.filter((t) => t.service_type === 'On Site').length;

    return (
        <div>
            {/* Filters */}
            <div className="card" style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        style={selectStyle}
                    >
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="year">This Year</option>
                        <option value="custom">Custom Range</option>
                        <option value="all">All Time</option>
                    </select>
                    {period === 'custom' && (
                        <>
                            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={inputStyle} />
                            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={inputStyle} />
                        </>
                    )}
                    <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} style={selectStyle}>
                        <option value="">All Status</option>
                        {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                    <select value={filters.calltype} onChange={(e) => setFilters((f) => ({ ...f, calltype: e.target.value }))} style={selectStyle}>
                        <option value="">All Call Types</option>
                        {CALL_TYPE_OPTIONS.map((c) => <option key={c}>{c}</option>)}
                    </select>
                    <select value={filters.service} onChange={(e) => setFilters((f) => ({ ...f, service: e.target.value }))} style={selectStyle}>
                        <option value="">All Service Types</option>
                        {SERVICE_TYPE_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                    <select value={filters.engineer} onChange={(e) => setFilters((f) => ({ ...f, engineer: e.target.value }))} style={selectStyle}>
                        <option value="">All Engineers</option>
                        {engineers.map((e) => <option key={e}>{e}</option>)}
                    </select>
                    <input
                        type="text"
                        placeholder="City..."
                        value={filters.city}
                        onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
                        style={{ ...inputStyle, width: '100px' }}
                    />
                </div>
            </div>

            {/* Preview row */}
            <div style={{ background: '#eff6ff', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span>
                    <b style={{ color: 'var(--primary)' }}>{totalCalls} records</b> will be exported &nbsp;|&nbsp;
                    Active: <b>{active}</b> &nbsp;|&nbsp;
                    Closed: <b style={{ color: 'var(--success)' }}>{totalClosed}</b> &nbsp;|&nbsp;
                    Carry In: <b>{ci}</b> &nbsp;|&nbsp;
                    On Site: <b>{os}</b>
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-success btn-sm" onClick={handleDownload}>📊 Excel</button>
                    <button className="btn btn-primary btn-sm" onClick={handlePrint}>🖨️ Print / PDF</button>
                </div>
            </div>

            {/* Chart tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                {(['tickets', 'revenue', 'engineers', 'status'] as const).map((t) => (
                    <button
                        key={t}
                        className={`btn btn-sm ${reportType === t ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setReportType(t)}
                    >
                        {t === 'tickets' ? '📋 Call Types' : t === 'revenue' ? '💰 Revenue' : t === 'engineers' ? '👷 Engineers' : '📊 Status'}
                    </button>
                ))}
            </div>

            {/* Chart */}
            <div className="card" style={{ marginBottom: '18px' }}>
                {reportType === 'tickets' && (<><h3 style={{ marginTop: 0 }}>Calls by Type</h3><ReportsBarChart data={callTypeChartData} /></>)}
                {reportType === 'status' && (<><h3 style={{ marginTop: 0 }}>Calls by Status</h3><ReportsBarChart data={statusChartData} /></>)}
                {reportType === 'revenue' && (
                    <>
                        <h3 style={{ marginTop: 0 }}>Revenue by Month</h3>
                        {revenueChartData.length === 0
                            ? <p style={{ color: 'var(--text-muted)' }}>No revenue data for selected period</p>
                            : <ReportsBarChart data={revenueChartData} />}
                    </>
                )}
                {reportType === 'engineers' && (<><h3 style={{ marginTop: 0 }}>Calls by Engineer</h3><ReportsBarChart data={engineerChartData} /></>)}
            </div>

            {/* Engineer summary table */}
            {reportType === 'engineers' && engData.length > 0 && (
                <div className="card" style={{ marginBottom: '18px' }}>
                    <h3 style={{ marginTop: 0 }}>Engineer Summary</h3>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Engineer</th>
                                    <th>Total Calls</th>
                                    <th>Closed</th>
                                    <th>Closure %</th>
                                    <th>Revenue ₹</th>
                                </tr>
                            </thead>
                            <tbody>
                                {engData.map(([name, d]) => (
                                    <tr key={name}>
                                        <td><strong>{name}</strong></td>
                                        <td>{d.calls}</td>
                                        <td>{d.closed}</td>
                                        <td>{d.calls > 0 ? Math.round((d.closed / d.calls) * 100) : 0}%</td>
                                        <td>₹{d.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Detailed ticket table */}
            <div className="card">
                <h3 style={{ marginTop: 0 }}>Ticket Details ({filtered.length} records)</h3>
                {filtered.length === 0 ? (
                    <p className="empty-message">No tickets match selected filters</p>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Ticket</th>
                                    <th>Date</th>
                                    <th>Customer</th>
                                    <th>Mobile</th>
                                    <th>City</th>
                                    <th>Model</th>
                                    <th>Call Type</th>
                                    <th>Engineer</th>
                                    <th>Status</th>
                                    <th>Parts ₹</th>
                                    <th>Service ₹</th>
                                    <th>Total ₹</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((t) => {
                                    const { partsTotal, svc, grand } = getTicketFinancials(t);
                                    return (
                                        <tr key={t.id}>
                                            <td><strong>{t.id}</strong></td>
                                            <td style={{ fontSize: '12px' }}>{new Date(t.created_at).toLocaleDateString('en-IN')}</td>
                                            <td>{t.cname}</td>
                                            <td>{t.mobile}</td>
                                            <td>{t.city || '—'}</td>
                                            <td style={{ fontSize: '12px' }}>{t.brand_name} {t.model}</td>
                                            <td>{t.call_type}</td>
                                            <td>{t.assigned_name || '—'}</td>
                                            <td>
                                                <span className={`badge ${t.status === 'Closed' ? 'badge-approve' : t.status === 'Call Cancel' ? 'badge-cancel' : 'badge-open'}`}>
                                                    {t.status}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>{partsTotal > 0 ? `₹${partsTotal.toFixed(0)}` : '—'}</td>
                                            <td style={{ textAlign: 'right' }}>{svc > 0 ? `₹${svc.toFixed(0)}` : '—'}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 700 }}>{grand > 0 ? `₹${grand.toFixed(0)}` : '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: 'var(--bg)', fontWeight: 700 }}>
                                    <td colSpan={9} style={{ textAlign: 'right' }}>TOTAL</td>
                                    <td style={{ textAlign: 'right' }}>₹{filtered.reduce((a, t) => a + getTicketFinancials(t).partsTotal, 0).toFixed(0)}</td>
                                    <td style={{ textAlign: 'right' }}>₹{filtered.reduce((a, t) => a + getTicketFinancials(t).svc, 0).toFixed(0)}</td>
                                    <td style={{ textAlign: 'right', color: 'var(--primary)' }}>₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

const selectStyle: React.CSSProperties = {
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '6px 10px',
    fontSize: '13px',
    background: 'var(--card)',
    color: 'var(--text)',
};
const inputStyle: React.CSSProperties = {
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '6px 10px',
    fontSize: '13px',
};