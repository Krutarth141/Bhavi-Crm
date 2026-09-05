'use client';

import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import * as XLSX from 'xlsx';
import { useCourier } from '@/hooks/useCourier';
import { insertCourierEntry, insertReceiver, updateReceiver, deleteReceiver } from '@/services/courierService';
import { CourierReceiver } from '@/types/courier';
import CourierInwardForm from '@/components/screens/courier/CourierInwardForm';
import CourierOutwardForm from '@/components/screens/courier/CourierOutwardForm';
import CourierList from '@/components/screens/courier/CourierList';
import ReceiversTab from '@/components/screens/courier/ReceiversTab';
import { colors, styles } from '@/styles/ticketsStyles';

type ActiveTab = 'inward' | 'outward' | 'receivers';
type RangeFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

export default function CourierScreen() {
  const { data: session } = useSession();
  const { entries, receivers, loading, refetch, refetchReceivers } = useCourier();

  const [activeTab, setActiveTab] = useState<ActiveTab>('inward');
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wcId = (session?.user as any)?.email ?? '';
  const wcName = (session?.user as any)?.name ?? '';
  const todayStr = new Date().toLocaleDateString('en-CA');

  // Quick date/direction filters + Excel export — mirrors HTML's
  // filterCourierList()/downloadWCCourierExcel() (index.html:17913-17930,
  // 18585-18598) on the main Courier Register "All Entries" card.
  const roleType = (session?.user as any)?.roleType;
  const dbRole = (session?.user as any)?.role;
  // Defensive dual-check like HTML's own isWCUser (index.html:17792) —
  // role_type/role for WC accounts can vary by how the row was seeded.
  const isWC = roleType === 'work_controller' || dbRole === 'work_controller';
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>('today');
  const [dirFilter, setDirFilter] = useState<'all' | 'Inward' | 'Outward'>('all');
  const [customDate, setCustomDate] = useState('');

  const filteredEntries = useMemo(() => {
    let list = entries;
    if (dirFilter !== 'all') list = list.filter((e) => e.direction === dirFilter);
    if (rangeFilter === 'today') list = list.filter((e) => e.entry_date === todayStr);
    else if (rangeFilter === 'week') {
      const d = new Date(); d.setDate(d.getDate() - 7);
      const cutoff = d.toLocaleDateString('en-CA');
      list = list.filter((e) => e.entry_date >= cutoff);
    } else if (rangeFilter === 'month') {
      const cutoff = todayStr.slice(0, 7) + '-01';
      list = list.filter((e) => e.entry_date >= cutoff);
    } else if (rangeFilter === 'custom' && customDate) {
      list = list.filter((e) => e.entry_date === customDate);
    }
    return list;
  }, [entries, dirFilter, rangeFilter, customDate, todayStr]);

  // Mirrors HTML's downloadWCCourierExcel/downloadCourierExcel (index.html:
  // 18524-18598) — always includes Mobile/Warranty/Faulty Part/Invoice/
  // Invoice Amt/Accessories columns, split across "All Entries"/"Inward"/
  // "Outward" sheets. Scoped like the HTML version: WC users get only their
  // own entries, admins get everything currently loaded.
  const handleExportExcel = () => {
    const scoped = isWC ? entries.filter((e) => e.wc_id === wcId) : entries;
    if (!scoped.length) { alert('No data found'); return; }

    const fmtExcelDate = (d?: string | null) => {
      if (!d) return '';
      const p = d.split('-');
      return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : d;
    };
    const safeStr = (v: any) => (v === null || v === undefined ? '' : String(v));
    const safeAcc = (acc?: string[]) => (acc && acc.length ? acc.join(', ') : '');

    const buildRows = (list: typeof entries) =>
      list.flatMap((entry) => {
        const products = entry.products || [];
        if (!products.length) {
          return [[
            fmtExcelDate(entry.entry_date), safeStr(entry.direction), safeStr(entry.awb_no), safeStr(entry.agency),
            safeStr(entry.person_name), safeStr(entry.sender_mobile), safeStr(entry.place), safeStr(entry.weight),
            '', '', '', '', '', '', '', '', safeStr(entry.wc_name),
          ]];
        }
        return products.map((p) => [
          fmtExcelDate(entry.entry_date), safeStr(entry.direction), safeStr(entry.awb_no), safeStr(entry.agency),
          safeStr(entry.person_name), safeStr(entry.sender_mobile), safeStr(entry.place), safeStr(entry.weight),
          safeStr(p.call_id), safeStr(p.model), safeStr(p.serial), safeStr(p.warranty), safeStr(p.faulty_part),
          safeStr(p.invoice_avail), safeStr(p.invoice_amount), safeAcc(p.accessories), safeStr(entry.wc_name),
        ]);
      });

    const headers = ['Date', 'Direction', 'AWB No', 'Agency', 'Person', 'Mobile', 'Place', 'Weight(kg)', 'Call ID', 'Model', 'Serial No', 'Warranty', 'Faulty Part', 'Invoice', 'Invoice Amt', 'Accessories', 'WC'];
    const makeSheet = (rows: any[][]) => {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 8 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 35 }, { wch: 18 }];
      return ws;
    };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, makeSheet(buildRows(scoped)), 'All Entries');
    const inRows = buildRows(scoped.filter((e) => e.direction === 'Inward'));
    if (inRows.length) XLSX.utils.book_append_sheet(wb, makeSheet(inRows), 'Inward');
    const outRows = buildRows(scoped.filter((e) => e.direction === 'Outward'));
    if (outRows.length) XLSX.utils.book_append_sheet(wb, makeSheet(outRows), 'Outward');

    XLSX.writeFile(wb, `courier_register_${todayStr}.xlsx`);
  };

  const handleInwardSave = async (data: any) => {
    setSaveLoading(true);
    setError(null);
    try {
      const { entry_date, ...rest } = data;
      const result = await insertCourierEntry({ direction: 'Inward', entry_date: entry_date || todayStr, wc_id: wcId, wc_name: wcName, ...rest });
      if (!result.success) throw new Error(result.error);
      await refetch();
    } catch (err: any) {
      setError(err.message ?? String(err));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleOutwardSave = async (data: any) => {
    setSaveLoading(true);
    setError(null);
    try {
      const { entry_date, ...rest } = data;
      const result = await insertCourierEntry({ direction: 'Outward', entry_date: entry_date || todayStr, wc_id: wcId, wc_name: wcName, ...rest });
      if (!result.success) throw new Error(result.error);
      await refetch();
    } catch (err: any) {
      setError(err.message ?? String(err));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleAddReceiver = async (data: { name: string; address: string; city: string; state: string; pin: string; phone: string }) => {
    const result = await insertReceiver(data);
    if (!result.success) { alert('❌ Failed to add receiver: ' + result.error); return; }
    await refetchReceivers();
  };

  const handleEditReceiver = async (id: string, data: Partial<CourierReceiver>) => {
    const result = await updateReceiver(id, data);
    if (!result.success) { alert('❌ Failed to update receiver: ' + result.error); return; }
    await refetchReceivers();
  };

  const handleDeleteReceiver = async (id: string) => {
    const result = await deleteReceiver(id);
    if (!result.success) { alert('❌ Failed to delete receiver: ' + result.error); return; }
    await refetchReceivers();
  };

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: 'inward', label: '📥 Inward' },
    { key: 'outward', label: '📤 Outward' },
    { key: 'receivers', label: '📋 Receivers' },
  ];

  const rangeBtns: { id: RangeFilter; label: string }[] = [
    { id: 'all', label: '📋 All (30d)' },
    { id: 'today', label: '📅 Today' },
    { id: 'week', label: '📆 Last 7 Days' },
    { id: 'month', label: '🗓️ This Month' },
  ];

  const courierFilterBar = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
      {rangeBtns.map((r) => (
        <button key={r.id} onClick={() => { setRangeFilter(r.id); setCustomDate(''); }}
          style={{ ...styles.btn, ...styles.btnSm, ...(rangeFilter === r.id ? styles.btnPrimary : styles.btnOutline) }}>
          {r.label}
        </button>
      ))}
      <button onClick={() => setDirFilter(dirFilter === 'Inward' ? 'all' : 'Inward')}
        style={{ ...styles.btn, ...styles.btnSm, ...(dirFilter === 'Inward' ? styles.btnPrimary : styles.btnOutline) }}>
        📥 Inward
      </button>
      <button onClick={() => setDirFilter(dirFilter === 'Outward' ? 'all' : 'Outward')}
        style={{ ...styles.btn, ...styles.btnSm, ...(dirFilter === 'Outward' ? styles.btnPrimary : styles.btnOutline) }}>
        📤 Outward
      </button>
      <input type="date" value={customDate} onChange={(e) => { setCustomDate(e.target.value); setRangeFilter('custom'); }}
        style={{ border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '6px 10px', fontSize: '13px' }} />
      <span style={{ fontSize: '12px', color: colors.textMuted }}>{filteredEntries.length} entries</span>
      <button onClick={handleExportExcel} style={{ ...styles.btn, ...styles.btnSm, backgroundColor: '#059669', color: '#fff' }}>📊 Excel</button>
    </div>
  );

  return (
    <div style={{ padding: '20px' }}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>📦 Courier Register</h2>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>❌ {error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: 700 }}>✕</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: `2px solid ${colors.border}`, paddingBottom: '0' }}>
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              ...styles.btn, borderRadius: '8px 8px 0 0', borderBottom: 'none', paddingBottom: '10px',
              backgroundColor: activeTab === tab.key ? colors.primary : 'transparent',
              color: activeTab === tab.key ? '#fff' : colors.textMuted,
              fontWeight: activeTab === tab.key ? 700 : 500
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <div style={styles.loadingText}>Loading courier data...</div>}

      {!loading && (
        <>
          {activeTab === 'inward' && <CourierInwardForm onSave={handleInwardSave} loading={saveLoading} />}
          {activeTab === 'outward' && <CourierOutwardForm receivers={receivers} onSave={handleOutwardSave} loading={saveLoading} />}
          {activeTab === 'receivers' && (
            <ReceiversTab receivers={receivers} onAdd={handleAddReceiver} onEdit={handleEditReceiver} onDelete={handleDeleteReceiver} onRefresh={refetchReceivers} />
          )}

          {/* "All Entries" persists across every tab, including Receivers
              (index.html:17800-17930/17906-17930). */}
          <div style={styles.sectionHeader}>
            <h3 style={{ ...styles.sectionTitle, fontSize: '15px' }}>📋 All Entries</h3>
          </div>
          {courierFilterBar}
          <CourierList entries={filteredEntries} receivers={receivers} onRefresh={refetch} />
        </>
      )}
    </div>
  );
}