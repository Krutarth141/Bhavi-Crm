'use client';
import { useState } from 'react';
import { EngStockLog } from '@/types/engParts';
import { InventoryItem } from '@/types/inventory';
import { requestParts } from '@/services/engPartsService';
import { colors, styles } from '@/styles/ticketsStyles';

type EngTabType = 'my-requests' | 'self-service';

interface Props {
  engName: string;
  inventory: InventoryItem[];
  engStockLog: EngStockLog[];
  onRefetch: () => void;
}

export default function EngPartsEngineer({ engName, inventory, engStockLog, onRefetch }: Props) {
  const [activeTab, setActiveTab] = useState<EngTabType>('my-requests');
  const [search, setSearch] = useState('');

  // Self-service request state
  const [requestingPartId, setRequestingPartId] = useState<string | null>(null);
  const [requestQty, setRequestQty] = useState(1);
  const [requestNote, setRequestNote] = useState('');
  const [requestError, setRequestError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── My Requests data ─────────────────────────────────────────────────────
  const myLogs = engStockLog.filter(l => l.eng_name === engName);

  // ── Self Service data ────────────────────────────────────────────────────
  const availableItems = inventory.filter(item => {
    if (item.qty_in_stock <= 0) return false;
    const q = search.toLowerCase();
    return (
      item.item_name.toLowerCase().includes(q) ||
      (item.part_code ?? item.item_code).toLowerCase().includes(q)
    );
  });

  // ── Action badge ─────────────────────────────────────────────────────────
  const actionBadgeStyle = (action: string): React.CSSProperties => {
    const map: Record<string, React.CSSProperties> = {
      Issue: { ...styles.badge, backgroundColor: '#dbeafe', color: '#1a56db' },
      Use: { ...styles.badge, backgroundColor: '#fef3c7', color: '#d97706' },
      Return: { ...styles.badge, backgroundColor: '#d1fae5', color: '#065f46' },
      Request: { ...styles.badge, backgroundColor: '#f3e8ff', color: '#7c3aed' },
      'Warranty Return': { ...styles.badge, backgroundColor: '#ccfbf1', color: '#0f766e' },
      'Direct Warranty Issue': { ...styles.badge, backgroundColor: '#e0e7ff', color: '#4338ca' },
    };
    return map[action] ?? { ...styles.badge, backgroundColor: '#f1f5f9', color: '#475569' };
  };

  const statusBadgeStyle = (status?: string): React.CSSProperties => {
    if (status === 'pending') return { ...styles.badge, ...styles.badgePending };
    if (status === 'approved') return { ...styles.badge, ...styles.badgeApprove };
    if (status === 'rejected') return { ...styles.badge, ...styles.badgeReject };
    return { ...styles.badge, ...styles.badgeCancel };
  };

  const tabStyle = (key: EngTabType): React.CSSProperties => ({
    padding: '8px 16px',
    border: 'none',
    borderBottom: `2px solid ${activeTab === key ? colors.primary : 'transparent'}`,
    background: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: activeTab === key ? 700 : 400,
    color: activeTab === key ? colors.primary : colors.textMuted,
    transition: 'all 0.15s',
  });

  // ── Request handlers ─────────────────────────────────────────────────────
  const openRequest = (partId: string) => {
    setRequestingPartId(partId);
    setRequestQty(1);
    setRequestNote('');
    setRequestError('');
  };

  const cancelRequest = () => {
    setRequestingPartId(null);
    setRequestError('');
  };

  const confirmRequest = async (item: InventoryItem) => {
    if (requestQty < 1) {
      setRequestError('Quantity must be at least 1');
      return;
    }
    if (requestQty > item.qty_in_stock) {
      setRequestError(`Cannot exceed available stock (${item.qty_in_stock})`);
      return;
    }
    setSubmitting(true);
    try {
      await requestParts({
        part_id: item.id,
        eng_name: engName,
        qty: requestQty,
        note: requestNote || undefined,
      });
      onRefetch();
      setRequestingPartId(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '20px', background: colors.bg, minHeight: '100vh' }}>
      <div style={styles.card}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}`, padding: '0 4px' }}>
          <button style={tabStyle('my-requests')} onClick={() => setActiveTab('my-requests')}>
            My Requests
          </button>
          <button style={tabStyle('self-service')} onClick={() => setActiveTab('self-service')}>
            Self Service
          </button>
        </div>

        <div style={{ padding: '16px' }}>

          {/* ── My Requests ── */}
          {activeTab === 'my-requests' && (
            myLogs.length === 0 ? (
              <div style={styles.emptyMessage}>No activity yet</div>
            ) : (
              <div style={{ overflowX: 'auto' as const }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.tableHeader}>Date</th>
                      <th style={styles.tableHeader}>Action</th>
                      <th style={styles.tableHeader}>Part</th>
                      <th style={styles.tableHeader}>Qty</th>
                      <th style={styles.tableHeader}>Note</th>
                      <th style={styles.tableHeader}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myLogs.map(log => {
                      const part = inventory.find(i => i.id === log.part_id);
                      return (
                        <tr key={log.id} style={styles.tableRow}>
                          <td style={styles.tableCell}>
                            {log.created_at ? new Date(log.created_at).toLocaleDateString() : '—'}
                          </td>
                          <td style={styles.tableCell}>
                            <span style={actionBadgeStyle(log.action)}>{log.action}</span>
                          </td>
                          <td style={styles.tableCell}>{part?.item_name ?? log.part_id}</td>
                          <td style={styles.tableCell}>{log.qty}</td>
                          <td style={styles.tableCell}>{log.note ?? '—'}</td>
                          <td style={styles.tableCell}>
                            {log.status ? (
                              <span style={statusBadgeStyle(log.status)}>{log.status}</span>
                            ) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ── Self Service ── */}
          {activeTab === 'self-service' && (
            <>
              <div style={styles.filterBar}>
                <input
                  style={styles.filterInput}
                  placeholder="Search by part name or code..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div style={{ overflowX: 'auto' as const }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.tableHeader}>Part Code</th>
                      <th style={styles.tableHeader}>Item Name</th>
                      <th style={styles.tableHeader}>Available Qty</th>
                      <th style={styles.tableHeader}>Unit Price</th>
                      <th style={styles.tableHeader}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableItems.map(item => (
                      <>
                        <tr key={item.id} style={styles.tableRow}>
                          <td style={styles.tableCell}>{item.part_code ?? item.item_code}</td>
                          <td style={styles.tableCell}>{item.item_name}</td>
                          <td style={styles.tableCell}>{item.qty_in_stock}</td>
                          <td style={styles.tableCell}>₹{item.unit_price}</td>
                          <td style={styles.tableCell}>
                            {requestingPartId === item.id ? (
                              '—'
                            ) : (
                              <button
                                style={{ ...styles.btn, ...styles.btnPrimary, ...styles.btnSm }}
                                onClick={() => openRequest(item.id)}
                                disabled={requestingPartId !== null}
                              >
                                Request
                              </button>
                            )}
                          </td>
                        </tr>
                        {requestingPartId === item.id && (
                          <tr key={`${item.id}-form`} style={{ backgroundColor: colors.primaryLight }}>
                            <td colSpan={5} style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' as const }}>
                                <div style={styles.formGroup}>
                                  <label style={styles.formLabel}>Quantity *</label>
                                  <input
                                    type="number"
                                    min={1}
                                    max={item.qty_in_stock}
                                    style={{ ...styles.formInput, width: '80px' }}
                                    value={requestQty}
                                    onChange={e => { setRequestQty(Number(e.target.value)); setRequestError(''); }}
                                  />
                                </div>
                                <div style={{ ...styles.formGroup, flex: 1, minWidth: '200px' }}>
                                  <label style={styles.formLabel}>Note (optional)</label>
                                  <textarea
                                    style={{ ...styles.formInput, resize: 'vertical' as const, minHeight: '36px' }}
                                    value={requestNote}
                                    onChange={e => setRequestNote(e.target.value)}
                                    placeholder="Reason for request..."
                                  />
                                </div>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', paddingBottom: '2px' }}>
                                  <button
                                    style={{ ...styles.btn, ...styles.btnPrimary, ...styles.btnSm }}
                                    onClick={() => confirmRequest(item)}
                                    disabled={submitting}
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    style={{ ...styles.btn, ...styles.btnOutline, ...styles.btnSm }}
                                    onClick={cancelRequest}
                                    disabled={submitting}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                              {requestError && (
                                <div style={{ fontSize: '12px', color: colors.danger, marginTop: '6px' }}>
                                  {requestError}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                    {availableItems.length === 0 && (
                      <tr>
                        <td colSpan={5} style={styles.emptyMessage}>No available parts</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
