'use client';

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { CourierEntry, CourierReceiver } from '@/types/courier';
import { colors, styles } from '@/styles/ticketsStyles';
import CourierList from './courier/CourierList';

const todayStr = () => new Date().toLocaleDateString('en-CA');

const inputStyle: React.CSSProperties = {
  border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '8px 12px', fontSize: '13px',
  color: colors.text, backgroundColor: colors.card, outline: 'none',
};

// Mirrors HTML's fmtExcelDate (index.html:18537) — YYYY-MM-DD -> DD-MM-YYYY.
function fmtExcelDate(d?: string | null): string {
  if (!d) return '';
  const p = d.split('-');
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : d;
}

export default function CourierReportScreen() {
  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate, setToDate] = useState(todayStr());
  const [dirFilter, setDirFilter] = useState<'' | 'Inward' | 'Outward'>('');
  const [search, setSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [results, setResults] = useState<CourierEntry[]>([]);
  const [receivers, setReceivers] = useState<CourierReceiver[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    supabase.from('receiver_master').select('*').order('name', { ascending: true }).then(({ data }) => setReceivers(data ?? []));
  }, []);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      let query = supabase.from('courier_log').select('*').order('entry_date', { ascending: false }).order('created_at', { ascending: false });
      if (fromDate) query = query.gte('entry_date', fromDate);
      if (toDate) query = query.lte('entry_date', toDate);
      if (dirFilter) query = query.eq('direction', dirFilter);

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      let filtered = data ?? [];

      const s = search.trim().toLowerCase();
      if (s) {
        filtered = filtered.filter((e: CourierEntry) =>
          (e.awb_no || '').toLowerCase().includes(s) ||
          (e.place || '').toLowerCase().includes(s) ||
          (e.person_name || '').toLowerCase().includes(s) ||
          (e.agency || '').toLowerCase().includes(s)
        );
      }

      const ps = productSearch.trim().toLowerCase();
      if (ps) {
        filtered = filtered.filter((e: CourierEntry) =>
          (e.products || []).some(p =>
            (p.serial || '').toLowerCase().includes(ps) ||
            (p.call_id || '').toLowerCase().includes(ps) ||
            (p.model || '').toLowerCase().includes(ps)
          )
        );
      }

      setResults(filtered);
    } catch (err: any) {
      setError(err.message ?? String(err));
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Mirrors HTML's downloadCourierExcel (index.html:18524-18583) — "All
  // Entries" + separate "Inward"/"Outward" sheets, DD-MM-YYYY dates.
  const handleExport = () => {
    try {
      const safeStr = (v: any) => (v === null || v === undefined ? '' : String(v));
      const safeAcc = (acc?: string[]) => (acc && acc.length ? acc.join(', ') : '');

      const buildRows = (list: CourierEntry[]) =>
        list.flatMap((e) => {
          const products = e.products || [];
          if (!products.length) {
            return [[
              fmtExcelDate(e.entry_date), safeStr(e.direction), safeStr(e.awb_no), safeStr(e.agency),
              safeStr(e.person_name), safeStr(e.sender_mobile), safeStr(e.place), safeStr(e.weight),
              '', '', '', '', '', '', '', '', safeStr(e.wc_name),
            ]];
          }
          return products.map((p) => [
            fmtExcelDate(e.entry_date), safeStr(e.direction), safeStr(e.awb_no), safeStr(e.agency),
            safeStr(e.person_name), safeStr(e.sender_mobile), safeStr(e.place), safeStr(e.weight),
            safeStr(p.call_id), safeStr(p.model), safeStr(p.serial), safeStr(p.warranty), safeStr(p.faulty_part),
            safeStr(p.invoice_avail), safeStr(p.invoice_amount), safeAcc(p.accessories), safeStr(e.wc_name),
          ]);
        });

      const headers = ['Date', 'Direction', 'AWB No', 'Agency', 'Person', 'Mobile', 'Place', 'Weight(kg)', 'Call ID', 'Model', 'Serial No', 'Warranty', 'Faulty Part', 'Invoice', 'Invoice Amt', 'Accessories', 'WC'];
      const makeSheet = (rows: any[][]) => {
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        ws['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 8 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 35 }, { wch: 18 }];
        return ws;
      };

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, makeSheet(buildRows(results)), 'All Entries');
      const inRows = buildRows(results.filter((e) => e.direction === 'Inward'));
      if (inRows.length) XLSX.utils.book_append_sheet(wb, makeSheet(inRows), 'Inward');
      const outRows = buildRows(results.filter((e) => e.direction === 'Outward'));
      if (outRows.length) XLSX.utils.book_append_sheet(wb, makeSheet(outRows), 'Outward');

      XLSX.writeFile(wb, 'courier_register_' + todayStr() + '.xlsx');
    } catch (err: any) {
      alert('❌ Export failed: ' + (err.message ?? String(err)));
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>📦 Courier Report</h2>
      </div>

      <div style={{ ...styles.card, marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ ...styles.formLabel, display: 'block', marginBottom: '4px' }}>Date From</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ ...styles.formLabel, display: 'block', marginBottom: '4px' }}>Date To</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ ...styles.formLabel, display: 'block', marginBottom: '4px' }}>Direction</label>
            <select value={dirFilter} onChange={(e) => setDirFilter(e.target.value as any)} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">Both</option>
              <option value="Inward">📥 Inward</option>
              <option value="Outward">📤 Outward</option>
            </select>
          </div>
          <div>
            <label style={{ ...styles.formLabel, display: 'block', marginBottom: '4px' }}>AWB / Place / Person</label>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="AWB, place, sender name..." style={inputStyle} />
          </div>
          <div>
            <label style={{ ...styles.formLabel, display: 'block', marginBottom: '4px' }}>Serial No / Call ID</label>
            <input type="text" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Serial no or Call ID..." style={inputStyle} />
          </div>
          <button onClick={handleSearch} disabled={loading} style={{ ...styles.btn, ...styles.btnPrimary, opacity: loading ? 0.7 : 1 }}>
            {loading ? '⏳ Searching...' : '🔍 Search'}
          </button>
          {results.length > 0 && (
            <button onClick={handleExport} style={{ ...styles.btn, backgroundColor: '#059669', color: '#fff' }}>📊 Excel Download</button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>❌ {error}</div>
      )}

      {loading && <div style={styles.loadingText}>Searching...</div>}

      {!loading && searched && !error && (
        results.length === 0 ? (
          <div style={styles.card}><div style={styles.emptyMessage}>No entries found.</div></div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
              <div style={{ ...styles.card, textAlign: 'center' as const }}>
                <div style={{ fontSize: 12, color: colors.textMuted }}>Total</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{results.length}</div>
              </div>
              <div style={{ ...styles.card, textAlign: 'center' as const, borderColor: '#1d4ed8' }}>
                <div style={{ fontSize: 12, color: colors.textMuted }}>📥 Inward</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1d4ed8' }}>{results.filter(e => e.direction === 'Inward').length}</div>
              </div>
              <div style={{ ...styles.card, textAlign: 'center' as const, borderColor: '#0e9f6e' }}>
                <div style={{ fontSize: 12, color: colors.textMuted }}>📤 Outward</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#0e9f6e' }}>{results.filter(e => e.direction === 'Outward').length}</div>
              </div>
            </div>

            <div style={{ marginBottom: '10px', fontSize: '13px', color: colors.textMuted }}>
              {results.length} record{results.length !== 1 ? 's' : ''} found
            </div>

            {/* Reuses the same rich card list (with Edit / DC-print actions
                and per-product sub-table) as the main Courier screen —
                mirrors HTML reusing renderCourierList (index.html:18519). */}
            <CourierList entries={results} receivers={receivers} onRefresh={handleSearch} />
          </>
        )
      )}
    </div>
  );
}