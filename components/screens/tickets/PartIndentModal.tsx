'use client';

import { useState } from 'react';
import { searchPartsForIndent, savePartIndent, PartSearchResult } from '@/services/partIndentService';
import { TicketSpare } from '@/types/tickets';

interface IndentTicket {
    id: string;
    cname?: string;
    model?: string;
    call_type?: string;
    service_type?: string;
    warranty_coverage?: string;
    rerepair?: boolean;
    rerepair_foc?: boolean;
    service_charges?: number;
    spares?: TicketSpare[];
    timeline?: any[];
}

interface Props {
    ticket: IndentTicket;
    byUser: string;
    isEngineerOnSite: boolean;
    onClose: () => void;
    onDone: (newStatus: string) => void;
}

export default function PartIndentModal({ ticket, byUser, isEngineerOnSite, onClose, onDone }: Props) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PartSearchResult[]>([]);
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [stock, setStock] = useState<number | null>(null);
    const [qty, setQty] = useState('1');
    const [note, setNote] = useState('');
    const [addedCount, setAddedCount] = useState(0);
    const [saving, setSaving] = useState(false);
    // Warranty/Chargeable prompt (index.html:7468-7484, askWarrantyOrChargeable)
    // — shown when a Consumable-flagged part is added on a Warranty call that
    // isn't already Out of Coverage. Holds the in-flight save's args so the
    // chosen answer can re-drive savePartIndent.
    const [chargePrompt, setChargePrompt] = useState<{ addAnother: boolean; partLabel: string } | null>(null);

    const handleSearch = async (v: string) => {
        setQuery(v); setCode('');
        if (!v || v.length < 2) { setResults([]); return; }
        setResults(await searchPartsForIndent(v, isEngineerOnSite, byUser));
    };

    const selectPart = (p: PartSearchResult) => {
        setCode(p.code); setName(p.name); setStock(p.stock); setResults([]); setQuery(p.code || p.name);
    };

    const save = async (addAnother: boolean, chargeableChoice?: boolean) => {
        if (!code || !name) { alert('Please select a part'); return; }
        const q = parseInt(qty, 10) || 1;
        setSaving(true);
        const r = await savePartIndent(ticket, { code, name, qty: q, note }, byUser, isEngineerOnSite, chargeableChoice);
        setSaving(false);
        if (r.needsChargeableChoice) {
            setChargePrompt({ addAnother, partLabel: r.partLabel || name || code });
            return;
        }
        if (!r.success) { alert('Error: ' + r.error); return; }
        if (addAnother) {
            setAddedCount((c) => c + 1);
            setQuery(''); setCode(''); setName(''); setStock(null); setQty('1'); setNote('');
            alert('✅ Part added! Add another or click Done.');
        } else {
            const statusMsg = r.newStatus === 'Pending Engineer Stock'
                ? 'Part indented. Company has stock — ask admin to issue to your bag, then close the call.'
                : r.newStatus === 'Pending Parts'
                    ? 'Part indented. Part not in stock anywhere — waiting for order.'
                    : `Parts requested! Status → ${r.newStatus}`;
            alert(statusMsg);
            onDone(r.newStatus || '');
        }
    };

    const resolveChargePrompt = (chargeable: boolean) => {
        if (!chargePrompt) return;
        const { addAnother } = chargePrompt;
        setChargePrompt(null);
        save(addAnother, chargeable);
    };

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: 17 }}>📦 Request Part{addedCount > 0 ? ` (${addedCount} added)` : ''}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
                    {/* index.html:570-574,7427 — ticket-context box (#part-req-info) */}
                    <div style={{ background: '#f8fafc', borderRadius: 10, padding: 10, marginBottom: 12, fontSize: 13 }}>
                        <b>{ticket.id}</b> | {ticket.cname || '-'} | {ticket.model || '-'} | {ticket.call_type || '-'} | {ticket.service_type || '-'}
                    </div>
                    <div style={{ marginBottom: 10, position: 'relative' }}>
                        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Part Code / Name</label>
                        <input type="text" value={query} onChange={(e) => handleSearch(e.target.value)} placeholder="Search part code or name..." style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box' }} autoComplete="off" />
                        {results.length > 0 && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, marginTop: 4, maxHeight: 200, overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                {results.map((p, i) => (
                                    <div key={i} onClick={() => selectPart(p)} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{p.code || '—'} — {p.name}</span>
                                        <span style={{ fontSize: 11, color: p.stock > 0 ? '#059669' : '#dc2626' }}>{isEngineerOnSite ? 'Your Bag' : 'Stock'}: {p.stock}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Available Stock</label>
                            <input type="text" value={stock === null ? '' : String(stock)} readOnly style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, background: '#f8fafc', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Required Qty</label>
                            <input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box' }} />
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Note</label>
                        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason/note" style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box' }} />
                    </div>
                </div>
                <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={onClose} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                    <button onClick={() => save(true)} disabled={saving} style={{ padding: '8px 14px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>➕ Save &amp; Add Another</button>
                    <button onClick={() => save(false)} disabled={saving} style={{ flex: 1, padding: '8px 14px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : '📦 Done'}</button>
                </div>
            </div>
            {/* Warranty/Chargeable prompt — index.html:7468-7484 askWarrantyOrChargeable */}
            {chargePrompt && (
                <div onClick={(e) => e.stopPropagation()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 10050, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: 14, padding: 22, width: 360, maxWidth: '92vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>⚠️ {chargePrompt.partLabel}</h3>
                        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                            This part can be either free (genuine Canon defect) or chargeable (customer-caused damage). Which applies to THIS call?
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <button onClick={() => resolveChargePrompt(false)} style={{ padding: 12, background: '#f0fdf4', border: '1.5px solid #059669', borderRadius: 10, color: '#059669', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>🛡️ Under Warranty (Free)</button>
                            <button onClick={() => resolveChargePrompt(true)} style={{ padding: 12, background: '#fef2f2', border: '1.5px solid #dc2626', borderRadius: 10, color: '#dc2626', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>💰 Chargeable (Customer Pays)</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}