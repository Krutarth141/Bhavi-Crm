'use client';
import { useState } from 'react';
import { PartRequest } from '@/types/partRequest';
import { InventoryItem } from '@/types/inventory';
import { EngStock } from '@/types/engParts';
import { submitPartRequest } from '@/services/partRequestService';
import { colors, styles } from '@/styles/ticketsStyles';

type EngTabType = 'my-stock' | 'my-requests' | 'self-service' | 'return-parts';

interface Props {
  engName: string;
  engineerId?: string;
  inventory: InventoryItem[];
  myStock: EngStock[];
  myRequests: PartRequest[];
  onRefetch: () => void;
}

export default function EngPartsEngineer({ engName, engineerId, inventory, myStock, myRequests, onRefetch }: Props) {
  const [activeTab, setActiveTab] = useState<EngTabType>('my-stock');
  const [search, setSearch] = useState('');

  // Self-service cart state — part_id -> requested qty
  const [requestQtys, setRequestQtys] = useState<Record<string, number>>({});
  const [requestNotes, setRequestNotes] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);

  // Return-parts request state
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [returnNotes, setReturnNotes] = useState('');
  const [returnSubmitting, setReturnSubmitting] = useState(false);

  // ── My Stock data (mirrors HTML's renderEPMyStockView) ──────────────────
  const myStockItems = myStock
    .filter(s => s.qty > 0)
    .map(s => {
      const inv = inventory.find(i => i.id === s.part_id);
      return {
        id: s.id,
        code: inv?.part_code ?? '-',
        name: inv?.item_name ?? 'Unknown part',
        qty: s.qty,
        value: s.qty * (inv?.unit_price || 0),
      };
    })
    .sort((a, b) => (a.code || '').localeCompare(b.code || ''));
  const myStockTotalVal = myStockItems.reduce((a, i) => a + i.value, 0);

  // ── Self Service data — no qty_in_stock filter; out-of-stock parts can
  // still be requested (matches HTML, which only shows a stock-level badge). ─
  const availableItems = inventory.filter(item => {
    const q = search.toLowerCase();
    return (
      item.item_name.toLowerCase().includes(q) ||
      (item.part_code ?? item.item_code).toLowerCase().includes(q)
    );
  });

  const stockBadge = (item: InventoryItem) => {
    const stk = item.qty_in_stock || 0;
    if (stk > 5) return <span style={{ fontSize: '11px', fontWeight: 700, color: colors.success }}>✅ Good ({stk})</span>;
    if (stk > 0) return <span style={{ fontSize: '11px', fontWeight: 700, color: colors.warning }}>⚠️ Low ({stk})</span>;
    return <span style={{ fontSize: '11px', fontWeight: 700, color: colors.danger }}>❌ Out (0)</span>;
  };

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

  // ── Self-service cart handlers ───────────────────────────────────────────
  const toggleRequestPart = (partId: string) => {
    setRequestQtys(prev => {
      const next = { ...prev };
      if (partId in next) delete next[partId];
      else next[partId] = 1;
      return next;
    });
  };

  const setRequestQty = (partId: string, qty: number) => {
    setRequestQtys(prev => ({ ...prev, [partId]: Math.max(1, qty || 1) }));
  };

  const submitSelfServiceRequest = async () => {
    const partIds = Object.keys(requestQtys);
    if (!partIds.length) { alert('Select at least one part.'); return; }
    setRequestSubmitting(true);
    try {
      const parts = partIds.map(partId => {
        const inv = inventory.find(i => i.id === partId);
        return { part_id: partId, part_name: inv?.item_name || partId, qty: requestQtys[partId] };
      });
      await submitPartRequest({
        engineer_id: engineerId,
        engineer_name: engName,
        parts,
        notes: requestNotes || undefined,
        type: 'RECEIVE',
      });
      onRefetch();
      setRequestQtys({});
      setRequestNotes('');
      alert('✅ Request submitted! Stock will be available after Admin approval.');
      setActiveTab('my-requests');
    } finally {
      setRequestSubmitting(false);
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
        engineer_id: engineerId,
        engineer_name: engName,
        parts,
        notes: returnNotes || undefined,
        type: 'RETURN',
      });
      onRefetch();
      setReturnQtys({});
      setReturnNotes('');
      alert('✅ Return request submitted!');
      setActiveTab('my-requests');
    } finally {
      setReturnSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '20px', background: colors.bg, minHeight: '100vh' }}>
      <div style={styles.card}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}`, padding: '0 4px', flexWrap: 'wrap' as const }}>
          <button style={tabStyle('my-stock')} onClick={() => setActiveTab('my-stock')}>
            📦 My Stock
          </button>
          <button style={tabStyle('my-requests')} onClick={() => setActiveTab('my-requests')}>
            📋 My Requests
          </button>
          <button style={tabStyle('self-service')} onClick={() => setActiveTab('self-service')}>
            📥 Parts Request (Receive)
          </button>
          <button style={tabStyle('return-parts')} onClick={() => setActiveTab('return-parts')}>
            ↩️ Return Parts to Store
          </button>
        </div>

        <div style={{ padding: '16px' }}>

          {/* ── My Stock ── */}
          {activeTab === 'my-stock' && (
            myStockItems.length === 0 ? (
              <div style={styles.emptyMessage}>No parts in your stock right now.</div>
            ) : (
              <>
                <div style={{ ...styles.card, marginBottom: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', color: colors.textMuted }}>Total parts: <b>{myStockItems.length}</b></div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: colors.success }}>Total Value: ₹{myStockTotalVal.toFixed(0)}</div>
                </div>
                <div style={{ overflowX: 'auto' as const }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.tableHeader}>Part Code</th>
                        <th style={styles.tableHeader}>Item Name</th>
                        <th style={styles.tableHeader}>Qty</th>
                        <th style={styles.tableHeader}>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myStockItems.map(i => (
                        <tr key={i.id} style={styles.tableRow}>
                          <td style={{ ...styles.tableCell, color: colors.primary, fontWeight: 700 }}>{i.code}</td>
                          <td style={styles.tableCell}>{i.name}</td>
                          <td style={{ ...styles.tableCell, textAlign: 'center' as const, fontWeight: 700 }}>{i.qty}</td>
                          <td style={{ ...styles.tableCell, textAlign: 'right' as const, color: colors.success }}>₹{i.value.toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )
          )}

          {/* ── My Requests ── */}
          {activeTab === 'my-requests' && (
            myRequests.length === 0 ? (
              <div style={styles.emptyMessage}>No requests yet. Use the &quot;Parts Request&quot; button to submit a new request.</div>
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
                      <th style={styles.tableHeader}>Approved By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myRequests.map(req => {
                      // index.html:11228,11230 — live lookup "CODE — Name × qty" from
                      // current inventory by part_id, one part per line; falls back to
                      // the stored snapshot if the part is no longer found.
                      const getPartLabel = (partId?: string) => {
                        const inv = partId ? inventory.find(i => i.id === partId) : undefined;
                        return inv ? (inv.part_code ? `${inv.part_code} — ${inv.item_name}` : inv.item_name) : null;
                      };
                      const partsLines = (req.parts || []).map(p => {
                        const label = getPartLabel(p.part_id) || p.part_name || p.part_id || '?';
                        return `${label} × ${p.qty || 1}`;
                      });
                      return (
                        <tr key={req.id} style={styles.tableRow}>
                          <td style={styles.tableCell}>
                            {/* index.html:11221 — date + time, not date-only */}
                            {req.created_at ? new Date(req.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td style={styles.tableCell}>{req.type || '—'}</td>
                          <td style={styles.tableCell}>
                            {partsLines.length
                              ? partsLines.map((line, i) => <div key={i}>{line}</div>)
                              : '—'}
                          </td>
                          <td style={styles.tableCell}>{req.notes ?? '—'}</td>
                          <td style={styles.tableCell}>
                            <span style={statusBadgeStyle(req.status)}>{req.status}</span>
                          </td>
                          <td style={styles.tableCell}>{req.approved_by || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ── Self Service (Parts Request — Receive) ── */}
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
                      <th style={styles.tableHeader}></th>
                      <th style={styles.tableHeader}>Part Code</th>
                      <th style={styles.tableHeader}>Item Name</th>
                      <th style={styles.tableHeader}>Stock</th>
                      <th style={styles.tableHeader}>Request Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableItems.map(item => {
                      const selected = item.id in requestQtys;
                      return (
                        <tr key={item.id} style={styles.tableRow}>
                          <td style={styles.tableCell}>
                            <input type="checkbox" checked={selected} onChange={() => toggleRequestPart(item.id)} />
                          </td>
                          <td style={styles.tableCell}>{item.part_code ?? item.item_code}</td>
                          <td style={styles.tableCell}>{item.item_name}</td>
                          <td style={styles.tableCell}>{stockBadge(item)}</td>
                          <td style={styles.tableCell}>
                            <input
                              type="number"
                              min={1}
                              disabled={!selected}
                              style={{ ...styles.formInput, width: '70px' }}
                              value={selected ? requestQtys[item.id] : 1}
                              onChange={e => setRequestQty(item.id, Number(e.target.value))}
                            />
                          </td>
                        </tr>
                      );
                    })}
                    {availableItems.length === 0 && (
                      <tr>
                        <td colSpan={5} style={styles.emptyMessage}>No parts found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: '12px', display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' as const }}>
                <div style={{ ...styles.formGroup, flex: 1, minWidth: '200px' }}>
                  <label style={styles.formLabel}>Note (optional)</label>
                  <textarea
                    style={{ ...styles.formInput, resize: 'vertical' as const, minHeight: '36px' }}
                    value={requestNotes}
                    onChange={e => setRequestNotes(e.target.value)}
                    placeholder="Reason for request..."
                  />
                </div>
                <div style={{ paddingBottom: '2px' }}>
                  <button
                    style={{ ...styles.btn, ...styles.btnPrimary, ...styles.btnSm }}
                    onClick={submitSelfServiceRequest}
                    disabled={requestSubmitting || Object.keys(requestQtys).length === 0}
                  >
                    {requestSubmitting ? 'Submitting...' : '📥 Submit Request'}
                  </button>
                </div>
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