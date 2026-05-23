'use client';

import { useState } from 'react';

export default function ReportsScreen() {
  const [reportType, setReportType] = useState('tickets');
  const [period, setPeriod] = useState('month');
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="content-section">
      <div className="section-header">
        <h2>📈 Reports</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline btn-sm">📊 Download</button>
          <button className="btn btn-primary btn-sm">🖨️ Print</button>
        </div>
      </div>

      <div className="report-kpi">
        <div className="report-kpi-card">
          <div className="val">256</div>
          <div className="lbl">Total Calls</div>
        </div>
        <div className="report-kpi-card">
          <div className="val">189</div>
          <div className="lbl">Closed</div>
        </div>
        <div className="report-kpi-card">
          <div className="val">₹45,200</div>
          <div className="lbl">Revenue</div>
        </div>
        <div className="report-kpi-card">
          <div className="val">92%</div>
          <div className="lbl">Satisfaction</div>
        </div>
      </div>

      <div className="filter-bar">
        <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
          <option value="tickets">Tickets Report</option>
          <option value="revenue">Revenue Report</option>
          <option value="engineers">Engineers Report</option>
          <option value="inventory">Inventory Report</option>
        </select>
        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Chart will appear here</h3>
        <div
          style={{
            background: 'var(--bg)',
            borderRadius: '10px',
            padding: '40px',
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}
        >
          📊 Chart Component - Coming Soon
        </div>
      </div>

      <div className="card" style={{ marginTop: '18px' }}>
        <h3 style={{ marginTop: 0 }}>Report Details</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Total Calls</td>
                <td>256</td>
                <td style={{ color: '#0e9f6e' }}>↑ +12%</td>
              </tr>
              <tr>
                <td>Average Resolution Time</td>
                <td>2.4 days</td>
                <td style={{ color: '#f05252' }}>↓ -8%</td>
              </tr>
              <tr>
                <td>Customer Satisfaction</td>
                <td>92%</td>
                <td style={{ color: '#0e9f6e' }}>↑ +3%</td>
              </tr>
              <tr>
                <td>Revenue</td>
                <td>₹45,200</td>
                <td style={{ color: '#0e9f6e' }}>↑ +18%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
