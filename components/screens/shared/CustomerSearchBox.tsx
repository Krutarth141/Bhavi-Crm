'use client';
import { useRef, useState } from 'react';
import { Customer } from '@/types/customers';
import { searchCustomersLive } from '@/services/customerService';

interface Props {
  onSelect: (c: Customer) => void;
}

// Mirrors HTML's "Customer Search" box on the New Call form (index.html:406-414,
// 5481-5539) — type Mobile / Name / Serial No, pick a match, the rest of the
// form auto-fills. Missing this made engineers re-type customer details from
// scratch, which is what led to mismatched serial/customer data and duplicate
// calls being logged.
export default function CustomerSearchBox({ onSelect }: Props) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = (value: string) => {
    setQ(value);
    setSelected(null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!value || value.length < 2) { setResults([]); setSearched(false); return; }
    timeoutRef.current = setTimeout(async () => {
      try {
        const data = await searchCustomersLive(value);
        setResults(data);
        setSearched(true);
      } catch (err) {
        console.error(err);
      }
    }, 400);
  };

  const clear = () => {
    setQ(''); setResults([]); setSearched(false); setSelected(null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const pick = (c: Customer) => {
    setSelected(c);
    setResults([]);
    onSelect(c);
  };

  return (
    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 12, fontSize: 13 }}>
      <b>Customer Search</b> — Mobile No, Name, or Serial No to search
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input
          type="text"
          value={q}
          onChange={(e) => runSearch(e.target.value)}
          placeholder="Mobile / Name / Serial No..."
          style={{ flex: 1, border: '1px solid #bfdbfe', borderRadius: 8, padding: '7px 12px', fontSize: 13, outline: 'none' }}
        />
        <button type="button" onClick={clear} style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          Clear
        </button>
      </div>
      <div style={{ marginTop: 8 }}>
        {selected ? (
          <div style={{ color: '#059669', fontSize: 13 }}>
            ✅ Selected: <b>{selected.cname}</b> | {selected.mobile}
          </div>
        ) : searched && !results.length ? (
          <div style={{ fontSize: 12, color: '#64748b' }}>No customer found</div>
        ) : (
          results.map((c, i) => (
            <div
              key={`${c.mobile}-${c.cname}-${i}`}
              onClick={() => pick(c)}
              style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', marginTop: 6, cursor: 'pointer', fontSize: 13 }}
            >
              <b>{c.cname}</b> | 📞 {c.mobile} | Serial: {c.serial} | Model: {c.model || '-'}
              <span style={{ float: 'right', color: '#2563eb', fontSize: 12 }}>Click to select →</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
