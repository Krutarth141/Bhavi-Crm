'use client';
import { useState } from 'react';
import { PartRequest } from '@/types/partRequest';
import { InventoryItem } from '@/types/inventory';
import { EngStock } from '@/types/engParts';
import { submitPartRequest } from '@/services/partRequestService';
import { colors, styles } from '@/styles/ticketsStyles';

type EngTabType = 'my-requests' | 'self-service' | 'return-parts';

interface Props {
  engName: string;
  inventory: InventoryItem[];
  myStock: EngStock[];
  myRequests: PartRequest[];
  onRefetch: () => void;
}

export default function EngPartsEngineer({ engName, inventory, myStock, myRequests, onRefetch }: Props) {
  const [activeTab, setActiveTab] = useState<EngTabType>('my-requests');
  const [search, setSearch] = useState('');

  // Self-service request state
  const [requestingPartId, setRequestingPartId] = useState<string | null>(null);
  const [requestQty, setRequestQty] = useState(1);
  const [requestNote, setRequestNote] = useState('');
  const [requestError, setRequestError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Return-parts request state
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [returnNotes, setReturnNotes] = useState('');
  const [returnSubmitting, setReturnSubmitting] = useState(false);

  // ── Self Service data ────────────────────────────────────────────────────
  const availableItems = inventory.filter(item => {
    if (item.qty_in_stock <= 0) return false;
    const q = search.toLowerCase();
    return (
      item.item_name.toLowerCase().includes(q) ||
      (item.part_code ?? item.item_code).toLowerCase().includes(q)
    );
  });

  const statusBadgeStyle = (status?: string): React.CSSProperties => {
    if (status === 'PENDING') return { ...styles.badge, ...styles.badgePending };
    if (status === 'APPROVED') return { ...styles.badge, ...styles.badgeApprove };
    if (status === 'REJECTED') return { ...styles.badge, ...styles.badgeReject };
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
      await submitPartRequest({
        engineer_name: engName,
        parts: [{ part_id: item.id, part_name: item.item_name, qty: requestQty }],
        notes: requestNote || undefined,
      });
      onRefetch();
      setRequestingPartId(null);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Return-parts handlers ────────────────────────────────────────────────
  const toggleReturnPart = (partId: string, maxQty: number) => {
    setReturnQtys(prev => {
      const next = { ...prev };
      if (partId in next) delete next[partId];
      else next[partId] = maxQty;
      return next;
    });
  };

  const setReturnQty = (partId: string, qty: number, maxQty: number) => {
    setReturnQtys(prev => ({ ...prev, [partId]: Math.max(1, Math.min(maxQty, qty || 1)) }));
  };

  const submitReturnRequest = async () => {
    const partIds = Object.keys(returnQtys);
    if (!partIds.length) { alert('Select at least one part to return.'); return; }
    setReturnSubmitting(true);
    try {
      const parts = partIds.map(partId => {
        const inv = inventory.find(i => i.id === partId);
        return { part_id: partId, part_name: inv?.item_name || partId, qty: returnQtys[partId] };
      });
      await submitPartRequest({
        engineer_name: engName,
        parts,
        notes: returnNotes || undefined,
        type: 'RETURN',
      });
      onRefetch();
      setReturnQtys({});
      setReturnNotes('');
      alert('✅ Return request submitted!');
    } finally {
      setReturnSubmitting(false);
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
          <button style={tabStyle('return-parts')} onClick={() => setActiveTab('return-parts')}>
            Return Parts
          </button>
        </div>

        <div style={{ padding: '16px' }}>

          {/* ── My Requests ── */}
          {activeTab === 'my-requests' && (
            myRequests.length === 0 ? (
              <div style={styles.emptyMessage}>No requests yet</div>
            ) : (
              <div style={{ overflowX: 'auto' as const }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.tableHeader}>Date</th>
                      <th style={styles.tableHeader}>Type</th>
                      <th style={styles.tableHeader}>Parts</th>
                      <th style={styles.tableHeader}>Notes</th>
                      <th style={styles.tableHeader}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myRequests.map(req => {
                      const partsList = (req.parts || []).map(p => `${p.qty || 1}× ${p.part_name || p.part_id || '?'}`).join(', ');
                      return (
                        <tr key={req.id} style={styles.tableRow}>
                          <td style={styles.tableCell}>
                            {req.created_at ? new Date(req.created_at).toLocaleDateString() : '—'}
                          </td>
                          <td style={styles.tableCell}>{req.type || '—'}</td>
                          <td style={styles.tableCell}>{partsList || '—'}</td>
                          <td style={styles.tableCell}>{req.notes ?? '—'}</td>
                          <td style={styles.tableCell}>
                            <span style={statusBadgeStyle(req.status)}>{req.status}</span>
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

          {/* ── Return Parts ── */}
          {activeTab === 'return-parts' && (
            myStock.filter(s => s.qty > 0).length === 0 ? (
              <div style={styles.emptyMessage}>No parts in your stock to return</div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' as const }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.tableHeader}></th>
                        <th style={styles.tableHeader}>Part</th>
                        <th style={styles.tableHeader}>My Qty</th>
                        <th style={styles.tableHeader}>Return Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myStock.filter(s => s.qty > 0).map(s => {
                        const inv = inventory.find(i => i.id === s.part_id);
                        const selected = s.part_id in returnQtys;
                        return (
                          <tr key={s.id} style={styles.tableRow}>
                            <td style={styles.tableCell}>
                              <input type="checkbox" checked={selected} onChange={() => toggleReturnPart(s.part_id, s.qty)} />
                            </td>
                            <td style={styles.tableCell}>{inv ? (inv.part_code ?? inv.item_code) + ' — ' + inv.item_name : s.part_id}</td>
                            <td style={styles.tableCell}>{s.qty}</td>
                            <td style={styles.tableCell}>
                              <input
                                type="number"
                                min={1}
                                max={s.qty}
                                disabled={!selected}
                                style={{ ...styles.formInput, width: '70px' }}
                                value={selected ? returnQtys[s.part_id] : s.qty}
                                onChange={e => setReturnQty(s.part_id, Number(e.target.value), s.qty)}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: '12px', display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' as const }}>
                  <div style={{ ...styles.formGroup, flex: 1, minWidth: '200px' }}>
                    <label style={styles.formLabel}>Note (optional)</label>
                    <textarea
                      style={{ ...styles.formInput, resize: 'vertical' as const, minHeight: '36px' }}
                      value={returnNotes}
                      onChange={e => setReturnNotes(e.target.value)}
                      placeholder="Reason for return..."
                    />
                  </div>
                  <div style={{ paddingBottom: '2px' }}>
                    <button
                      style={{ ...styles.btn, ...styles.btnPrimary, ...styles.btnSm }}
                      onClick={submitReturnRequest}
                      disabled={returnSubmitting || Object.keys(returnQtys).length === 0}
                    >
                      {returnSubmitting ? 'Submitting...' : '↩️ Submit Return Request'}
                    </button>
                  </div>
                </div>
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
}