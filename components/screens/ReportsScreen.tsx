'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface Ticket {
  id: string;
  created_at: string;
  cname: string;
  mobile: string;
  alt_mobile?: string;
  city?: string;
  state?: string;
  address?: string;
  brand_name?: string;
  model?: string;
  serial?: string;
  call_type: string;
  service_type: string;
  warranty_coverage?: string;
  problem?: string;
  action?: string;
  fault_code?: string;
  assigned_name?: string;
  status: string;
  visit_date?: string;
  se_call_id?: string;
  spares?: { name?: string; code?: string; qty?: number; price?: number }[];
  service_charges?: number;
  labor?: number;
  other_charge?: number;
  final_charges?: number;
  remarks?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getReportDates(period: string, customFrom: string, customTo: string) {
  const now = new Date();
  let from = new Date(0);
  let to = new Date();

  if (period === 'today') {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === 'week') {
    from = new Date(now);
    from.setDate(now.getDate() - now.getDay());
    from.setHours(0, 0, 0, 0);
  } else if (period === 'month') {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === 'year') {
    from = new Date(now.getFullYear(), 0, 1);
  } else if (period === 'custom' && customFrom && customTo) {
    from = new Date(customFrom);
    to = new Date(customTo);
    to.setHours(23, 59, 59, 999);
  }
  return { from, to };
}

function getTicketFinancials(t: Ticket) {
  const spares = t.spares || [];
  const partsTotal = spares.reduce((a, s) => a + (s.qty || 0) * (s.price || 0), 0);
  const partsNames = spares
    .map((s) => (s.name || s.code || '') + ' x' + (s.qty || 1))
    .filter(Boolean)
    .join(', ');
  const svc = parseFloat(String(t.service_charges)) || parseFloat(String(t.labor)) || 0;
  const other = parseFloat(String(t.other_charge)) || 0;
  const final = parseFloat(String(t.final_charges)) || 0;
  const grand = final > 0 ? final : svc + partsTotal + other;
  return { partsTotal, partsNames, svc, other, final, grand };
}

function applyFilters(
  tickets: Ticket[],
  period: string,
  customFrom: string,
  customTo: string,
  filters: {
    status: string;
    service: string;
    calltype: string;
    engineer: string;
    city: string;
  }
) {
  const { from, to } = getReportDates(period, customFrom, customTo);
  return tickets.filter((t) => {
    const d = t.created_at ? new Date(t.created_at) : null;
    if (d && (d < from || d > to)) return false;
    if (filters.status && t.status !== filters.status) return false;
    if (filters.service && t.service_type !== filters.service) return false;
    if (filters.calltype && t.call_type !== filters.calltype) return false;
    if (filters.engineer && t.assigned_name !== filters.engineer) return false;
    if (filters.city && !(t.city || '').toLowerCase().includes(filters.city.toLowerCase().trim())) return false;
    return true;
  });
}

// ─── Mini Bar Chart ──────────────────────────────────────────────────────────

