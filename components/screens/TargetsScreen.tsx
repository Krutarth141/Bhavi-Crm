'use client';

import { useState, useEffect } from 'react';
import { useTargets } from '@/hooks/useTargets';
import { useEngineers } from '@/hooks/useEngineers';

const pct = (actual: number, target: number) => target ? Math.min(Math.round(actual / target * 100), 100) : 0;

export default function TargetsScreen() {
    const { targets, actual, loading, error, month, setMonth, save } = useTargets();
    const { engineers } = useEngineers();
    const [saving, setSaving] = useState<string | null>(null);
    // Mirrors HTML's "Set Monthly Targets" table — one editable row per
    // active engineer (not just engineers who already have a target).
    const [rowInputs, setRowInputs] = useState<Record<string, { calls: string; amount: string }>>({});

    useEffect(() => {
        const map: Record<string, { calls: string; amount: string }> = {};
        (engineers as any[]).forEach((e: any) => {
            const t = targets.find((x) => x.eng_id === (e.user_id || e.eng_id));
            map[e.user_id || e.eng_id] = {
                calls: t?.target_calls != null ? String(t.target_calls) : '',
                amount: t?.target_amount != null ? String(t.target_amount) : '',
            };
        });
        setRowInputs(map);
    }, [engineers, targets]);

    const handleSaveRow = async (eng: any) => {
        const engId = eng.user_id || eng.eng_id;
        const row = rowInputs[engId] || { calls: '', amount: '' };
        setSaving(engId);
        const r = await save({ eng_id: engId, eng_name: eng.name, month, target_calls: row.calls, target_amount: row.amount });
        setSaving(null);
        if (!r.success) alert('Error: ' + r.error);
    };

    const fieldStyle = { padding: '5px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', width: 110, boxSizing: 'border-box' as const, fontFamily: 'inherit' };

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>🎯 Engineer Targets</h1>
                <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14 }} />
            </div>

            {error && <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#dc2626', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>Error: {error}</div>}

            {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</p> : (
                <>
                    {/* Set Monthly Targets — every active engineer, editable inline */}
                    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 24 }}>
                        <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#374151' }}>⚙️ Set Monthly Targets — {month}</h3>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: '#f9fafb' }}>
                                        <th style={{ padding: 8, textAlign: 'left' }}>Engineer</th>
                                        <th style={{ padding: 8, textAlign: 'left' }}>Call Target</th>
                                        <th style={{ padding: 8, textAlign: 'left' }}>Revenue Target (₹)</th>
                                        <th style={{ padding: 8, textAlign: 'left' }}>Save</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(engineers as any[]).map((e: any) => {
                                        const engId = e.user_id || e.eng_id;
                                        const row = rowInputs[engId] || { calls: '', amount: '' };
                                        return (
                                            <tr key={engId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <td style={{ padding: 8, fontWeight: 600 }}>{e.name}</td>
                                                <td style={{ padding: 8 }}>
                                                    <input type="number" min={0} placeholder="e.g. 30" style={fieldStyle} value={row.calls}
                                                        onChange={ev => setRowInputs(r => ({ ...r, [engId]: { ...row, calls: ev.target.value } }))} />
                                                </td>
                                                <td style={{ padding: 8 }}>
                                                    <input type="number" min={0} placeholder="e.g. 50000" style={fieldStyle} value={row.amount}
                                                        onChange={ev => setRowInputs(r => ({ ...r, [engId]: { ...row, amount: ev.target.value } }))} />
                                                </td>
                                                <td style={{ padding: 8 }}>
                                                    <button onClick={() => handleSaveRow(e)} disabled={saving === engId} style={{ padding: '5px 12px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, opacity: saving === engId ? 0.6 : 1 }}>
                                                        {saving === engId ? 'Saving...' : 'Save'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Achievement Report — every active engineer, "no target set" shown when missing */}
                    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
                        <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#374151' }}>📊 Achievement Report — {month}</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
                            {(engineers as any[]).map((e: any) => {
                                const engId = e.user_id || e.eng_id;
                                const t = targets.find((x) => x.eng_id === engId);
                                const a = actual[engId] || { calls: 0, revenue: 0 };
                                const callTarget = Number(t?.target_calls) || 0;
                                const revTarget = Number(t?.target_amount) || 0;
                                const callPct = pct(a.calls, callTarget);
                                const revPct = pct(a.revenue, revTarget);
                                const barC = callPct >= 80 ? '#0e9f6e' : callPct >= 50 ? '#f59e0b' : '#f05252';
                                const emoji = callPct >= 100 ? '🏆' : callPct >= 80 ? '🔥' : callPct >= 50 ? '💪' : '🎯';
                                return (
                                    <div key={engId} style={{ background: '#fff', borderRadius: 12, padding: 14, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>{emoji} {e.name}</div>
                                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Calls Closed</div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <span style={{ fontWeight: 700, fontSize: 18, color: barC }}>{a.calls}</span>
                                            <span style={{ fontSize: 13, color: '#64748b' }}>{callTarget ? `/ ${callTarget}` : ' — no target set'}</span>
                                        </div>
                                        {callTarget > 0 && (
                                            <div style={{ background: '#f1f5f9', borderRadius: 99, height: 10, overflow: 'hidden', marginBottom: 8 }}>
                                                <div style={{ background: barC, height: '100%', width: `${callPct}%`, borderRadius: 99 }} />
                                            </div>
                                        )}
                                        {revTarget > 0 && (
                                            <>
                                                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Revenue</div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                    <span style={{ fontWeight: 700, fontSize: 15, color: '#065f46' }}>₹{Math.round(a.revenue).toLocaleString()}</span>
                                                    <span style={{ fontSize: 12, color: '#64748b' }}>/ ₹{revTarget.toLocaleString()}</span>
                                                </div>
                                                <div style={{ background: '#f1f5f9', borderRadius: 99, height: 10, overflow: 'hidden' }}>
                                                    <div style={{ background: '#0e9f6e', height: '100%', width: `${revPct}%`, borderRadius: 99 }} />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}