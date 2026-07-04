'use client';

import { WalkInEntry } from '@/types/walkin';
import { colors, styles } from '@/styles/ticketsStyles';

interface WalkInListProps {
  entries: WalkInEntry[];
  onEdit: (entry: WalkInEntry) => void;
  onDelete: (id: string) => void;
}

export default function WalkInList({ entries, onEdit, onDelete }: WalkInListProps) {
  const handleDelete = (entry: WalkInEntry) => {
    const confirmed = confirm(
      `Delete walk-in entry for "${entry.customer_name}" (Token #${entry.token_no})?`
    );
    if (confirmed) onDelete(entry.id);
  };

  if (entries.length === 0) {
    return (
      <div style={styles.emptyMessage}>No walk-in entries for today</div>
    );
  }

  return (
    <div style={styles.card}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.tableHeader}>Token #</th>
            <th style={styles.tableHeader}>Customer Name</th>
            <th style={styles.tableHeader}>Mobile</th>
            <th style={styles.tableHeader}>Arrival Time</th>
            <th style={styles.tableHeader}>Products</th>
            <th style={styles.tableHeader}>Action</th>
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
              <td style={styles.tableCell}>
                <strong>{entry.customer_name}</strong>
              </td>
              <td style={{ ...styles.tableCell, color: colors.primary, fontWeight: 600 }}>
                {entry.mobile}
              </td>
              <td style={{ ...styles.tableCell, fontSize: '12px' }}>
                {entry.arrival_time || '—'}
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
                  {entry.products?.length ?? 0} item{(entry.products?.length ?? 0) !== 1 ? 's' : ''}
                </span>
              </td>
              <td style={styles.tableCell}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    style={{ ...styles.btn, ...styles.btnSm, ...styles.btnPrimary }}
                    onClick={() => onEdit(entry)}
                    onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.btnPrimaryHover)}
                    onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.btnPrimary)}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    style={{
                      ...styles.btn,
                      ...styles.btnSm,
                      background: '#fee2e2',
                      color: colors.danger,
                    }}
                    onClick={() => handleDelete(entry)}
                    onMouseEnter={(e) => Object.assign(e.currentTarget.style, { background: '#fecaca', color: colors.danger })}
                    onMouseLeave={(e) => Object.assign(e.currentTarget.style, { background: '#fee2e2', color: colors.danger })}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
