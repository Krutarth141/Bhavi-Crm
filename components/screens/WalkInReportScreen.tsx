'use client';

import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabase';
import { WalkInEntry } from '@/types/walkin';
import { useWalkIn } from '@/hooks/useWalkIn';
import { updateWalkIn, deleteWalkIn } from '@/services/walkInService';
import { colors, styles } from '@/styles/ticketsStyles';
import CreateJobModal from './walkin/CreateJobModal';

function getToday(): string {
  return new Date().toLocaleDateString('en-CA');
}

const PRODUCT_TYPE_COLORS: Record<string, string> = {
  Inward: '#1d4ed8', Outward: '#0e9f6e', Other: '#7c3aed', Purchase: '#d97706', 'For Checking Only': '#0369a1',
};

const hasServiceProduct = (entry: WalkInEntry) =>
  (entry.products || []).some((p) => p.type === 'Inward' || p.type === 'For Checking Only');

// Mirrors HTML's downloadWalkInExcel (index.html:17722-17771) — DD-MM-YYYY dates.
function fmtExcelDate(d?: string | null): string {
  if (!d) return '';
  const parts = d.split('-');
  return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : d;
}

export default function WalkInReportScreen() {
  const { data: session } = useSession();
  const currentUserRole = (session?.user as any)?.roleType ?? '';
  const currentUserId = (session?.user as any)?.email ?? '';

  const { fetchByDateRange } = useWalkIn(currentUserRole, currentUserId);

  const [fromDate, setFromDate] = useState(getToday());
  const [toDate, setToDate] = useState(getToday());
  const [search, setSearch] = useState('');
  const [wcFilter, setWcFilter] = useState('');
  const [wcs, setWcs] = useState<{ user_id: string; name: string }[]>([]);
  const [results, setResults] = useState<WalkInEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // WC filter dropdown — mirrors HTML's renderWalkInReport() WC fetch.
  useEffect(() => {
    supabase.from('users').select('user_id, name')
      .or('role_type.eq.work_controller,role.eq.work_controller').eq('is_active', true).order('name')
      .then(({ data }) => setWcs(data || []));
  }, []);

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

  const filteredResults = useMemo(() => (wcFilter ? results.filter((r) => r.wc_id === wcFilter) : results), [results, wcFilter]);

  // Mirrors HTML's mkCard KPI breakdown (index.html:17550-17559) — only an
  // exact type==='Inward' counts as Inward; everything that isn't Inward or
  // Outward (Other, Purchase, *and* For Checking Only) counts as Other.
  const kpis = useMemo(() => {
    const k = { inwardCusts: 0, inwardProds: 0, outwardCusts: 0, outwardProds: 0, otherCusts: 0, otherProds: 0 };
    filteredResults.forEach((entry) => {
      const products = entry.products || [];
      const hasIn = products.some((p) => (p.type || 'Inward') === 'Inward');
      const hasOut = products.some((p) => p.type === 'Outward');
      const hasOther = products.some((p) => p.type !== 'Inward' && p.type !== 'Outward');
      if (hasIn) k.inwardCusts++;
      if (hasOut) k.outwardCusts++;
      if (hasOther) k.otherCusts++;
      products.forEach((p) => {
        const t = p.type || 'Inward';
        if (t === 'Inward') k.inwardProds++;
        else if (t === 'Outward') k.outwardProds++;
        else k.otherProds++;
      });
    });
    return k;
  }, [filteredResults]);

  const byDate = useMemo(() => {
    const map: Record<string, WalkInEntry[]> = {};
    filteredResults.forEach((e) => { (map[e.visit_date] ||= []).push(e); });
    return Object.entries(map);
  }, [filteredResults]);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [jobEntry, setJobEntry] = useState<WalkInEntry | null>(null);
  const [editCust, setEditCust] = useState<WalkInEntry | null>(null);
  const [custForm, setCustForm] = useState({ name: '', mobile: '', address: '', city: '', state: '', pin: '' });
  const [custSaving, setCustSaving] = useState(false);

  const handleDeparture = async (entry: WalkInEntry) => {
    setBusyId(entry.id);
    const r = await updateWalkIn(entry.id, { departure_time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) });
    setBusyId(null);
    if (!r.success) { alert('❌ ' + r.error); return; }
    await handleSearch();
  };
  const handleDelete = async (entry: WalkInEntry) => {
    if (!confirm(`Delete walk-in entry for ${entry.customer_name}?`)) return;
    setBusyId(entry.id);
    const r = await deleteWalkIn(entry.id);
    setBusyId(null);
    if (!r.success) { alert('❌ ' + r.error); return; }
    await handleSearch();
  };

  // Click-to-edit customer name — mirrors HTML's viewWalkInCustomer /
  // saveWalkInCustomer (index.html:17648-17707).
  const openCustEdit = (entry: WalkInEntry) => {
    setEditCust(entry);
    setCustForm({
      name: entry.customer_name || '', mobile: entry.mobile || '', address: entry.address || '',
      city: entry.city || '', state: entry.state || '', pin: entry.pin || '',
    });
  };
  const saveCustEdit = async () => {
    if (!editCust) return;
    if (!custForm.name.trim()) { alert('Customer name required'); return; }
    setCustSaving(true);
    const r = await updateWalkIn(editCust.id, {
      customer_name: custForm.name.trim(), mobile: custForm.mobile.trim(), address: custForm.address.trim(),
      city: custForm.city.trim(), state: custForm.state.trim(), pin: custForm.pin.trim(),
    });
    setCustSaving(false);
    if (!r.success) { alert('Error saving: ' + r.error); return; }
    setEditCust(null);
    await handleSearch();
  };

  // Mirrors HTML's downloadWalkInExcel (index.html:17722-17771) — an "All
  // Walk-ins" sheet plus one sheet per WC, one row per product.
  const handleExportExcel = () => {
    if (filteredResults.length === 0) {
      alert('No data to export');
      return;
    }

    const buildRows = (entries: WalkInEntry[]) => {
      const rows: any[] = [];
      entries.forEach((l) => {
        const products = l.products || [];
        if (!products.length) {
          rows.push({
            Date: fmtExcelDate(l.visit_date), Customer: l.customer_name, Mobile: l.mobile,
            Arrival: l.arrival_time, Departure: l.departure_time || '', Brand: '', Model: '',
            Type: '', 'Warranty/Sub-type': '', Remarks: '', WC: l.wc_name || '',
          });
        } else {
          products.forEach((p) => {
            const secVal = p.type === 'Purchase' ? (p.subtype || '') : p.type === 'For Checking Only' ? (p.subtype || p.warranty || '') : (p.warranty || '');
            rows.push({
              Date: fmtExcelDate(l.visit_date), Customer: l.customer_name, Mobile: l.mobile,
              Arrival: l.arrival_time, Departure: l.departure_time || '', Brand: p.brand || '',
              Model: p.model || '', Type: p.type || '', 'Warranty/Sub-type': secVal, Remarks: p.remarks || '', WC: l.wc_name || '',
            });
          });
        }
      });
      return rows;
    };

    const cols = [{ wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 16 }, { wch: 30 }, { wch: 18 }];

    const wb = XLSX.utils.book_new();

    const wsAll = XLSX.utils.json_to_sheet(buildRows(filteredResults));
    wsAll['!cols'] = cols;
    XLSX.utils.book_append_sheet(wb, wsAll, 'All Walk-ins');

    const byWC: Record<string, WalkInEntry[]> = {};
    filteredResults.forEach((l) => {
      const k = l.wc_name || l.wc_id || 'Unknown';
      (byWC[k] ||= []).push(l);
    });
    Object.entries(byWC).forEach(([wcName, wcLogs]) => {
      const ws = XLSX.utils.json_to_sheet(buildRows(wcLogs));
      ws['!cols'] = cols;
      const sheetName = wcName.replace(/[:\\/?*[\]]/g, '').slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    XLSX.writeFile(wb, `walkin_log_${getToday()}.xlsx`);
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

        <div style={styles.formGroup}>
          <label style={styles.formLabel}>WC</label>
          <select value={wcFilter} onChange={(e) => setWcFilter(e.target.value)} style={{ ...styles.filterInput, minWidth: '150px', flex: 'unset' }}>
            <option value="">All WC</option>
            {wcs.map((w) => <option key={w.user_id} value={w.user_id}>{w.name}</option>)}
          </select>
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
          disabled={filteredResults.length === 0}
          onMouseEnter={(e) => filteredResults.length > 0 && Object.assign(e.currentTarget.style, { background: '#15803d', color: '#fff' })}
          onMouseLeave={(e) => filteredResults.length > 0 && Object.assign(e.currentTarget.style, { background: '#16a34a', color: '#fff' })}
        >
          📥 Export Excel
        </button>
      </div>

      {/* Results */}
      {loading ? (
        <div style={styles.loadingText}>Searching...</div>
      ) : searched && filteredResults.length === 0 ? (
        <div style={styles.emptyMessage}>No walk-in entries found for the selected criteria</div>
      ) : filteredResults.length > 0 ? (
        <>
          {/* KPI cards — mirrors HTML's mkCard breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 8 }}>
            {[
              { label: 'Inward Customers', val: kpis.inwardCusts, color: '#1d4ed8' },
              { label: 'Inward Products', val: kpis.inwardProds, color: '#1d4ed8' },
              { label: 'Outward Customers', val: kpis.outwardCusts, color: '#059669' },
              { label: 'Outward Products', val: kpis.outwardProds, color: '#047857' },
            ].map((c) => (
              <div key={c.label} style={{ ...styles.card, textAlign: 'center' as const, padding: '14px 10px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: c.color, textTransform: 'uppercase' }}>{c.label}</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: c.color }}>{c.val}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Other Customers', val: kpis.otherCusts, color: '#92400e' },
              { label: 'Other Products', val: kpis.otherProds, color: '#78350f' },
              { label: 'Total Customers', val: kpis.inwardCusts + kpis.outwardCusts + kpis.otherCusts, color: '#7c3aed' },
              { label: 'Total Products', val: kpis.inwardProds + kpis.outwardProds + kpis.otherProds, color: '#9333ea' },
            ].map((c) => (
              <div key={c.label} style={{ ...styles.card, textAlign: 'center' as const, padding: '14px 10px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: c.color, textTransform: 'uppercase' }}>{c.label}</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: c.color }}>{c.val}</div>
              </div>
            ))}
          </div>

          {byDate.map(([date, dayEntries]) => (
            <div key={date} style={{ ...styles.card, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: colors.primary, marginBottom: 12, padding: '4px 10px', background: '#eff6ff', borderRadius: 6, display: 'inline-block' }}>
                📅 {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} — {dayEntries.length} customers
              </div>
              {dayEntries.map((entry) => (
                <div key={entry.id} style={{ background: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 8, borderLeft: `3px solid ${colors.primary}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        <span style={{ background: '#1d4ed8', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 5, marginRight: 6 }}>#{entry.token_no}</span>
                        <span onClick={() => openCustEdit(entry)} style={{ cursor: 'pointer', color: colors.primary, textDecoration: 'underline' }}>{entry.customer_name}</span>{' '}
                        <span style={{ color: colors.textMuted, fontSize: 12, fontWeight: 400 }}>{entry.mobile}</span>
                      </div>
                      <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                        🕐 In: <b>{entry.arrival_time}</b>{entry.departure_time ? <> {' | '}Out: <b>{entry.departure_time}</b></> : <> {' | '}<span style={{ color: '#f59e0b' }}>Still in office</span></>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      {hasServiceProduct(entry) && !entry.job_id && (
                        <button onClick={() => setJobEntry(entry)} style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                          🔧 Create Job
                        </button>
                      )}
                      {entry.job_id && (
                        <span style={{ background: '#d1fae5', color: '#065f46', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>✅ {entry.job_id}</span>
                      )}
                      {!entry.departure_time ? (
                        <button onClick={() => handleDeparture(entry)} disabled={busyId === entry.id} style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600, opacity: busyId === entry.id ? 0.6 : 1 }}>
                          ⏰ Departure
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: '#065f46', background: '#d1fae5', padding: '2px 8px', borderRadius: 99 }}>Out: {entry.departure_time}</span>
                      )}
                      {currentUserRole !== 'engineer' && (
                        <button onClick={() => handleDelete(entry)} disabled={busyId === entry.id} style={{ background: 'none', border: '1.5px solid #fca5a5', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: '#dc2626', cursor: 'pointer', opacity: busyId === entry.id ? 0.6 : 1 }} title="Delete this entry">
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {(entry.products || []).map((p, idx) => {
                      const tc = PRODUCT_TYPE_COLORS[p.type] || '#7c3aed';
                      return (
                        <span key={idx} style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 6, padding: '3px 8px', fontSize: 11 }}>
                          {p.brand && <b>{p.brand} </b>}{p.model} <span style={{ color: tc }}>[{p.type}]</span>
                          {p.warranty && <span style={{ color: p.warranty === 'In Warranty' ? '#065f46' : '#991b1b' }}> ({p.warranty})</span>}
                          {p.remarks && <> — {p.remarks}</>}
                        </span>
                      );
                    })}
                  </div>
                  {entry.wc_name && <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 4 }}>By: {entry.wc_name}</div>}
                </div>
              ))}
            </div>
          ))}
        </>
      ) : null}

      {jobEntry && (
        <CreateJobModal entry={jobEntry} onClose={() => setJobEntry(null)} onCreated={handleSearch} />
      )}

      {editCust && (
        <div style={styles.modalOverlay} onClick={() => setEditCust(null)}>
          <div style={{ ...styles.modal, maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>👤 Customer Details</h2>
              <button style={styles.closeBtn} onClick={() => setEditCust(null)}>✕</button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={styles.formLabel}>CUSTOMER NAME</label>
                <input value={custForm.name} onChange={(e) => setCustForm((p) => ({ ...p, name: e.target.value }))} style={styles.formInput} />
              </div>
              <div>
                <label style={styles.formLabel}>MOBILE NO</label>
                <input value={custForm.mobile} onChange={(e) => setCustForm((p) => ({ ...p, mobile: e.target.value }))} style={styles.formInput} />
              </div>
              <div>
                <label style={styles.formLabel}>ADDRESS</label>
                <input value={custForm.address} onChange={(e) => setCustForm((p) => ({ ...p, address: e.target.value }))} style={styles.formInput} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={styles.formLabel}>CITY</label>
                  <input value={custForm.city} onChange={(e) => setCustForm((p) => ({ ...p, city: e.target.value }))} style={styles.formInput} />
                </div>
                <div>
                  <label style={styles.formLabel}>STATE</label>
                  <input value={custForm.state} onChange={(e) => setCustForm((p) => ({ ...p, state: e.target.value }))} style={styles.formInput} />
                </div>
                <div>
                  <label style={styles.formLabel}>PIN CODE</label>
                  <input value={custForm.pin} onChange={(e) => setCustForm((p) => ({ ...p, pin: e.target.value }))} style={styles.formInput} />
                </div>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={() => setEditCust(null)}>Cancel</button>
              <button style={{ ...styles.btn, ...styles.btnPrimary, opacity: custSaving ? 0.7 : 1 }} onClick={saveCustEdit} disabled={custSaving}>
                {custSaving ? 'Saving...' : '💾 Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}