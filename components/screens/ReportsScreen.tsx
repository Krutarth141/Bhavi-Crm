'use client';

import { useReports, getTicketFinancials } from '@/hooks/useReports';
import ReportsBarChart from '@/components/screens/reports/ReportsBarChart';
import { SERVICE_TYPE_OPTIONS, CALL_TYPE_OPTIONS, STATUS_OPTIONS } from '@/types/reports';

export default function ReportsScreen() {
  const {
    loading,
    period, setPeriod,
    customFrom, setCustomFrom,
    customTo, setCustomTo,
    filters, setFilters,
    reportType, setReportType,
    filtered,
    engineers,
    engData,
    totalCalls,
    totalClosed,
    totalRevenue,
    closureRate,
    statusChartData,
    callTypeChartData,
    engineerChartData,
    revenueChartData,
    handleDownload,
    handlePrint,
  } = useReports();

  return (
    <div className="content-section">
      {/* Header */}
      <div className="section-header">
        <h2>📈 Reports</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline btn-sm" onClick={handleDownload}>📊 Download Excel</button>
          <button className="btn btn-primary btn-sm" onClick={handlePrint}>🖨️ Print</button>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ flexWrap: 'wrap', gap: '8px' }}>
        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
          <option value="custom">Custom Range</option>
          <option value="all">All Time</option>
        </select>
        {period === 'custom' && (
          <>
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </>
        )}
        <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
          <option value="">All Status</option>
          {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={filters.calltype} onChange={(e) => setFilters((f) => ({ ...f, calltype: e.target.value }))}>
          <option value="">All Call Types</option>
          {CALL_TYPE_OPTIONS.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={filters.service} onChange={(e) => setFilters((f) => ({ ...f, service: e.target.value }))}>
          <option value="">All Service Types</option>
          {SERVICE_TYPE_OPTIONS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={filters.engineer} onChange={(e) => setFilters((f) => ({ ...f, engineer: e.target.value }))}>
          <option value="">All Engineers</option>
          {engineers.map((e) => <option key={e}>{e}</option>)}
        </select>
        <input
          type="text"
          placeholder="City..."
          value={filters.city}
          onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
          style={{ width: '100px' }}
        />
      </div>

      {/* KPI Cards */}
      <div className="report-kpi" style={{ marginBottom: '18px' }}>
        <div className="report-kpi-card">
          <div className="val">{totalCalls}</div>
          <div className="lbl">Total Calls</div>
        </div>
        <div className="report-kpi-card">
          <div className="val">{totalClosed}</div>
          <div className="lbl">Closed</div>
        </div>
        <div className="report-kpi-card">
          <div className="val">₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          <div className="lbl">Revenue</div>
        </div>
        <div className="report-kpi-card">
          <div className="val">{closureRate}%</div>
          <div className="lbl">Closure Rate</div>
        </div>
      </div>

      {loading ? (
        <p className="loading">Loading report data...</p>
      ) : (
        <>
          {/* Chart Tabs */}
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

          {/* Charts */}
          <div className="card" style={{ marginBottom: '18px' }}>
            {reportType === 'tickets' && (
              <>
                <h3 style={{ marginTop: 0 }}>Calls by Type</h3>
                <ReportsBarChart data={callTypeChartData} />
              </>
            )}
            {reportType === 'status' && (
              <>
                <h3 style={{ marginTop: 0 }}>Calls by Status</h3>
                <ReportsBarChart data={statusChartData} />
              </>
            )}
            {reportType === 'revenue' && (
              <>
                <h3 style={{ marginTop: 0 }}>Revenue by Month</h3>
                {revenueChartData.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No revenue data for selected period</p>
                ) : (
                  <ReportsBarChart data={revenueChartData} />
                )}
              </>
            )}
            {reportType === 'engineers' && (
              <>
                <h3 style={{ marginTop: 0 }}>Calls by Engineer</h3>
                <ReportsBarChart data={engineerChartData} />
              </>
            )}
          </div>

          {/* Engineer Summary Table */}
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

          {/* Detailed Ticket Table */}
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
                      <td style={{ textAlign: 'right' }}>
                        ₹{filtered.reduce((a, t) => a + getTicketFinancials(t).partsTotal, 0).toFixed(0)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        ₹{filtered.reduce((a, t) => a + getTicketFinancials(t).svc, 0).toFixed(0)}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--primary)' }}>
                        ₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}