'use client';

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { CourierEntry, CourierReceiver } from '@/types/courier';
import { colors, styles } from '@/styles/ticketsStyles';

const todayStr = () => new Date().toLocaleDateString('en-CA');

const inputStyle: React.CSSProperties = {
  border: `1px solid ${colors.border}`,
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '13px',
  color: colors.text,
  backgroundColor: colors.card,
  outline: 'none',
};

const statusBadgeStyle = (status: string): React.CSSProperties => {
  if (status === 'pending') return { backgroundColor: '#fef9c3', color: '#854d0e' };
  if (status === 'received') return { backgroundColor: '#dcfce7', color: '#15803d' };
  if (status === 'dispatched') return { backgroundColor: '#dbeafe', color: '#1d4ed8' };
  return {};
};

const typeBadgeStyle = (type: string): React.CSSProperties => {
  if (type === 'Inward') return { backgroundColor: '#dbeafe', color: '#1d4ed8' };
  return { backgroundColor: '#fed7aa', color: '#c2410c' };
};

export default function CourierReportScreen() {
  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate, setToDate] = useState(todayStr());
  const [typeFilter, setTypeFilter] = useState<'all' | 'Inward' | 'Outward'>('all');
  const [results, setResults] = useState<CourierEntry[]>([]);
  const [receivers, setReceivers] = useState<CourierReceiver[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const loadReceivers = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('receiver_master')          // ← fixed: was courier_receivers
          .select('*')
          .order('name', { ascending: true });
        if (fetchError) throw fetchError;
        setReceivers(data ?? []);
      } catch (err: any) {
        console.error('Failed to load receivers:', err);
      }
    };
    loadReceivers();
  }, []);

  const getReceiverName = (id?: string) => {
    if (!id) return '—';
    return receivers.find((r) => r.id === id)?.name ?? '—';
  };

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    setSearched(true);
    try {
      let query = supabase
        .from('courier_log')
        .select('*')
        .gte('entry_date', fromDate)
        .lte('entry_date', toDate)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (typeFilter !== 'all') query = query.eq('type', typeFilter);

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setResults(data ?? []);
    } catch (err: any) {
      setError(err.message ?? String(err));
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    try {
      const rows = results.map((e) => ({
        'Date': e.entry_date,
        'Type': e.type,
        'AWB No': e.awb_no,
        'Agency': e.agency,
        'Sender Name': e.sender_name ?? '',
        'From Place': e.from_place ?? '',
        'To Place': e.to_place ?? '',
        'Receiver': e.type === 'Outward' ? getReceiverName(e.receiver_id) : '',
        'Weight (kg)': e.weight ?? '',
        'Description': e.description ?? '',
        'Status': e.status,
        'WC Name': e.wc_name,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Courier Report');
      XLSX.writeFile(wb, 'courier_report.xlsx');
    } catch (err: any) {
      alert('❌ Export failed: ' + (err.message ?? String(err)));
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>📦 Courier Report</h2>
      </div>

      {/* Filter bar */}
      <div style={{ ...styles.card, marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ ...styles.formLabel, display: 'block', marginBottom: '4px' }}>From Date</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ ...styles.formLabel, display: 'block', marginBottom: '4px' }}>To Date</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ ...styles.formLabel, display: 'block', marginBottom: '4px' }}>Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | 'Inward' | 'Outward')}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="all">All</option>
              <option value="Inward">📥 Inward</option>
              <option value="Outward">📤 Outward</option>
            </select>
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            style={{ ...styles.btn, ...styles.btnPrimary, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            onMouseEnter={(e) => !loading && Object.assign(e.currentTarget.style, styles.btnPrimaryHover)}
            onMouseLeave={(e) => !loading && Object.assign(e.currentTarget.style, styles.btnPrimary)}
          >
            {loading ? '⏳ Searching...' : '🔍 Search'}
          </button>
          {results.length > 0 && (
            <button
              onClick={handleExport}
              style={{ ...styles.btn, backgroundColor: '#059669', color: '#fff' }}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, { backgroundColor: '#047857' })}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, { backgroundColor: '#059669' })}
            >
              📊 Excel Export
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
          ❌ {error}
        </div>
      )}

      {loading && <div style={styles.loadingText}>Searching...</div>}

      {!loading && searched && !error && (
        results.length === 0 ? (
          <div style={styles.card}>
            <div style={styles.emptyMessage}>No courier entries found for the selected filters</div>
          </div>
        ) : (
          <div style={{ ...styles.card, overflowX: 'auto' }}>
            <div style={{ marginBottom: '10px', fontSize: '13px', color: colors.textMuted }}>
              {results.length} record{results.length !== 1 ? 's' : ''} found
            </div>
            <table style={styles.table}>
              <thead>
                <tr>
                  {['Date', 'Type', 'AWB No', 'Agency', 'Sender Name', 'From Place', 'To Place', 'Receiver', 'Weight', 'Description', 'Status', 'WC Name'].map(h => (
                    <th key={h} style={styles.tableHeader}>{h}</th>
                  ))}
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
                    <td style={{ ...styles.tableCell, fontSize: '12px', whiteSpace: 'nowrap' }}>{entry.entry_date}</td>
                    <td style={styles.tableCell}>
                      <span style={{ ...styles.badge, ...typeBadgeStyle(entry.type) }}>
                        {entry.type === 'Inward' ? '📥 Inward' : '📤 Outward'}
                      </span>
                    </td>
                    <td style={{ ...styles.tableCell, fontWeight: 600 }}>{entry.awb_no}</td>
                    <td style={styles.tableCell}>{entry.agency}</td>
                    <td style={styles.tableCell}>{entry.sender_name ?? '—'}</td>
                    <td style={styles.tableCell}>{entry.from_place ?? '—'}</td>
                    <td style={styles.tableCell}>{entry.to_place ?? '—'}</td>
                    <td style={styles.tableCell}>{entry.type === 'Outward' ? getReceiverName(entry.receiver_id) : '—'}</td>
                    <td style={styles.tableCell}>{entry.weight != null ? `${entry.weight} kg` : '—'}</td>
                    <td style={{ ...styles.tableCell, fontSize: '12px' }}>{entry.description ?? '—'}</td>
                    <td style={styles.tableCell}>
                      <span style={{ ...styles.badge, ...statusBadgeStyle(entry.status) }}>
                        {entry.status ? entry.status.charAt(0).toUpperCase() + entry.status.slice(1) : "—"}
                      </span>
                    </td>
                    <td style={{ ...styles.tableCell, fontSize: '12px' }}>{entry.wc_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}