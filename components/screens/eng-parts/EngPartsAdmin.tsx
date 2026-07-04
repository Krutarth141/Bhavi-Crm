'use client';
import { useState } from 'react';
import { EngStock, EngStockLog } from '@/types/engParts';
import { InventoryItem } from '@/types/inventory';
import IssueModal from './IssueModal';
import UseModal from './UseModal';
import ReturnModal from './ReturnModal';
import {
  issueToEngineer,
  recordUsage,
  engineerReturn,
  warrantyReturn,
  approveRequest,
  rejectRequest,
} from '@/services/engPartsService';
import { colors, styles } from '@/styles/ticketsStyles';

type AdminTabType = 'overview' | 'analysis' | 'pending' | 'log';
type ModalType = 'issue' | 'use' | 'return' | 'warranty' | null;

interface Props {
  inventory: InventoryItem[];
  engStock: EngStock[];
  engStockLog: EngStockLog[];
  engineers: string[];
  pendingRequests: EngStockLog[];
  onRefetch: () => void;
}

export default function EngPartsAdmin({
  inventory,
  engStock,
  engStockLog,
  engineers,
  pendingRequests,
  onRefetch,
}: Props) {
  const [activeTab, setActiveTab] = useState<AdminTabType>('overview');
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [search, setSearch] = useState('');

  // ── KPI values ───────────────────────────────────────────────────────────
  const officeStockValue = inventory.reduce(
    (sum, i) => sum + (i.qty_in_stock || 0) * (i.unit_price || 0),
    0
  );
  const fieldStockValue = engStock.reduce((sum, s) => {
    const inv = inventory.find(i => i.id === s.part_id);
    return sum + s.qty * (inv?.unit_price || 0);
  }, 0);

  // ── Log action badge ─────────────────────────────────────────────────────
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

  const stockColor = (item: InventoryItem) => {
    if (item.qty_in_stock <= 0) return colors.danger;
    if (item.qty_in_stock <= item.min_stock) return colors.warning;
    return colors.success;
  };

  // ── Filtered inventory for overview ─────────────────────────────────────
  const filteredInventory = inventory.filter(item =>
    item.item_name.toLowerCase().includes(search.toLowerCase())
  );

  // ── Modal save handlers ──────────────────────────────────────────────────
  const handleIssueSave = async (params: {
    part_id: string; eng_name: string; qty: number; ticket_id?: string; note?: string;
  }) => {
    await issueToEngineer(params);
    onRefetch();
  };

  const handleUseSave = async (params: {
    part_id: string; eng_name: string; qty: number; ticket_id?: string; note?: string;
  }) => {
    await recordUsage(params);
    onRefetch();
  };

  const handleReturnSave = async (params: {
    part_id: string; eng_name: string; qty: number; note?: string;
  }) => {
    await engineerReturn(params);
    onRefetch();
  };

  const handleWarrantySave = async (params: {
    part_id: string; eng_name: string; qty: number; note?: string;
  }) => {
    await warrantyReturn(params);
    onRefetch();
  };

  const tabs: { key: AdminTabType; label: string }[] = [
    { key: 'overview', label: 'Stock Overview' },
    { key: 'analysis', label: 'Engineer Analysis' },
    { key: 'pending', label: `Pending Approvals${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}` },
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

      {/* Action Buttons */}
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
      </div>

      {/* Tabs */}
      <div style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}`, padding: '0 4px' }}>
          {tabs.map(tab => (
            <button key={tab.key} style={tabStyle(tab.key)} onClick={() => setActiveTab(tab.key)}>
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '16px' }}>

          {/* ── Stock Overview ── */}
          {activeTab === 'overview' && (
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
                        <td style={{ ...styles.tableCell, color: stockColor(item), fontWeight: 600 }}>
                          {item.qty_in_stock}
                        </td>
                        <td style={styles.tableCell}>{item.min_stock}</td>
                        <td style={styles.tableCell}>₹{item.unit_price}</td>
                        {engineers.map(eng => {
                          const stock = engStock.find(s => s.owner === eng && s.part_id === item.id);
                          return (
                            <td key={eng} style={styles.tableCell}>
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
          {activeTab === 'analysis' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
              {engineers.map(eng => {
                const parts = engStock.filter(s => s.owner === eng);
                const totalValue = parts.reduce((sum, s) => {
                  const inv = inventory.find(i => i.id === s.part_id);
                  return sum + s.qty * (inv?.unit_price || 0);
                }, 0);
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

          {/* ── Pending Approvals ── */}
          {activeTab === 'pending' && (
            pendingRequests.length === 0 ? (
              <div style={styles.emptyMessage}>No pending requests</div>
            ) : (
              <div style={{ overflowX: 'auto' as const }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.tableHeader}>Date</th>
                      <th style={styles.tableHeader}>Engineer</th>
                      <th style={styles.tableHeader}>Part</th>
                      <th style={styles.tableHeader}>Qty</th>
                      <th style={styles.tableHeader}>Note</th>
                      <th style={styles.tableHeader}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRequests.map(log => {
                      const part = inventory.find(i => i.id === log.part_id);
                      return (
                        <tr key={log.id} style={styles.tableRow}>
                          <td style={styles.tableCell}>
                            {new Date(log.created_at).toLocaleDateString()}
                          </td>
                          <td style={styles.tableCell}>{log.eng_name}</td>
                          <td style={styles.tableCell}>{part?.item_name ?? log.part_id}</td>
                          <td style={styles.tableCell}>{log.qty}</td>
                          <td style={styles.tableCell}>{log.note ?? '—'}</td>
                          <td style={styles.tableCell}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                style={{ ...styles.btn, ...styles.btnSm, backgroundColor: colors.success, color: '#fff', border: 'none' }}
                                onClick={async () => {
                                  await approveRequest(log.id, log.part_id, log.eng_name, log.qty);
                                  onRefetch();
                                }}
                              >
                                ✅ Approve
                              </button>
                              <button
                                style={{ ...styles.btn, ...styles.btnSm, backgroundColor: colors.danger, color: '#fff', border: 'none' }}
                                onClick={async () => {
                                  await rejectRequest(log.id);
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

          {/* ── Log ── */}
          {activeTab === 'log' && (
            <div style={{ overflowX: 'auto' as const }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.tableHeader}>Date</th>
                    <th style={styles.tableHeader}>Action</th>
                    <th style={styles.tableHeader}>Engineer</th>
                    <th style={styles.tableHeader}>Part</th>
                    <th style={styles.tableHeader}>Qty</th>
                    <th style={styles.tableHeader}>Ticket ID</th>
                    <th style={styles.tableHeader}>Note</th>
                    <th style={styles.tableHeader}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {engStockLog.map(log => {
                    const part = inventory.find(i => i.id === log.part_id);
                    return (
                      <tr key={log.id} style={styles.tableRow}>
                        <td style={styles.tableCell}>
                          {new Date(log.created_at).toLocaleDateString()}
                        </td>
                        <td style={styles.tableCell}>
                          <span style={actionBadgeStyle(log.action)}>{log.action}</span>
                        </td>
                        <td style={styles.tableCell}>{log.eng_name}</td>
                        <td style={styles.tableCell}>{part?.item_name ?? log.part_id}</td>
                        <td style={styles.tableCell}>{log.qty}</td>
                        <td style={styles.tableCell}>{log.ticket_id ?? '—'}</td>
                        <td style={styles.tableCell}>{log.note ?? '—'}</td>
                        <td style={styles.tableCell}>
                          {log.status ? (
                            <span style={statusBadgeStyle(log.status)}>{log.status}</span>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {engStockLog.length === 0 && (
                    <tr>
                      <td colSpan={8} style={styles.emptyMessage}>No log entries</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {activeModal === 'issue' && (
        <IssueModal
          engineers={engineers}
          inventory={inventory}
          onSave={handleIssueSave}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'use' && (
        <UseModal
          engineers={engineers}
          engStock={engStock}
          inventory={inventory}
          onSave={handleUseSave}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'return' && (
        <ReturnModal
          mode="return"
          engineers={engineers}
          engStock={engStock}
          inventory={inventory}
          onSave={handleReturnSave}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'warranty' && (
        <ReturnModal
          mode="warranty"
          engineers={engineers}
          engStock={engStock}
          inventory={inventory}
          onSave={handleWarrantySave}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
}
