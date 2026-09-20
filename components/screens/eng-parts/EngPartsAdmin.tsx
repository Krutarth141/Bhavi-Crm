'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { EngStock, EngMovement } from '@/types/engParts';
import { PartRequest } from '@/types/partRequest';
import { InventoryItem } from '@/types/inventory';
import IssueModal from './IssueModal';
import UseModal from './UseModal';
import ReturnModal from './ReturnModal';
import DirectWarrantyIssueModal from './DirectWarrantyIssueModal';
import WarrantyPendingTab from './WarrantyPendingTab';
import {
  issueToEngineer,
  recordUsage,
  engineerReturn,
  warrantyReturn,
  directWarrantyIssue,
  adjustStock,
} from '@/services/engPartsService';
import AdjustStockModal from './AdjustStockModal';
import { approvePartRequest, rejectPartRequest } from '@/services/partRequestService';
import { colors, styles } from '@/styles/ticketsStyles';

type AdminTabType = 'overview' | 'analysis' | 'pending' | 'log' | 'warranty-pending';
type ModalType = 'issue' | 'use' | 'return' | 'warranty' | 'directWarranty' | null;

interface Props {
  inventory: InventoryItem[];
  engStock: EngStock[];
  movements: EngMovement[];
  engineers: string[];
  pendingRequests: PartRequest[];
  onRefetch: () => void;
  // HTML: isEng && isCspMgr → show ONLY the Pending Requests tab (with an
  // info banner), no KPI bar / action buttons / other admin tabs.
  cspManagerMode?: boolean;
}