function BarChart({ data }: { data: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {data.map((d) => (
        <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '140px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
            {d.label}
          </div>
          <div style={{ flex: 1, background: 'var(--bg)', borderRadius: '4px', height: '22px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${(d.value / max) * 100}%`,
                background: d.color || 'var(--primary)',
                height: '100%',
                borderRadius: '4px',
                transition: 'width 0.4s ease',
                minWidth: d.value > 0 ? '4px' : '0',
              }}
            />
          </div>
          <div style={{ width: '40px', fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>
            {d.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ReportsScreen() {
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [filters, setFilters] = useState({ status: '', service: '', calltype: '', engineer: '', city: '' });
  const [reportType, setReportType] = useState<'tickets' | 'revenue' | 'engineers' | 'status'>('tickets');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('tickets').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setAllTickets(data || []);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = applyFilters(allTickets, period, customFrom, customTo, filters);

  // KPIs
  const totalCalls = filtered.length;
  const totalClosed = filtered.filter((t) => t.status === 'Closed').length;
  const totalRevenue = filtered.reduce((a, t) => a + getTicketFinancials(t).grand, 0);
  const closureRate = totalCalls > 0 ? Math.round((totalClosed / totalCalls) * 100) : 0;

  // Chart data
  const statusCounts = ['Pending Allocation', 'Assigned', 'In Progress', 'Pending Customer Approval', 'Closed', 'Call Cancel'].map((s) => ({
    label: s,
    value: filtered.filter((t) => t.status === s).length,
    color: s === 'Closed' ? '#0e9f6e' : s === 'Call Cancel' ? '#f05252' : s === 'In Progress' ? '#1a56db' : '#ff9800',
  }));

  const callTypeCounts = ['Warranty', 'Non-Warranty', 'AMC'].map((c) => ({
    label: c,
    value: filtered.filter((t) => t.call_type === c).length,
    color: c === 'Warranty' ? '#0e9f6e' : c === 'Non-Warranty' ? '#f05252' : '#1a56db',
  }));

  // Engineer-wise
  const engMap: Record<string, { calls: number; closed: number; revenue: number }> = {};
  filtered.forEach((t) => {
    const name = t.assigned_name || 'Unassigned';
    if (!engMap[name]) engMap[name] = { calls: 0, closed: 0, revenue: 0 };
    engMap[name].calls++;
    if (t.status === 'Closed') engMap[name].closed++;
    engMap[name].revenue += getTicketFinancials(t).grand;
  });
  const engData = Object.entries(engMap).sort((a, b) => b[1].calls - a[1].calls);

  // Monthly revenue (last 6 months)
  const monthlyRevenue: Record<string, number> = {};
  filtered.forEach((t) => {
    const d = new Date(t.created_at);
    const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    monthlyRevenue[key] = (monthlyRevenue[key] || 0) + getTicketFinancials(t).grand;
  });
  const revenueChartData = Object.entries(monthlyRevenue)
    .slice(-6)
    .map(([label, value]) => ({ label, value: Math.round(value), color: '#1a56db' }));

  // Unique engineers for filter dropdown
  const engineers = [...new Set(allTickets.map((t) => t.assigned_name).filter(Boolean))];

  // ── Download Excel ──────────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!filtered.length) { alert('No data for selected filters'); return; }
    // Dynamically import xlsx
    const XLSX = await import('xlsx');
    const data = filtered.map((t) => {
      const { partsTotal, partsNames, svc, other, final, grand } = getTicketFinancials(t);
      return {
        'Ticket ID': t.id || '',
        'Date': t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN') : '',
        'Customer': t.cname || '',
        'Mobile': t.mobile || '',
        'Alt Mobile': t.alt_mobile || '',
        'City': t.city || '',
        'State': t.state || '',
        'Address': t.address || '',
        'Brand': t.brand_name || '',
        'Model': t.model || '',
        'Serial No': t.serial || '',
        'Call Type': t.call_type || '',
        'Service Type': t.service_type || '',
        'Coverage': t.warranty_coverage || '',
        'Problem': t.problem || '',
        'Action Taken': t.action || '',
        'Fault Code': t.fault_code || '',
        'Engineer': t.assigned_name || 'Unassigned',
        'Status': t.status || '',
        'Visit Date': t.visit_date || '',
        'SE Call ID': t.se_call_id || '',
        'Parts Used': partsNames,
        'Parts ₹': partsTotal.toFixed(2),
        'Service/Labour ₹': svc.toFixed(2),
        'Other ₹': other.toFixed(2),
        'Final Charges ₹': final.toFixed(2),
        'Grand Total ₹': grand.toFixed(2),
        'Remarks': t.remarks || '',
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 16 }, { wch: 12 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 25 },
      { wch: 10 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 25 }, { wch: 25 },
      { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 30 },
      { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    const dateStr = new Date().toLocaleDateString('en-CA');
    XLSX.writeFile(wb, `BhaviCRM_Report_${period}_${dateStr}.xlsx`);
  };

  // ── Print ───────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    if (!filtered.length) { alert('No data for selected filters'); return; }
    const totalParts = filtered.reduce((a, t) => a + getTicketFinancials(t).partsTotal, 0);
    const totalSvc = filtered.reduce((a, t) => a + getTicketFinancials(t).svc, 0);
    const totalGrand = filtered.reduce((a, t) => a + getTicketFinancials(t).grand, 0);

    const rows = filtered.map((t, i) => {
      const { partsTotal, partsNames, svc, grand } = getTicketFinancials(t);
      return `<tr>
        <td style="text-align:center;">${i + 1}</td>
        <td>${t.id}</td>
        <td>${t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN') : ''}</td>
        <td>${t.cname || ''}</td>
        <td>${t.mobile || ''}</td>
        <td>${t.city || ''}</td>
        <td>${t.model || ''}</td>
        <td>${t.serial || ''}</td>
        <td>${t.call_type || ''}</td>
        <td>${t.service_type || ''}</td>
        <td>${t.problem || ''}</td>
        <td>${t.assigned_name || '—'}</td>
        <td><b>${t.status || ''}</b></td>
        <td style="text-align:right;">${partsNames || '—'}</td>
        <td style="text-align:right;">${partsTotal.toFixed(0)}</td>
        <td style="text-align:right;">${svc.toFixed(0)}</td>
        <td style="text-align:right;font-weight:700;">${grand.toFixed(0)}</td>
      </tr>`;
    }).join('');

    const win = window.open('', '_blank');
    if (!win) { alert('Please allow popups for printing'); return; }
    win.document.write(`<!DOCTYPE html><html><head><title>Bhavi CRM Report</title>
      <style>
        @page{size:A4 landscape;margin:10mm;}
        body{font-family:Arial,sans-serif;font-size:10px;}
        table{width:100%;border-collapse:collapse;}
        th,td{border:1px solid #ccc;padding:4px 6px;text-align:left;}
        th{background:#e8efff;font-weight:700;font-size:10px;}
        .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;border-bottom:2px solid #1a56db;padding-bottom:6px;}
        .co{font-size:16px;font-weight:900;color:#1a56db;}
        .summary{display:flex;gap:20px;margin-bottom:8px;font-size:11px;}
        .sum-item{background:#f0f4ff;padding:4px 10px;border-radius:4px;}
        .tfoot td{background:#f0f4ff;font-weight:700;}
      </style></head><body>
      <div class="header">
        <div>
          <div class="co">Bhavi Electronics & Automation</div>
          <div style="font-size:11px;color:#555;">Service CRM Report — Generated: ${new Date().toLocaleString('en-IN')}</div>
        </div>
        <div style="text-align:right;font-size:11px;">Period: ${period} | Total: ${filtered.length} records</div>
      </div>
      <div class="summary">
        <div class="sum-item">Total Calls: <b>${filtered.length}</b></div>
        <div class="sum-item">Closed: <b>${totalClosed}</b></div>
        <div class="sum-item">Parts ₹: <b>${totalParts.toFixed(0)}</b></div>
        <div class="sum-item">Service ₹: <b>${totalSvc.toFixed(0)}</b></div>
        <div class="sum-item">Grand Total ₹: <b>${totalGrand.toFixed(0)}</b></div>
      </div>
      <table><thead><tr>
        <th>#</th><th>Ticket</th><th>Date</th><th>Customer</th><th>Mobile</th><th>City</th>
        <th>Model</th><th>Serial</th><th>Call Type</th><th>Service</th><th>Problem</th>
        <th>Engineer</th><th>Status</th><th>Parts Used</th><th>Parts ₹</th><th>Service ₹</th><th>Total ₹</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr>
        <td colspan="14" style="text-align:right;font-weight:700;">TOTAL</td>
        <td style="text-align:right;">${totalParts.toFixed(0)}</td>
        <td style="text-align:right;">${totalSvc.toFixed(0)}</td>
        <td style="text-align:right;font-weight:900;color:#1a56db;">${totalGrand.toFixed(0)}</td>
      </tr></tfoot>
      </table>
      <script>window.print();<\/script></body></html>`);
    win.document.close();
  };

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
          <option>Pending Allocation</option>
          <option>Assigned</option>
          <option>In Progress</option>
          <option>Pending Customer Approval</option>
          <option>Closed</option>
          <option>Call Cancel</option>
        </select>
        <select value={filters.calltype} onChange={(e) => setFilters((f) => ({ ...f, calltype: e.target.value }))}>
          <option value="">All Call Types</option>
          <option>Warranty</option>
          <option>Non-Warranty</option>
          <option>AMC</option>
        </select>
        <select value={filters.service} onChange={(e) => setFilters((f) => ({ ...f, service: e.target.value }))}>
          <option value="">All Service Types</option>
          <option>Repair</option>
          <option>Installation</option>
          <option>Maintenance</option>
          <option>Carry In</option>
          <option>On Site</option>
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
                <BarChart data={callTypeCounts} />
              </>
            )}
            {reportType === 'status' && (
              <>
                <h3 style={{ marginTop: 0 }}>Calls by Status</h3>
                <BarChart data={statusCounts} />
              </>
            )}
            {reportType === 'revenue' && (
              <>
                <h3 style={{ marginTop: 0 }}>Revenue by Month</h3>
                {revenueChartData.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No revenue data for selected period</p>
                ) : (
                  <BarChart data={revenueChartData} />
                )}
              </>
            )}
            {reportType === 'engineers' && (
              <>
                <h3 style={{ marginTop: 0 }}>Calls by Engineer</h3>
                <BarChart data={engData.map(([name, d]) => ({ label: name, value: d.calls, color: '#7c3aed' }))} />
              </>
            )}
          </div>

          {/* Engineer Table (shown when engineer tab active) */}
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