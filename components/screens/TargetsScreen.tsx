'use client';

import { useState } from 'react';
import { useTargets } from '@/hooks/useTargets';
import { useEngineers } from '@/hooks/useEngineers';
import { TargetFormData, emptyTargetForm } from '@/types/targets';

const pct = (actual: number, target: number) => target ? Math.min(Math.round(actual / target * 100), 100) : 0;

export default function TargetsScreen() {
    const { targets, actual, loading, error, month, setMonth, save, remove } = useTargets();
    const { engineers } = useEngineers();
    const [form, setForm] = useState<TargetFormData>(emptyTargetForm);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const handleSave = async () => {
        if (!form.eng_name || !form.month) { alert('Engineer and month required'); return; }
        setSaving(true);
        const r = await save(form);
        if (r.success) { setForm(emptyTargetForm); setShowForm(false); }
        else alert('Error: ' + r.error);
        setSaving(false);
    };

    const handleEngSelect = (engId: string) => {
        const eng = (engineers as any[]).find((e: any) => e.id?.toString() === engId || e.user_id === engId);
        setForm(f => ({ ...f, eng_id: eng?.user_id || engId, eng_name: eng?.name || '' }));
    };

    const fieldStyle = { width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' as const, fontFamily: 'inherit' };

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>🎯 Engineer Targets</h1>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14 }} />
                    <button onClick={() => setShowForm(!showForm)} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                        {showForm ? '✕ Cancel' : '➕ Set Target'}
                    </button>
                </div>
            </div>

            {error && <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#dc2626', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>Error: {error}</div>}

            {showForm && (
                <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                    <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Set Monthly Target</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                        <div>
                            <label style={{ fontSize: 12, display: 'block', marginBottom: 3, fontWeight: 500 }}>Engineer *</label>
                            <select style={fieldStyle} value={form.eng_id} onChange={e => handleEngSelect(e.target.value)}>
                                <option value="">Select Engineer</option>
                                {(engineers as any[]).map((e: any) => <option key={e.id || e.user_id} value={e.user_id}>{e.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: 12, display: 'block', marginBottom: 3, fontWeight: 500 }}>Month *</label>
                            <input type="month" style={fieldStyle} value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, display: 'block', marginBottom: 3, fontWeight: 500 }}>Target Calls</label>
                            <input type="number" style={fieldStyle} value={form.target_calls} onChange={e => setForm(f => ({ ...f, target_calls: e.target.value }))} placeholder="e.g. 30" />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, display: 'block', marginBottom: 3, fontWeight: 500 }}>Target Revenue (₹)</label>
                            <input type="number" style={fieldStyle} value={form.target_amount} onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))} placeholder="e.g. 50000" />
                        </div>
                    </div>
                    <button onClick={handleSave} disabled={saving} style={{ marginTop: 12, padding: '8px 20px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
                        {saving ? 'Saving...' : '💾 Save Target'}
                    </button>
                </div>
            )}

            {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</p> :
                targets.length === 0 ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>No targets set for {month}</p> : (
                    <div style={{ display: 'grid', gap: 12 }}>
                        {targets.map(t => {
                            const a = actual[t.eng_name] || { calls: 0, revenue: 0 };
                            const callPct = pct(a.calls, t.target_calls || 0);
                            const revPct = pct(a.revenue, Number(t.target_amount) || 0);
                            return (
                                <div key={t.id} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 16 }}>{t.eng_name}</div>
                                            <div style={{ fontSize: 12, color: '#6b7280' }}>{t.month}</div>
                                        </div>
                                        <button onClick={() => remove(t.id)} style={{ padding: '3px 10px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>🗑️</button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                        <div>
                                            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                                                Calls: <strong>{a.calls}</strong> / {t.target_calls || 0}
                                                <span style={{ marginLeft: 8, color: callPct >= 100 ? '#059669' : callPct >= 70 ? '#d97706' : '#dc2626', fontWeight: 700 }}>{callPct}%</span>
                                            </div>
                                            <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: callPct + '%', background: callPct >= 100 ? '#059669' : callPct >= 70 ? '#d97706' : '#dc2626', borderRadius: 4, transition: 'width 0.3s' }} />
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                                                Revenue: <strong>₹{a.revenue.toLocaleString()}</strong> / ₹{Number(t.target_amount || 0).toLocaleString()}
                                                <span style={{ marginLeft: 8, color: revPct >= 100 ? '#059669' : revPct >= 70 ? '#d97706' : '#dc2626', fontWeight: 700 }}>{revPct}%</span>
                                            </div>
                                            <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: revPct + '%', background: revPct >= 100 ? '#059669' : revPct >= 70 ? '#d97706' : '#dc2626', borderRadius: 4, transition: 'width 0.3s' }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
        </div>
    );
}