export default function EngPartsAdmin({
  inventory,
  engStock,
  movements,
  engineers,
  pendingRequests,
  onRefetch,
  cspManagerMode,
}: Props) {
  const { data: session } = useSession();
  const approvedBy = (session?.user as any)?.name ?? 'Admin';

  const [activeTab, setActiveTab] = useState<AdminTabType>(cspManagerMode ? 'pending' : 'overview');
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [search, setSearch] = useState('');
  const [adjustTarget, setAdjustTarget] = useState<{ owner: string; partId: string; ownerLabel: string; partLabel: string; currentQty: number } | null>(null);

  // ── Engineer Analysis filters (index.html:10213-10358) ───────────────────
  const [analysisPartQ, setAnalysisPartQ] = useState('');
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [analysisEngFilter, setAnalysisEngFilter] = useState('');

  // ── Log tab filters (index.html:10606-10640) ──────────────────────────────
  const [logSearch, setLogSearch] = useState('');
  const [logTypeFilter, setLogTypeFilter] = useState('');
  const [logFrom, setLogFrom] = useState('');
  const [logTo, setLogTo] = useState('');

  // ── KPI values ───────────────────────────────────────────────────────────
  const officeStockValue = inventory.reduce(
    (sum, i) => sum + (i.qty_in_stock || 0) * (i.unit_price || 0),
    0
  );
  const fieldStockValue = engStock.reduce((sum, s) => {
    const inv = inventory.find(i => i.id === s.part_id);
    return sum + s.qty * (inv?.unit_price || 0);
  }, 0);

  // ── Movement type badge ──────────────────────────────────────────────────
  const movementBadgeStyle = (type: string): React.CSSProperties => {
    const map: Record<string, React.CSSProperties> = {
      ISSUE: { ...styles.badge, backgroundColor: '#dbeafe', color: '#1a56db' },
      USE: { ...styles.badge, backgroundColor: '#fef3c7', color: '#d97706' },
      ENG_RETURN: { ...styles.badge, backgroundColor: '#d1fae5', color: '#065f46' },
      WARRANTY_RETURN: { ...styles.badge, backgroundColor: '#ccfbf1', color: '#0f766e' },
      WARRANTY_DIRECT_IN: { ...styles.badge, backgroundColor: '#e0e7ff', color: '#4338ca' },
      ADJUST: { ...styles.badge, backgroundColor: '#f3e8ff', color: '#7c3aed' },
    };
    return map[type] ?? { ...styles.badge, backgroundColor: '#f1f5f9', color: '#475569' };
  };

  const stockColor = (item: InventoryItem) => {
    if (item.qty_in_stock <= 0) return colors.danger;
    if (item.qty_in_stock <= item.min_stock) return colors.warning;
    return colors.success;
  };

  // ── Filtered inventory for overview ─────────────────────────────────────
  // index.html:10367-10368,10383 — only items with tracked eng_stock or
  // current office stock are listed, and search matches part_code too.
  const trackedPartIds = new Set(engStock.map(s => s.part_id));
  const overviewItems = inventory.filter(item => trackedPartIds.has(item.id) || item.qty_in_stock > 0);
  const searchQ = search.toLowerCase();
  const filteredInventory = overviewItems.filter(item =>
    item.item_name.toLowerCase().includes(searchQ) ||
    (item.part_code ?? item.item_code ?? '').toLowerCase().includes(searchQ)
  );

  // ── Modal save handlers ──────────────────────────────────────────────────
  const handleIssueSave = async (params: {
    part_id: string; eng_name: string; qty: number; ticket_id?: string; note?: string;
  }) => {
    await issueToEngineer({ ...params, by: approvedBy });
    onRefetch();
  };

  const handleUseSave = async (params: {
    part_id: string; eng_name: string; qty: number; ticket_id?: string; note?: string; warranty?: boolean;
  }) => {
    const r = await recordUsage({ ...params, by: approvedBy });
    if (!r.success) alert('Error: ' + r.error);
    onRefetch();
  };

  const handleReturnSave = async (params: {
    part_id: string; eng_name?: string; qty: number; note?: string;
  }) => {
    await engineerReturn({ part_id: params.part_id, eng_name: params.eng_name || '', qty: params.qty, note: params.note });
    onRefetch();
  };

  const handleWarrantySave = async (params: {
    part_id: string; qty: number; job_sheet?: string; note?: string;
  }) => {
    const r = await warrantyReturn({ part_id: params.part_id, qty: params.qty, job_sheet: params.job_sheet || '', note: params.note });
    if (!r.success && r.error !== 'Cancelled') alert('Error: ' + r.error);
    onRefetch();
  };

  const handleDirectWarrantyIssueSave = async (params: {
    part_id: string; eng_name: string; qty: number; job_sheet: string; note?: string;
  }) => {
    await directWarrantyIssue(params);
    onRefetch();
  };

  const handleAdjustSave = async (newQty: number, remark: string) => {
    if (!adjustTarget) return;
    const r = await adjustStock(adjustTarget.owner, adjustTarget.partId, adjustTarget.currentQty, newQty, remark, approvedBy);
    if (!r.success) alert('Error: ' + r.error);
    onRefetch();
  };

  const tabs: { key: AdminTabType; label: string }[] = [
    { key: 'overview', label: 'Stock Overview' },
    { key: 'analysis', label: 'Engineer Analysis' },
    { key: 'pending', label: `Pending Approvals${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}` },
    { key: 'warranty-pending', label: '🔄 Warranty Pending' },
    { key: 'log', label: 'Log' },
  ];

  const tabStyle = (key: AdminTabType): React.CSSProperties => ({
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

  return (
    <div style={{ padding: '20px', background: colors.bg, minHeight: '100vh' }}>

      {/* KPI Bar */}
      {!cspManagerMode && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Total Parts', value: inventory.length },
            { label: 'Engineers with Stock', value: engineers.length },
            { label: 'Office Stock Value', value: `₹${officeStockValue.toFixed(0)}` },
            { label: 'Field Stock Value', value: `₹${fieldStockValue.toFixed(0)}` },
          ].map(kpi => (
            <div key={kpi.label} style={{ ...styles.card, textAlign: 'center' as const }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: colors.primary }}>{kpi.value}</div>
              <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '4px' }}>{kpi.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      {!cspManagerMode && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const, marginBottom: '20px' }}>
          <button
            style={{ ...styles.btn, ...styles.btnPrimary }}
            onClick={() => setActiveModal('issue')}
          >
            📤 Issue to Engineer
          </button>
          <button
            style={{ ...styles.btn, backgroundColor: colors.warning, color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
            onClick={() => setActiveModal('use')}
          >
            🔧 Record Usage
          </button>
          <button
            style={{ ...styles.btn, backgroundColor: colors.success, color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
            onClick={() => setActiveModal('return')}
          >
            ↩️ Engineer Return
          </button>
          <button
            style={{ ...styles.btn, ...styles.btnOutline }}
            onClick={() => setActiveModal('warranty')}
          >
            🔄 Warranty Return
          </button>
          <button
            style={{ ...styles.btn, backgroundColor: '#4338ca', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
            onClick={() => setActiveModal('directWarranty')}
          >
            🎁 Direct Warranty Issue
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
        {cspManagerMode ? (
          <div style={{ padding: '12px 16px', backgroundColor: colors.primaryLight, borderBottom: `1px solid ${colors.border}`, fontSize: '13px', color: colors.text }}>
            ℹ️ Manager access — approve/reject any engineer&apos;s Parts Request (Receive or Return).
          </div>
        ) : (
          <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}`, padding: '0 4px' }}>
            {tabs.map(tab => (
              <button key={tab.key} style={tabStyle(tab.key)} onClick={() => setActiveTab(tab.key)}>
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div style={{ padding: '16px' }}>

          {/* ── Stock Overview ── */}
          {!cspManagerMode && activeTab === 'overview' && (
            <>
              <div style={styles.filterBar}>
                <input
                  style={styles.filterInput}
                  placeholder="Search parts..."
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
                      <th style={styles.tableHeader}>Available Stock</th>
                      <th style={styles.tableHeader}>Min Stock</th>
                      <th style={styles.tableHeader}>Unit Price</th>
                      {engineers.map(eng => (
                        <th key={eng} style={styles.tableHeader}>{eng}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map(item => (
                      <tr key={item.id} style={styles.tableRow}>
                        <td style={styles.tableCell}>{item.part_code ?? item.item_code}</td>
                        <td style={styles.tableCell}>{item.item_name}</td>
                        <td
                          style={{ ...styles.tableCell, color: stockColor(item), fontWeight: 600, cursor: 'pointer' }}
                          title="Click to correct stock"
                          onClick={() => setAdjustTarget({ owner: 'MAIN', partId: item.id, ownerLabel: '🏢 Office Stock', partLabel: `${item.part_code ?? item.item_code ?? ''} ${item.item_name}`.trim(), currentQty: item.qty_in_stock })}
                        >
                          {item.qty_in_stock}
                        </td>
                        <td style={styles.tableCell}>{item.min_stock}</td>
                        <td style={styles.tableCell}>₹{item.unit_price}</td>
                        {engineers.map(eng => {
                          const stock = engStock.find(s => s.owner === eng && s.part_id === item.id);
                          return (
                            <td
                              key={eng}
                              style={{ ...styles.tableCell, cursor: 'pointer' }}
                              title="Click to correct stock"
                              onClick={() => setAdjustTarget({ owner: eng, partId: item.id, ownerLabel: `👷 ${eng}`, partLabel: `${item.part_code ?? item.item_code ?? ''} ${item.item_name}`.trim(), currentQty: stock ? stock.qty : 0 })}
                            >
                              {stock ? stock.qty : 0}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {filteredInventory.length === 0 && (
                      <tr>
                        <td colSpan={5 + engineers.length} style={styles.emptyMessage}>
                          No parts found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── Engineer Analysis ── */}
          {!cspManagerMode && activeTab === 'analysis' && (() => {
            const selectedPart = selectedPartId ? inventory.find(i => i.id === selectedPartId) : null;
            const partMatches = analysisPartQ
              ? inventory.filter(i =>
                i.item_name.toLowerCase().includes(analysisPartQ.toLowerCase()) ||
                (i.part_code ?? i.item_code ?? '').toLowerCase().includes(analysisPartQ.toLowerCase()))
                .slice(0, 10)
              : [];
            const clearFilters = () => { setAnalysisPartQ(''); setSelectedPartId(null); setAnalysisEngFilter(''); };

            return (
              <div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const, marginBottom: '16px', alignItems: 'flex-start' }}>
                  <div style={{ position: 'relative' as const }}>
                    <input
                      style={styles.filterInput}
                      placeholder="🔍 Filter by part code or name..."
                      value={analysisPartQ}
                      onChange={e => { setAnalysisPartQ(e.target.value); setSelectedPartId(null); }}
                    />
                    {analysisPartQ && !selectedPartId && partMatches.length > 0 && (
                      <div style={{ position: 'absolute' as const, top: '100%', left: 0, right: 0, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, maxHeight: '220px', overflowY: 'auto' as const, marginTop: '2px' }}>
                        {partMatches.map(p => {
                          const engCount = new Set(engStock.filter(s => s.part_id === p.id && s.qty > 0).map(s => s.owner)).size;
                          return (
                            <div key={p.id} onClick={() => { setSelectedPartId(p.id); setAnalysisPartQ(`${p.part_code ?? p.item_code ?? ''} ${p.item_name}`.trim()); }}
                              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', borderBottom: `1px solid ${colors.border}` }}
                              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff')}
                            >
                              {p.part_code ?? p.item_code} — {p.item_name} <span style={{ color: colors.textMuted }}>({engCount} eng)</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <select value={analysisEngFilter} onChange={e => setAnalysisEngFilter(e.target.value)} style={styles.filterInput}>
                    <option value="">Filter by Engineer — All</option>
                    {engineers.map(eng => <option key={eng} value={eng}>{eng}</option>)}
                  </select>
                  {(analysisPartQ || selectedPartId || analysisEngFilter) && (
                    <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={clearFilters}>✕ Clear Filters</button>
                  )}
                </div>

                {selectedPart ? (() => {
                  const officeQty = selectedPart.qty_in_stock || 0;
                  const rows = engineers
                    .map(eng => ({ eng, qty: engStock.find(s => s.owner === eng && s.part_id === selectedPart.id)?.qty || 0 }))
                    .filter(r => r.qty > 0)
                    .sort((a, b) => b.qty - a.qty);
                  const engTotal = rows.reduce((s, r) => s + r.qty, 0);
                  const grandTotal = officeQty + engTotal;
                  return (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ ...styles.card, textAlign: 'center' as const, cursor: 'pointer' }} onClick={() => setAdjustTarget({ owner: 'MAIN', partId: selectedPart.id, ownerLabel: '🏢 Office Stock', partLabel: `${selectedPart.part_code ?? selectedPart.item_code ?? ''} ${selectedPart.item_name}`.trim(), currentQty: officeQty })}>
                          <div style={{ fontSize: '20px', fontWeight: 700, color: colors.primary }}>{officeQty}</div>
                          <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '4px' }}>Office Stock</div>
                        </div>
                        <div style={{ ...styles.card, textAlign: 'center' as const }}>
                          <div style={{ fontSize: '20px', fontWeight: 700, color: colors.primary }}>{engTotal}</div>
                          <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '4px' }}>With Engineers</div>
                        </div>
                        <div style={{ ...styles.card, textAlign: 'center' as const }}>
                          <div style={{ fontSize: '20px', fontWeight: 700, color: colors.primary }}>{grandTotal}</div>
                          <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '4px' }}>Total Stock</div>
                        </div>
                      </div>
                      <div style={{ overflowX: 'auto' as const }}>
                        <table style={styles.table}>
                          <thead><tr><th style={styles.tableHeader}>Engineer</th><th style={styles.tableHeader}>Qty</th><th style={styles.tableHeader}>% of Total</th></tr></thead>
                          <tbody>
                            {rows.map(r => (
                              <tr key={r.eng} style={styles.tableRow}>
                                <td style={styles.tableCell}>{r.eng}</td>
                                <td style={{ ...styles.tableCell, fontWeight: 600, cursor: 'pointer' }} title="Click to correct stock" onClick={() => setAdjustTarget({ owner: r.eng, partId: selectedPart.id, ownerLabel: `👷 ${r.eng}`, partLabel: `${selectedPart.part_code ?? selectedPart.item_code ?? ''} ${selectedPart.item_name}`.trim(), currentQty: r.qty })}>{r.qty}</td>
                                <td style={styles.tableCell}>{grandTotal > 0 ? Math.round(r.qty / grandTotal * 100) : 0}%</td>
                              </tr>
                            ))}
                            {rows.length === 0 && (
                              <tr><td colSpan={3} style={styles.emptyMessage}>No engineers currently hold this part</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })() : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                    {engineers
                      .filter(eng => !analysisEngFilter || eng === analysisEngFilter)
                      .map(eng => {
                        const parts = engStock.filter(s => s.owner === eng);
                        const totalValue = parts.reduce((sum, s) => {
                          const inv = inventory.find(i => i.id === s.part_id);
                          return sum + s.qty * (inv?.unit_price || 0);
                        }, 0);
                        return { eng, parts, totalValue };
                      })
                      // index.html:10358 — engineer cards sorted by descending field value.
                      .sort((a, b) => b.totalValue - a.totalValue)
                      .map(({ eng, parts, totalValue }) => {
                        const initials = eng.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
                        return (
                          <div key={eng} style={styles.card}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                              <div style={{
                                width: '40px', height: '40px', borderRadius: '50%',
                                backgroundColor: colors.primary, color: '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '14px', fontWeight: 700, flexShrink: 0,
                              }}>
                                {initials}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '14px', color: colors.text }}>{eng}</div>
                                <div style={{ fontSize: '12px', color: colors.textMuted }}>
                                  Field Value: ₹{totalValue.toFixed(0)}
                                </div>
                              </div>
                            </div>
                            {parts.length === 0 ? (
                              <div style={{ fontSize: '12px', color: colors.textMuted }}>No parts assigned</div>
                            ) : (
                              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {parts.map(s => {
                                  const inv = inventory.find(i => i.id === s.part_id);
                                  return (
                                    <li key={s.id} style={{
                                      display: 'flex', justifyContent: 'space-between',
                                      padding: '4px 0', borderBottom: `1px solid ${colors.border}`,
                                      fontSize: '12px', color: colors.text,
                                    }}>
                                      <span>{inv?.item_name ?? s.part_id}</span>
                                      <span style={{ fontWeight: 600 }}>{s.qty}</span>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                    {engineers.length === 0 && (
                      <div style={styles.emptyMessage}>No engineers found</div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Pending Approvals ── */}
          {(cspManagerMode || activeTab === 'pending') && (
            pendingRequests.length === 0 ? (
              <div style={styles.emptyMessage}>No pending requests</div>
            ) : (
              <div style={{ overflowX: 'auto' as const }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.tableHeader}>Date</th>
                      <th style={styles.tableHeader}>Engineer</th>
                      <th style={styles.tableHeader}>Type</th>
                      <th style={styles.tableHeader}>Parts</th>
                      <th style={styles.tableHeader}>Notes</th>
                      <th style={styles.tableHeader}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRequests.map(req => {
                      const partsList = (req.parts || []).map(p => `${p.qty || 1}× ${p.part_name || p.part_id || '?'}`).join(', ');
                      return (
                        <tr key={req.id} style={styles.tableRow}>
                          <td style={styles.tableCell}>
                            {req.created_at ? new Date(req.created_at).toLocaleDateString() : '—'}
                          </td>
                          <td style={styles.tableCell}>{req.engineer_name}</td>
                          <td style={styles.tableCell}>{req.type || '—'}</td>
                          <td style={styles.tableCell}>{partsList || '—'}</td>
                          <td style={styles.tableCell}>{req.notes ?? '—'}</td>
                          <td style={styles.tableCell}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                style={{ ...styles.btn, ...styles.btnSm, backgroundColor: colors.success, color: '#fff', border: 'none' }}
                                onClick={async () => {
                                  const r = await approvePartRequest(req, approvedBy);
                                  if (!r.success) alert('⚠️ ' + (r.error || 'Approve failed'));
                                  onRefetch();
                                }}
                              >
                                ✅ Approve
                              </button>
                              <button
                                style={{ ...styles.btn, ...styles.btnSm, backgroundColor: colors.danger, color: '#fff', border: 'none' }}
                                onClick={async () => {
                                  await rejectPartRequest(req.id, approvedBy);
                                  onRefetch();
                                }}
                              >
                                ❌ Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ── Warranty Pending ── */}
          {!cspManagerMode && activeTab === 'warranty-pending' && (
            <WarrantyPendingTab inventory={inventory} />
          )}

          {/* ── Log ── */}
          {!cspManagerMode && activeTab === 'log' && (() => {
            const q = logSearch.toLowerCase();
            const filteredMovements = movements.filter(mv => {
              if (logTypeFilter && mv.type !== logTypeFilter) return false;
              const d = (mv.created_at || '').slice(0, 10);
              if (logFrom && d < logFrom) return false;
              if (logTo && d > logTo) return false;
              if (q) {
                const part = inventory.find(i => i.id === mv.part_id);
                const hay = [part?.item_name, mv.from_owner, mv.to_owner, mv.job_sheet, mv.notes, mv.created_by]
                  .filter(Boolean).join(' ').toLowerCase();
                if (!hay.includes(q)) return false;
              }
              return true;
            });
            return (
              <>
                <div style={{ ...styles.filterBar, marginBottom: '12px' }}>
                  <input style={styles.filterInput} placeholder="Search part, owner, job sheet, notes..." value={logSearch} onChange={e => setLogSearch(e.target.value)} />
                  <select style={styles.filterInput} value={logTypeFilter} onChange={e => setLogTypeFilter(e.target.value)}>
                    <option value="">All Types</option>
                    <option value="ISSUE">ISSUE</option>
                    <option value="USE">USE</option>
                    <option value="ENG_RETURN">ENG_RETURN</option>
                    <option value="WARRANTY_RETURN">WARRANTY_RETURN</option>
                    <option value="WARRANTY_DIRECT_IN">WARRANTY_DIRECT_IN</option>
                    <option value="ADJUST">ADJUST</option>
                  </select>
                  <input type="date" style={styles.filterInput} value={logFrom} onChange={e => setLogFrom(e.target.value)} />
                  <input type="date" style={styles.filterInput} value={logTo} onChange={e => setLogTo(e.target.value)} />
                </div>
                <div style={{ overflowX: 'auto' as const }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.tableHeader}>Date</th>
                        <th style={styles.tableHeader}>Type</th>
                        <th style={styles.tableHeader}>Part</th>
                        <th style={styles.tableHeader}>Qty</th>
                        <th style={styles.tableHeader}>From</th>
                        <th style={styles.tableHeader}>To</th>
                        <th style={styles.tableHeader}>Job Sheet</th>
                        <th style={styles.tableHeader}>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMovements.map(mv => {
                        const part = inventory.find(i => i.id === mv.part_id);
                        return (
                          <tr key={mv.id} style={styles.tableRow}>
                            <td style={styles.tableCell}>
                              {mv.created_at ? new Date(mv.created_at).toLocaleDateString() : '—'}
                            </td>
                            <td style={styles.tableCell}>
                              <span style={movementBadgeStyle(mv.type)}>{mv.type}</span>
                            </td>
                            <td style={styles.tableCell}>{part?.item_name ?? mv.part_id}</td>
                            <td style={styles.tableCell}>{mv.qty}</td>
                            <td style={styles.tableCell}>{mv.from_owner ?? '—'}</td>
                            <td style={styles.tableCell}>{mv.to_owner ?? '—'}</td>
                            <td style={styles.tableCell}>{mv.job_sheet ?? '—'}</td>
                            <td style={styles.tableCell}>{mv.notes ?? '—'}</td>
                          </tr>
                        );
                      })}
                      {filteredMovements.length === 0 && (
                        <tr>
                          <td colSpan={8} style={styles.emptyMessage}>No log entries</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Modals */}
      {!cspManagerMode && activeModal === 'issue' && (
        <IssueModal
          engineers={engineers}
          inventory={inventory}
          onSave={handleIssueSave}
          onClose={() => setActiveModal(null)}
        />
      )}
      {!cspManagerMode && activeModal === 'use' && (
        <UseModal
          engineers={engineers}
          engStock={engStock}
          inventory={inventory}
          onSave={handleUseSave}
          onClose={() => setActiveModal(null)}
        />
      )}
      {!cspManagerMode && activeModal === 'return' && (
        <ReturnModal
          mode="return"
          engineers={engineers}
          engStock={engStock}
          inventory={inventory}
          onSave={handleReturnSave}
          onClose={() => setActiveModal(null)}
        />
      )}
      {!cspManagerMode && activeModal === 'warranty' && (
        <ReturnModal
          mode="warranty"
          engineers={engineers}
          engStock={engStock}
          inventory={inventory}
          onSave={handleWarrantySave}
          onClose={() => setActiveModal(null)}
        />
      )}
      {!cspManagerMode && activeModal === 'directWarranty' && (
        <DirectWarrantyIssueModal
          engineers={engineers}
          inventory={inventory}
          onSave={handleDirectWarrantyIssueSave}
          onClose={() => setActiveModal(null)}
        />
      )}
      {adjustTarget && (
        <AdjustStockModal
          ownerLabel={adjustTarget.ownerLabel}
          partLabel={adjustTarget.partLabel}
          currentQty={adjustTarget.currentQty}
          onSave={handleAdjustSave}
          onClose={() => setAdjustTarget(null)}
        />
      )}
    </div>
  );
}