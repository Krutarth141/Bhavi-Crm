'use client';

import { useState } from 'react';
import { WalkInEntry } from '@/types/walkin';
import { colors, styles } from '@/styles/ticketsStyles';
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
                  <span style={{ color: colors.primary }}>{entry.customer_name}</span>{' '}
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
    </div>
  );
}