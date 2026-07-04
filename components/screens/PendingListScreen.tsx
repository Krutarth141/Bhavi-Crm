'use client';
import { useState, useMemo } from 'react';
import { usePendingList } from '@/hooks/usePendingList';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { statusOptions } from '@/types/tickets';
import { colors, styles } from '@/styles/ticketsStyles';

// Status badge color map
const statusBadgeStyle = (status: string): React.CSSProperties => {
  const s = status.toLowerCase();
  if (s === 'open' || s === 'assigned' || s === 'pending allocation') {
    return { background: '#dbeafe', color: '#1d4ed8' };
  }
  if (s === 'in progress' || s.includes('customer approv') || s.includes('pending parts') || s.includes('pending repair')) {
    return { background: '#fef3c7', color: '#d97706' };
  }
  if (s === 'closed' || s === 'delivered' || s === 'repaired') {
    return { background: '#d1fae5', color: '#065f46' };
  }
  // pending / cancelled / rejected / call cancel / customer reject
  return { background: '#ffe4e6', color: '#be123c' };
};

// Check if TAT date is overdue
const isOverdue = (tatDate?: string): boolean => {
  if (!tatDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tat = new Date(tatDate);
  tat.setHours(0, 0, 0, 0);
  return tat < today;
};

export default function PendingListScreen() {
  const { tickets, engineers, loading, error, refetch } = usePendingList();

  const [wcTypeFilter, setWcTypeFilter] = useState<string>('');
  const [serviceFilter, setServiceFilter] = useState<string>('');
  const [brandFilter, setBrandFilter] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');

  // Apply all filters
  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (wcTypeFilter && t.wc_type !== wcTypeFilter) return false;
      if (serviceFilter && t.service_type !== serviceFilter) return false;
      if (brandFilter && !t.brand_name?.toLowerCase().includes(brandFilter.toLowerCase())) return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        const matches =
          t.id.toLowerCase().includes(q) ||
          t.cname.toLowerCase().includes(q) ||
          t.mobile.includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [tickets, wcTypeFilter, serviceFilter, brandFilter, searchText]);

  // Split into "Ready for Pickup" (Repaired) and actionable (all others)
  const readyForPickup = useMemo(
    () => filtered.filter((t) => t.status === 'Repaired'),
    [filtered]
  );

  const actionable = useMemo(
    () => filtered.filter((t) => t.status !== 'Repaired'),
    [filtered]
  );

  // Inline engineer change
  const handleEngineerChange = async (
    ticketId: string,
    engineerId: string,
    engineerName: string
  ) => {
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ assigned_to: engineerId, assigned_name: engineerName })
      .eq('id', ticketId);
    if (!updateError) refetch();
  };

  // Inline status change
  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ status: newStatus })
      .eq('id', ticketId);
    if (!updateError) refetch();
  };

  // Excel export
  const handleExport = () => {
    const rows = [...readyForPickup, ...actionable].map((t) => ({
      'Ticket ID': t.id,
      'Date': new Date(t.created_at).toLocaleDateString(),
      'Customer': t.cname,
      'Mobile': t.mobile,
      'Brand/Model': `${t.brand_name} ${t.model}`,
      'Serial': t.serial,
      'Area': t.area || '',
      'PIN': t.pin || '',
      'Status': t.status,
      'Engineer': t.assigned_name || '',
      'Service Type': t.service_type,
      'Call Type': t.call_type,
      'TAT Date': t.tat_date || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pending');
    XLSX.writeFile(wb, 'pending_list.xlsx');
  };

  if (loading) {
    return (
      <div style={styles.loadingText}>Loading pending tickets...</div>
    );
  }

  if (error) {
    return (
      <div style={{ ...styles.loadingText, color: colors.danger }}>
        ❌ {error}
      </div>
    );
  }

  const totalCount = actionable.length + readyForPickup.length;

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={styles.sectionHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={styles.sectionTitle}>📋 Pending List</h2>
          <span
            style={{
              ...styles.badge,
              background: '#dbeafe',
              color: '#1d4ed8',
              fontSize: '13px',
              padding: '4px 12px',
            }}
          >
            {totalCount}
          </span>
        </div>
        <button
          style={{ ...styles.btn, ...styles.btnPrimary }}
          onMouseEnter={(e) =>
            Object.assign(e.currentTarget.style, styles.btnPrimaryHover)
          }
          onMouseLeave={(e) =>
            Object.assign(e.currentTarget.style, styles.btnPrimary)
          }
          onClick={handleExport}
        >
          📥 Export Excel
        </button>
      </div>

      {/* Filter bar */}
      <div style={styles.filterBar}>
        <select
          value={wcTypeFilter}
          onChange={(e) => setWcTypeFilter(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All WC Types</option>
          <option value="CSP">CSP</option>
          <option value="ICP">ICP</option>
        </select>

        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Services</option>
          <option value="On Site">On Site</option>
          <option value="Carry In">Carry In</option>
        </select>

        <input
          type="text"
          placeholder="Brand search..."
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
          style={{ ...styles.filterInput, minWidth: '140px', flex: 'none' }}
        />

        <input
          type="text"
          placeholder="Ticket ID, customer, mobile..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ ...styles.filterInput, flex: 1 }}
        />
      </div>

      {/* Ready for Pickup section */}
      {readyForPickup.length > 0 && (
        <div
          style={{
            ...styles.card,
            border: '2px solid #16a34a',
            marginBottom: '20px',
          }}
        >
          <h3
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#16a34a',
              marginBottom: '12px',
            }}
          >
            ✅ Ready for Pickup ({readyForPickup.length})
          </h3>
          <TicketTable
            tickets={readyForPickup}
            engineers={engineers}
            onEngineerChange={handleEngineerChange}
            onStatusChange={handleStatusChange}
          />
        </div>
      )}

      {/* Main actionable table */}
      {actionable.length === 0 ? (
        <div style={styles.emptyMessage}>
          {tickets.length === 0 ? 'No pending tickets.' : 'No tickets match the current filters.'}
        </div>
      ) : (
        <div style={styles.card}>
          <TicketTable
            tickets={actionable}
            engineers={engineers}
            onEngineerChange={handleEngineerChange}
            onStatusChange={handleStatusChange}
          />
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Sub-component: reusable ticket table
// ──────────────────────────────────────────────────────────────
interface TicketRow {
  id: string;
  cname: string;
  mobile: string;
  brand_name: string;
  model: string;
  serial: string;
  area?: string;
  pin?: string;
  status: string;
  created_at: string;
  assigned_to?: string;
  assigned_name?: string;
  call_type: string;
  service_type: string;
  wc_type?: string;
  tat_date?: string;
  sequence_no?: number;
}

interface Engineer {
  id: string;
  name: string;
}

interface TicketTableProps {
  tickets: TicketRow[];
  engineers: Engineer[];
  onEngineerChange: (ticketId: string, engineerId: string, engineerName: string) => void;
  onStatusChange: (ticketId: string, newStatus: string) => void;
}

function TicketTable({ tickets, engineers, onEngineerChange, onStatusChange }: TicketTableProps) {
  const inlineSelectStyle: React.CSSProperties = {
    border: `1px solid ${colors.border}`,
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '12px',
    backgroundColor: colors.card,
    color: colors.text,
    cursor: 'pointer',
    maxWidth: '160px',
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.tableHeader}>Ticket ID</th>
            <th style={styles.tableHeader}>Date</th>
            <th style={styles.tableHeader}>Customer</th>
            <th style={styles.tableHeader}>Mobile</th>
            <th style={styles.tableHeader}>Brand/Model</th>
            <th style={styles.tableHeader}>Area/PIN</th>
            <th style={styles.tableHeader}>Status</th>
            <th style={styles.tableHeader}>Engineer</th>
            <th style={styles.tableHeader}>TAT Date</th>
            <th style={styles.tableHeader}>Change Status</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => {
            const overdue = isOverdue(t.tat_date);
            return (
              <tr
                key={t.id}
                style={styles.tableRow}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = '#f8fafc')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = colors.card)
                }
              >
                {/* Ticket ID */}
                <td style={styles.tableCell}>
                  <strong style={{ color: colors.primary }}>{t.id}</strong>
                </td>

                {/* Date */}
                <td style={{ ...styles.tableCell, fontSize: '12px' }}>
                  {new Date(t.created_at).toLocaleDateString()}
                </td>

                {/* Customer */}
                <td style={styles.tableCell}>
                  <strong>{t.cname}</strong>
                </td>

                {/* Mobile */}
                <td style={styles.tableCell}>{t.mobile}</td>

                {/* Brand/Model */}
                <td style={styles.tableCell}>
                  {t.brand_name} {t.model}
                </td>

                {/* Area/PIN */}
                <td style={{ ...styles.tableCell, fontSize: '12px' }}>
                  {t.area || '—'}
                  {t.pin ? ` / ${t.pin}` : ''}
                </td>

                {/* Status badge */}
                <td style={styles.tableCell}>
                  <span
                    style={{
                      ...styles.badge,
                      ...statusBadgeStyle(t.status),
                    }}
                  >
                    {t.status}
                  </span>
                </td>

                {/* Engineer inline dropdown */}
                <td style={styles.tableCell}>
                  <select
                    value={t.assigned_to || ''}
                    onChange={(e) => {
                      const eng = engineers.find((en) => en.id === e.target.value);
                      if (eng) onEngineerChange(t.id, eng.id, eng.name);
                    }}
                    style={inlineSelectStyle}
                  >
                    <option value="">— Unassigned —</option>
                    {engineers.map((eng) => (
                      <option key={eng.id} value={eng.id}>
                        {eng.name}
                      </option>
                    ))}
                  </select>
                </td>

                {/* TAT Date */}
                <td
                  style={{
                    ...styles.tableCell,
                    fontSize: '12px',
                    color: overdue ? colors.danger : colors.text,
                    fontWeight: overdue ? 600 : 400,
                  }}
                >
                  {t.tat_date
                    ? new Date(t.tat_date).toLocaleDateString()
                    : '—'}
                  {overdue && ' ⚠️'}
                </td>

                {/* Status inline dropdown */}
                <td style={styles.tableCell}>
                  <select
                    value={t.status}
                    onChange={(e) => onStatusChange(t.id, e.target.value)}
                    style={inlineSelectStyle}
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
