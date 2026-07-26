'use client';

import { useState } from 'react';
import { CourierEntry, CourierReceiver } from '@/types/courier';
import { colors, styles } from '@/styles/ticketsStyles';
import CourierEditModal from './CourierEditModal';
import DCPrintModal from './DCPrintModal';

interface CourierListProps {
  entries: CourierEntry[];
  receivers: CourierReceiver[];
  onRefresh: () => Promise<void>;
}

function fmtDate(d?: string) {
  if (!d) return '';
  const parts = d.split('-');
  return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : d;
}

function safeAcc(acc?: string[]) {
  return acc && acc.length ? acc.join(', ') : '';
}

const dirBadge = (isIn: boolean): React.CSSProperties =>
  isIn ? { backgroundColor: '#DBEAFE', color: '#1D4ED8' } : { backgroundColor: '#DCFCE7', color: '#15803D' };

const warrantyBadge = (w: string): React.CSSProperties =>
  w === 'In Warranty' ? { backgroundColor: '#D1FAE5', color: '#065f46' } : { backgroundColor: '#FEE2E2', color: '#991B1B' };

export default function CourierList({ entries, receivers, onRefresh }: CourierListProps) {
  const [editEntry, setEditEntry] = useState<CourierEntry | null>(null);
  const [dcEntry, setDcEntry] = useState<CourierEntry | null>(null);

  if (entries.length === 0) {
    return (
      <div style={styles.card}>
        <div style={styles.emptyMessage}>📭 No entries yet</div>
      </div>
    );
  }

  return (
    <div>
      {entries.map((e) => {
        const isIn = e.direction === 'Inward';
        const products = e.products || [];
        return (
          <div key={e.id} style={{ border: `1px solid ${isIn ? '#BFDBFE' : '#BBF7D0'}`, borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
            <div style={{ background: isIn ? '#EFF6FF' : '#F0FDF4', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ ...styles.badge, ...dirBadge(isIn) }}>{isIn ? '📥 Inward' : '📤 Outward'}</span>
                <span style={{ fontWeight: 800, fontSize: 14, color: '#0F172A' }}>
                  {e.awb_no || <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 12 }}>⏳ AWB Pending</span>}
                </span>
                <span style={{ color: '#64748B', fontSize: 12, fontWeight: 500 }}>{e.agency}</span>
                <span style={{ ...styles.badge, backgroundColor: e.weight ? '#FEF3C7' : '#FEE2E2', color: e.weight ? '#92400E' : '#991B1B' }}>
                  ⚖️ {e.weight ? `${e.weight} kg` : 'Pending'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#64748B' }}>📅 {fmtDate(e.entry_date)}</span>
                {!isIn && (
                  <button onClick={() => setDcEntry(e)} style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 10px', fontSize: 12, cursor: 'pointer' }}>🖨️ DC</button>
                )}
                <button onClick={() => setEditEntry(e)} style={{ background: '#fff', border: `1px solid ${isIn ? '#BFDBFE' : '#BBF7D0'}`, borderRadius: 6, padding: '3px 10px', fontSize: 12, cursor: 'pointer', color: isIn ? '#1D4ED8' : '#15803D' }}>✏️ Edit</button>
              </div>
            </div>
            <div style={{ padding: '6px 14px', background: '#FAFAFA', borderBottom: '1px solid #F1F5F9', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <span style={{ fontSize: 12, color: '#374151' }}>{isIn ? '🏠 From: ' : '📍 To: '}<b>{e.place}</b></span>
              {e.person_name && (
                <span style={{ fontSize: 12, color: '#374151' }}>
                  {isIn ? '👤 Sender: ' : '👤 Receiver: '}<b>{e.person_name}</b>{e.sender_mobile ? ` \u00A0📞 ${e.sender_mobile}` : ''}
                </span>
              )}
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>By: {e.wc_name}</span>
            </div>
            {products.length ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      <th style={{ padding: '7px 10px', textAlign: 'left', color: '#64748B', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>MODEL</th>
                      <th style={{ padding: '7px 10px', textAlign: 'left', color: '#64748B', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>SERIAL NO</th>
                      <th style={{ padding: '7px 10px', textAlign: 'left', color: '#64748B', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>CALL ID</th>
                      <th style={{ padding: '7px 10px', textAlign: 'left', color: '#64748B', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>WARRANTY</th>
                      <th style={{ padding: '7px 10px', textAlign: 'left', color: '#64748B', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>{isIn ? 'ACCESSORIES' : 'FAULTY / INVOICE / ACC'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '7px 10px', fontSize: 12, fontWeight: 600, color: '#1E293B' }}>{p.model || '—'}</td>
                        <td style={{ padding: '7px 10px', fontSize: 12, color: '#64748B' }}>{p.serial || '—'}</td>
                        <td style={{ padding: '7px 10px' }}>{p.call_id ? <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '2px 7px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{p.call_id}</span> : <span style={{ color: '#CBD5E1' }}>—</span>}</td>
                        <td style={{ padding: '7px 10px' }}><span style={{ ...styles.badge, ...warrantyBadge(p.warranty) }}>{p.warranty}</span></td>
                        {isIn ? (
                          <td style={{ padding: '7px 10px', fontSize: 11, color: '#64748B' }}>{safeAcc(p.accessories) || '—'}</td>
                        ) : (
                          <td style={{ padding: '7px 10px' }}>
                            <span style={{ background: p.faulty_part === 'Yes' ? '#FEE2E2' : '#F0FDF4', color: p.faulty_part === 'Yes' ? '#991B1B' : '#15803D', padding: '2px 6px', borderRadius: 99, fontSize: 10, fontWeight: 600 }}>{p.faulty_part || '—'}</span>
                            {p.invoice_avail === 'Yes' && <span style={{ marginLeft: 4, background: '#FEF3C7', color: '#92400E', padding: '2px 6px', borderRadius: 99, fontSize: 10, fontWeight: 600 }}>₹{p.invoice_amount || '?'}</span>}
                            <br /><span style={{ fontSize: 11, color: '#64748B' }}>{safeAcc(p.accessories) || '—'}</span>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '10px 14px', color: '#94A3B8', fontSize: 12 }}>No products added</div>
            )}
          </div>
        );
      })}

      {editEntry && (
        <CourierEditModal entry={editEntry} onClose={() => setEditEntry(null)} onSaved={async () => { setEditEntry(null); await onRefresh(); }} />
      )}
      {dcEntry && (
        <DCPrintModal entry={dcEntry} receivers={receivers} onClose={() => setDcEntry(null)} onSaved={onRefresh} />
      )}
    </div>
  );
}