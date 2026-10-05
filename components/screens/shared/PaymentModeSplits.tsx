'use client';
import { PaymentSplit } from '@/lib/paymentSplits';

interface Props {
  total: number;
  splits: PaymentSplit[];
  onChange: (splits: PaymentSplit[]) => void;
}

const fieldStyle = { border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', fontSize: 13, outline: 'none' };

// Mirrors HTML's pconfAddSplitRow/pconfValidateSplits (index.html:18757,
// 18773-18797) — one or more (mode, amount) rows that must add up to
// `total`. Starts with a single pre-filled row (no split needed) by
// default; "➕ Add Payment Mode" lets the amount be split across modes,
// e.g. ₹5569 as ₹5000 Cash + ₹569 Online.
export default function PaymentModeSplits({ total, splits, onChange }: Props) {
  const addRow = () => onChange([...splits, { mode: '', amount: 0 }]);
  const removeRow = (i: number) => onChange(splits.filter((_, idx) => idx !== i));
  const updateRow = (i: number, patch: Partial<PaymentSplit>) => onChange(splits.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const sum = splits.reduce((a, s) => a + (Number(s.amount) || 0), 0);
  const mismatch = Math.round(total - sum);

  return (
    <div>
      {splits.map((s, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
          <select value={s.mode} onChange={(e) => updateRow(i, { mode: e.target.value })} style={{ ...fieldStyle, flex: 1.2 }}>
            <option value="">— Mode —</option>
            <option value="Cash">💵 Cash</option>
            <option value="Online">💻 Online</option>
            <option value="Check">📋 Cheque</option>
            <option value="Card">💳 Card</option>
          </select>
          <input
            type="number"
            placeholder="Amount"
            value={s.amount || ''}
            onChange={(e) => updateRow(i, { amount: Number(e.target.value) || 0 })}
            style={{ ...fieldStyle, flex: 1 }}
          />
          {i > 0 ? (
            <button type="button" onClick={() => removeRow(i)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 16, width: 28 }}>✕</button>
          ) : (
            <span style={{ width: 28 }} />
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        style={{ marginTop: 6, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
      >
        ➕ Add Payment Mode (Split)
      </button>
      {mismatch !== 0 && (
        <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 700, marginTop: 6 }}>
          {mismatch > 0 ? `⚠️ ₹${mismatch} still unaccounted for.` : `⚠️ ₹${Math.abs(mismatch)} over the total.`}
        </div>
      )}
    </div>
  );
}
