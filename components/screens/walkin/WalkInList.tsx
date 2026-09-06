'use client';

import { useState } from 'react';
import { WalkInEntry } from '@/types/walkin';
import { colors, styles } from '@/styles/ticketsStyles';
import { updateWalkIn } from '@/services/walkInService';
import CreateJobModal from './CreateJobModal';

interface WalkInListProps {
  entries: WalkInEntry[];
  onEdit: (entry: WalkInEntry) => void;
  onDeparture: (entry: WalkInEntry) => void;
  onJobCreated: () => Promise<void>;
  busyId?: string | null;
}

const TYPE_COLORS: Record<string, string> = {
  Inward: '#1d4ed8', Outward: '#0e9f6e', Other: '#7c3aed', Purchase: '#d97706', 'For Checking Only': '#0369a1',
};

// Mirrors HTML's renderWalkInList (index.html:16984-17029) — Edit / Set
// Departure / Create Job actions with each product's brand/model/type/
// warranty shown inline (no Delete here; that lives only in the Walk-in
// Report screen).
export default function WalkInList({ entries, onEdit, onDeparture, onJobCreated, busyId }: WalkInListProps) {
  const [jobEntry, setJobEntry] = useState<WalkInEntry | null>(null);

  // Click-to-edit customer name — mirrors HTML's viewWalkInCustomer /
  // saveWalkInCustomer (index.html:17648-17707), same pattern reused from
  // WalkInReportScreen.tsx's openCustEdit/saveCustEdit.
  const [editCust, setEditCust] = useState<WalkInEntry | null>(null);
  const [custForm, setCustForm] = useState({ name: '', mobile: '', address: '', city: '', state: '', pin: '' });
  const [custSaving, setCustSaving] = useState(false);

  const openCustEdit = (entry: WalkInEntry) => {
    setEditCust(entry);
    setCustForm({
      name: entry.customer_name || '', mobile: entry.mobile || '', address: entry.address || '',
      city: entry.city || '', state: entry.state || '', pin: entry.pin || '',
    });
  };
  const saveCustEdit = async () => {
    if (!editCust) return;
    if (!custForm.name.trim()) { alert('Customer name required'); return; }
    setCustSaving(true);
    const r = await updateWalkIn(editCust.id, {
      customer_name: custForm.name.trim(), mobile: custForm.mobile.trim(), address: custForm.address.trim(),
      city: custForm.city.trim(), state: custForm.state.trim(), pin: custForm.pin.trim(),
    });
    setCustSaving(false);
    if (!r.success) { alert('Error saving: ' + r.error); return; }
    setEditCust(null);
    await onJobCreated(); // shared refresh callback from the parent (WalkInScreen's refreshLists)
  };

  const hasService = (entry: WalkInEntry) =>
    (entry.products || []).some((p) => p.type === 'Inward' || p.type === 'For Checking Only');
  const hasPurchase = (entry: WalkInEntry) => (entry.products || []).some((p) => p.type === 'Purchase');

  if (entries.length === 0) {
    return <div style={styles.emptyMessage}>📭 No walk-ins today</div>;
  }

  return (
    <div>
      {entries.map((entry) => {
        const borderColor = hasPurchase(entry) ? '#d97706' : hasService(entry) ? '#1d4ed8' : '#0e9f6e';
        return (
          <div
            key={entry.id}
            style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', marginBottom: 8, borderLeft: `3px solid ${borderColor}` }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {entry.token_no && (
                    <span style={{ background: '#1d4ed8', color: '#fff', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6, marginRight: 8 }}>
                      #{entry.token_no}
                    </span>
                  )}
                  <span onClick={() => openCustEdit(entry)} style={{ cursor: 'pointer', color: colors.primary, textDecoration: 'underline' }}>{entry.customer_name}</span>{' '}
                  <span style={{ fontSize: 12, color: colors.textMuted }}>{entry.mobile}</span>{' '}
                  {entry.job_id && (
                    <span style={{ background: '#d1fae5', color: '#065f46', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>
                      ✅ {entry.job_id}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  🕐 In: <b>{entry.arrival_time}</b>
                  {entry.departure_time ? (
                    <> &nbsp;|&nbsp; Out: <b>{entry.departure_time}</b></>
                  ) : (
                    <> &nbsp;|&nbsp; <span style={{ color: '#f59e0b' }}>Still in office</span></>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                {hasService(entry) && !entry.job_id && (
                  <button
                    onClick={() => setJobEntry(entry)}
                    style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                  >
                    🔧 Create Job
                  </button>
                )}
                <button
                  onClick={() => onEdit(entry)}
                  style={{ background: '#e0f2fe', color: '#1d4ed8', border: 'none', borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer' }}
                >
                  ✏️ Edit
                </button>
                {!entry.departure_time ? (
                  <button
                    onClick={() => onDeparture(entry)}
                    disabled={busyId === entry.id}
                    style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer', opacity: busyId === entry.id ? 0.6 : 1 }}
                  >
                    ⏰ Set Departure
                  </button>
                ) : (
                  <span style={{ fontSize: 11, color: '#065f46', background: '#d1fae5', padding: '3px 8px', borderRadius: 99 }}>
                    Out: {entry.departure_time}
                  </span>
                )}
              </div>
            </div>
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(entry.products || []).map((p, idx) => {
                const typeColor = TYPE_COLORS[p.type] || '#7c3aed';
                const wLabel = p.type === 'Purchase' ? (p.subtype || '') : p.type === 'For Checking Only' ? (p.subtype || p.warranty || '') : p.warranty;
                const isPositive = wLabel === 'In Warranty' || wLabel === 'Warranty';
                return (
                  <div key={idx} style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 8, padding: '6px 10px', fontSize: 12 }}>
                    <span style={{ fontWeight: 600 }}>{p.brand ? `${p.brand} ` : ''}{p.model}</span>{' '}
                    <span style={{ background: '#e0f2fe', color: typeColor, padding: '1px 6px', borderRadius: 99, fontSize: 10, fontWeight: 600 }}>
                      {p.type}
                    </span>
                    {wLabel && (
                      <span style={{ marginLeft: 4, background: isPositive ? '#d1fae5' : '#fee2e2', color: isPositive ? '#065f46' : '#991b1b', padding: '1px 6px', borderRadius: 99, fontSize: 10, fontWeight: 600 }}>
                        {wLabel}
                      </span>
                    )}
                    {p.remarks && <span style={{ color: colors.textMuted }}> — {p.remarks}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {jobEntry && (
        <CreateJobModal entry={jobEntry} onClose={() => setJobEntry(null)} onCreated={onJobCreated} />
      )}

      {editCust && (
        <div style={styles.modalOverlay} onClick={() => setEditCust(null)}>
          <div style={{ ...styles.modal, maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>👤 Customer Details</h2>
              <button style={styles.closeBtn} onClick={() => setEditCust(null)}>✕</button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={styles.formLabel}>CUSTOMER NAME</label>
                <input value={custForm.name} onChange={(e) => setCustForm((p) => ({ ...p, name: e.target.value }))} style={styles.formInput} />
              </div>
              <div>
                <label style={styles.formLabel}>MOBILE NO</label>
                <input value={custForm.mobile} onChange={(e) => setCustForm((p) => ({ ...p, mobile: e.target.value }))} style={styles.formInput} />
              </div>
              <div>
                <label style={styles.formLabel}>ADDRESS</label>
                <input value={custForm.address} onChange={(e) => setCustForm((p) => ({ ...p, address: e.target.value }))} style={styles.formInput} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={styles.formLabel}>CITY</label>
                  <input value={custForm.city} onChange={(e) => setCustForm((p) => ({ ...p, city: e.target.value }))} style={styles.formInput} />
                </div>
                <div>
                  <label style={styles.formLabel}>STATE</label>
                  <input value={custForm.state} onChange={(e) => setCustForm((p) => ({ ...p, state: e.target.value }))} style={styles.formInput} />
                </div>
                <div>
                  <label style={styles.formLabel}>PIN CODE</label>
                  <input value={custForm.pin} onChange={(e) => setCustForm((p) => ({ ...p, pin: e.target.value }))} style={styles.formInput} />
                </div>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={() => setEditCust(null)}>Cancel</button>
              <button style={{ ...styles.btn, ...styles.btnPrimary, opacity: custSaving ? 0.7 : 1 }} onClick={saveCustEdit} disabled={custSaving}>
                {custSaving ? 'Saving...' : '💾 Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}