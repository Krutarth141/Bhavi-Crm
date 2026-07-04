'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { useSession } from 'next-auth/react';
import { WalkInEntry } from '@/types/walkin';
import { useWalkIn } from '@/hooks/useWalkIn';
import { colors, styles } from '@/styles/ticketsStyles';

function getToday(): string {
  return new Date().toLocaleDateString('en-CA');
}

export default function WalkInReportScreen() {
  const { data: session } = useSession();
  const currentUserRole = (session?.user as any)?.roleType ?? '';
  const currentUserId = (session?.user as any)?.id ?? '';

  const { fetchByDateRange } = useWalkIn(currentUserRole, currentUserId);

  const [fromDate, setFromDate] = useState(getToday());
  const [toDate, setToDate] = useState(getToday());
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<WalkInEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const data = await fetchByDateRange(fromDate, toDate, search);
      setResults(data);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (results.length === 0) {
      alert('No data to export');
      return;
    }

    const rows = results.map((entry) => ({
      'Token #': entry.token_no,
      'Visit Date': entry.visit_date,
      'Customer Name': entry.customer_name,
      'Mobile': entry.mobile,
      'Arrival Time': entry.arrival_time || '',
      'Departure Time': entry.departure_time || '',
      'Work Controller': entry.wc_name || '',
      'Products Count': entry.products?.length ?? 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Walk-in Report');
    XLSX.writeFile(workbook, 'walk_in_report.xlsx');
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>🚶 Walk-in Report</h2>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          marginBottom: '20px',
          background: '#fff',
          padding: '16px',
          borderRadius: '10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: `1px solid ${colors.border}`,
        }}
      >
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{ ...styles.filterInput, minWidth: '150px', flex: 'unset' }}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.formLabel}>To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{ ...styles.filterInput, minWidth: '150px', flex: 'unset' }}
          />
        </div>

        <div style={{ ...styles.formGroup, flex: 1, minWidth: '200px' }}>
          <label style={styles.formLabel}>Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Customer name or mobile..."
            style={styles.filterInput}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        <button
          style={{ ...styles.btn, ...styles.btnPrimary }}
          onClick={handleSearch}
          disabled={loading}
          onMouseEnter={(e) => !loading && Object.assign(e.currentTarget.style, styles.btnPrimaryHover)}
          onMouseLeave={(e) => !loading && Object.assign(e.currentTarget.style, styles.btnPrimary)}
        >
          {loading ? '⏳ Searching...' : '🔍 Search'}
        </button>

        <button
          style={{
            ...styles.btn,
            background: '#16a34a',
            color: '#fff',
          }}
          onClick={handleExportExcel}
          disabled={results.length === 0}
          onMouseEnter={(e) => results.length > 0 && Object.assign(e.currentTarget.style, { background: '#15803d', color: '#fff' })}
          onMouseLeave={(e) => results.length > 0 && Object.assign(e.currentTarget.style, { background: '#16a34a', color: '#fff' })}
        >
          📥 Export Excel
        </button>
      </div>

      {/* Results */}
      {loading ? (
        <div style={styles.loadingText}>Searching...</div>
      ) : searched && results.length === 0 ? (
        <div style={styles.emptyMessage}>No walk-in entries found for the selected criteria</div>
      ) : results.length > 0 ? (
        <>
          <div style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '8px' }}>
            {results.length} record{results.length !== 1 ? 's' : ''} found
          </div>
          <div style={styles.card}>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.tableHeader}>Token #</th>
                    <th style={styles.tableHeader}>Visit Date</th>
                    <th style={styles.tableHeader}>Customer Name</th>
                    <th style={styles.tableHeader}>Mobile</th>
                    <th style={styles.tableHeader}>Arrival</th>
                    <th style={styles.tableHeader}>Departure</th>
                    <th style={styles.tableHeader}>Work Controller</th>
                    <th style={styles.tableHeader}>Products</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((entry) => (
                    <tr
                      key={entry.id}
                      style={styles.tableRow}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.card)}
                    >
                      <td style={styles.tableCell}>
                        <span
                          style={{
                            background: '#dbeafe',
                            color: '#1d4ed8',
                            borderRadius: '20px',
                            padding: '3px 10px',
                            fontWeight: 700,
                            fontSize: '13px',
                          }}
                        >
                          #{entry.token_no}
                        </span>
                      </td>
                      <td style={{ ...styles.tableCell, fontSize: '12px' }}>{entry.visit_date}</td>
                      <td style={styles.tableCell}>
                        <strong>{entry.customer_name}</strong>
                      </td>
                      <td style={{ ...styles.tableCell, color: colors.primary, fontWeight: 600 }}>
                        {entry.mobile}
                      </td>
                      <td style={{ ...styles.tableCell, fontSize: '12px' }}>
                        {entry.arrival_time || '—'}
                      </td>
                      <td style={{ ...styles.tableCell, fontSize: '12px' }}>
                        {entry.departure_time || '—'}
                      </td>
                      <td style={{ ...styles.tableCell, fontSize: '12px' }}>
                        {entry.wc_name || '—'}
                      </td>
                      <td style={styles.tableCell}>
                        <span
                          style={{
                            background: '#f0fdf4',
                            color: '#16a34a',
                            borderRadius: '20px',
                            padding: '3px 10px',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          {entry.products?.length ?? 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
