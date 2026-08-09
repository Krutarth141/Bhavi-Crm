'use client';

import { useState, useEffect, useCallback } from 'react';
import { ReorderItem } from '@/types/reorder';
import { fetchReorderInventory, setMinStock } from '@/services/reorderService';

export default function PartsReorderScreen() {
    const [items, setItems] = useState<ReorderItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [minModal, setMinModal] = useState<ReorderItem | null>(null);
    const [minVal, setMinVal] = useState('5');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setItems(await fetchReorderInventory());
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const critical = items.filter(p => (p.min_stock || 0) > 0 && (p.qty_in_stock || 0) <= p.min_stock);
    const low = items.filter(p => (p.min_stock || 0) > 0 && (p.qty_in_stock || 0) > p.min_stock && (p.qty_in_stock || 0) <= p.min_stock * 2);
    const noMin = items.filter(p => !(p.min_stock || 0));
    const reorderList = [...critical, ...low];

    const openMinModal = (p: ReorderItem) => { setMinModal(p); setMinVal(String(p.min_stock || 5)); };

    const handleSetMin = async () => {
        if (!minModal) return;
        const num = parseInt(minVal, 10);
        if (isNaN(num) || num < 0) { alert('Invalid number'); return; }
        setSaving(true);
        const r = await setMinStock(minModal.id, num);
        setSaving(false);
        if (r.success) { setMinModal(null); await load(); } else alert('Error: ' + r.error);
    };

    const shareReorderList = () => {
        if (!reorderList.length) { alert('No reorder needed!'); return; }
        let msg = `📦 *Parts Reorder List*\n📅 ${new Date().toLocaleDateString('en-IN')}\n\n`;
        if (critical.length) {
            msg += '🔴 *CRITICAL — Order Immediately:*\n';
            critical.forEach(p => { msg += `• ${p.item_name || ''} (Stock: ${p.qty_in_stock || 0}, Min: ${p.min_stock || 0})\n`; });
        }
        if (low.length) {
            msg += '\n🟡 *LOW STOCK — Order Soon:*\n';
            low.forEach(p => { msg += `• ${p.item_name || ''} (Stock: ${p.qty_in_stock || 0}, Min: ${p.min_stock || 0})\n`; });
        }
        msg += `\nTotal items to reorder: ${reorderList.length}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

    return (
        <div style={{ padding: '20px 24px', maxWidth: 900, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>📦 Parts Reorder Alert</h1>
                <button onClick={shareReorderList} style={{ background: '#25d366', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>📲 Share Reorder List</button>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                {[
                    { icon: '🔴', label: 'Critical (≤ min)', val: critical.length, color: '#ef4444' },
                    { icon: '🟡', label: 'Low (≤ 2× min)', val: low.length, color: '#f59e0b' },
                    { icon: '✅', label: 'OK', val: items.length - critical.length - low.length, color: '#10b981' },
                    { icon: '⚙️', label: 'No Min Set', val: noMin.length, color: '#9ca3af' },
                ].map(c => (
                    <div key={c.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 22 }}>{c.icon}</span>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: c.color }}>{c.val}</div>
                            <div style={{ fontSize: 11, color: '#6b7280' }}>{c.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</p>
                : reorderList.length === 0 ? <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>✅ All parts are adequately stocked!</div>
                    : (
                        <div style={{ display: 'grid', gap: 8 }}>
                            {reorderList.map(p => {
                                const qty = p.qty_in_stock || 0;
                                const min = p.min_stock || 0;
                                const isCritical = qty <= min;
                                const pct = min > 0 ? Math.min(100, Math.round(qty / (min * 2) * 100)) : 50;
                                return (
                                    <div key={p.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, borderLeft: `4px solid ${isCritical ? '#ef4444' : '#f59e0b'}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                            <div>
                                                <div style={{ fontSize: 14, fontWeight: 700 }}>{p.item_name || ''}</div>
                                                <div style={{ fontSize: 12, color: '#6b7280' }}>{p.part_code ? `Code: ${p.part_code}  |  ` : ''}{p.category || ''}</div>
                                            </div>
                                            <span style={{ background: isCritical ? '#fef2f2' : '#fffbeb', color: isCritical ? '#dc2626' : '#d97706', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>{isCritical ? '🔴 Critical' : '🟡 Low'}</span>
                                        </div>
                                        <div style={{ marginTop: 10, display: 'flex', gap: 24, alignItems: 'center' }}>
                                            <div><span style={{ fontSize: 11, color: '#9ca3af' }}>STOCK</span><div style={{ fontSize: 18, fontWeight: 800, color: isCritical ? '#ef4444' : '#f59e0b' }}>{qty}</div></div>
                                            <div><span style={{ fontSize: 11, color: '#9ca3af' }}>MIN</span><div style={{ fontSize: 18, fontWeight: 800, color: '#374151' }}>{min}</div></div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ background: '#f1f5f9', borderRadius: 4, height: 10 }}>
                                                    <div style={{ background: isCritical ? '#ef4444' : '#f59e0b', height: 10, borderRadius: 4, width: `${pct}%` }} />
                                                </div>
                                                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{pct}% of reorder level</div>
                                            </div>
                                        </div>
                                        <button onClick={() => openMinModal(p)} style={{ marginTop: 8, padding: '4px 10px', border: '1px solid #7c3aed', borderRadius: 6, color: '#7c3aed', background: '#fff', cursor: 'pointer', fontSize: 12 }}>⚙️ Set Min Stock</button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

            {minModal && (
                <div onClick={() => setMinModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 360, padding: 20 }}>
                        <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>⚙️ Set Minimum Stock</h2>
                        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>{minModal.item_name}</div>
                        <input type="number" min={0} value={minVal} onChange={e => setMinVal(e.target.value)} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box', marginBottom: 14 }} autoFocus />
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button onClick={() => setMinModal(null)} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                            <button onClick={handleSetMin} disabled={saving} style={{ padding: '8px 14px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}