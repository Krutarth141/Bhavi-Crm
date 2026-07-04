'use client';

import { CourierEntry, CourierReceiver } from '@/types/courier';
import { colors, styles } from '@/styles/ticketsStyles';

interface CourierListProps {
  entries: CourierEntry[];
  receivers: CourierReceiver[];
  onStatusChange: (id: string, status: 'pending' | 'received' | 'dispatched') => Promise<void>;
}

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

export default function CourierList({ entries, receivers, onStatusChange }: CourierListProps) {
  const getReceiverName = (id?: string) => {
    if (!id) return '—';
    return receivers.find((r) => r.id === id)?.name ?? '—';
  };

  if (entries.length === 0) {
    return (
      <div style={styles.card}>
        <div style={styles.emptyMessage}>No courier entries in the last 30 days</div>
      </div>
    );
  }

  return (
    <div style={{ ...styles.card, overflowX: 'auto' }}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.tableHeader}>Date</th>
            <th style={styles.tableHeader}>Type</th>
            <th style={styles.tableHeader}>AWB No</th>
            <th style={styles.tableHeader}>Agency</th>
            <th style={styles.tableHeader}>Sender / Receiver</th>
            <th style={styles.tableHeader}>From / To Place</th>
            <th style={styles.tableHeader}>Weight</th>
            <th style={styles.tableHeader}>Status</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.id}
              style={styles.tableRow}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.card)}
            >
              <td style={{ ...styles.tableCell, fontSize: '12px', whiteSpace: 'nowrap' }}>
                {entry.entry_date}
              </td>
              <td style={styles.tableCell}>
                <span style={{ ...styles.badge, ...typeBadgeStyle(entry.type) }}>
                  {entry.type === 'Inward' ? '📥 Inward' : '📤 Outward'}
                </span>
              </td>
              <td style={{ ...styles.tableCell, fontWeight: 600 }}>{entry.awb_no}</td>
              <td style={styles.tableCell}>{entry.agency}</td>
              <td style={styles.tableCell}>
                {entry.type === 'Inward'
                  ? (entry.sender_name || '—')
                  : getReceiverName(entry.receiver_id)}
              </td>
              <td style={{ ...styles.tableCell, fontSize: '12px' }}>
                {entry.type === 'Inward'
                  ? (entry.from_place || '—')
                  : (entry.to_place || '—')}
              </td>
              <td style={styles.tableCell}>
                {entry.weight != null ? `${entry.weight} kg` : '—'}
              </td>
              <td style={styles.tableCell}>
                <select
                  value={entry.status}
                  onChange={(e) =>
                    onStatusChange(entry.id, e.target.value as 'pending' | 'received' | 'dispatched')
                  }
                  style={{
                    border: `1px solid ${colors.border}`,
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    ...statusBadgeStyle(entry.status),
                  }}
                >
                  <option value="pending">🟡 Pending</option>
                  <option value="received">🟢 Received</option>
                  <option value="dispatched">🔵 Dispatched</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
