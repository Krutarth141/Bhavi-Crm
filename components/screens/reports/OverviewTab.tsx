'use client';

import { useState } from 'react';
import { BarChartItem } from '@/types/reports';

interface TrendEntry {
    label: string;
    w: number;
    nw: number;
    closed: number;
    total: number;
}

interface OverviewTabProps {
    totalCalls: number;
    totalClosed: number;
    totalRevenue: number;
    closureRate: number;
    getTrendData: (view: 'monthly' | 'yearly') => [string, { w: number; nw: number; closed: number; total: number }][];
    callTypeChartData: BarChartItem[];
    statusChartData: BarChartItem[];
}

export default function OverviewTab({
    totalCalls,
    totalClosed,
    totalRevenue,
    closureRate,
    getTrendData,
    callTypeChartData,
    statusChartData,
}: OverviewTabProps) {
    const [trendView, setTrendView] = useState<'monthly' | 'yearly'>('monthly');
    const trendEntries = getTrendData(trendView);
    const maxV = Math.max(...trendEntries.map(([, d]) => d.total), 1);
    const BAR_H = 75;

    const hasNW = trendEntries.some(([, d]) => d.nw > 0);
    const activeTickets = totalCalls - totalClosed;

    return (
        <div>
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '18px' }}>
                <div className="kpi-card">
                    <div className="kpi-value">{totalCalls}</div>
                    <div className="kpi-label">Total Calls</div>
                </div>
                <div className="kpi-card" style={{ borderColor: 'var(--success)' }}>
                    <div className="kpi-value" style={{ color: 'var(--success)' }}>{totalClosed}</div>
                    <div className="kpi-label">✅ Closed</div>
                </div>
                <div className="kpi-card" style={{ borderColor: 'var(--primary)' }}>
                    <div className="kpi-value" style={{ color: 'var(--primary)' }}>
                        ₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                    <div className="kpi-label">💰 Revenue</div>
                </div>
                <div className="kpi-card" style={{ borderColor: '#7c3aed' }}>
                    <div className="kpi-value" style={{ color: '#7c3aed' }}>{closureRate}%</div>
                    <div className="kpi-label">📈 Closure Rate</div>
                </div>
            </div>

            {/* Trend Chart */}
            <div className="card" style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>📈 Ticket Trend</h3>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {(['monthly', 'yearly'] as const).map((v) => (
                            <button
                                key={v}
                                onClick={() => setTrendView(v)}
                                style={{
                                    padding: '4px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid',
                                    borderColor: trendView === v ? '#1d4ed8' : 'var(--border)',
                                    background: trendView === v ? '#1d4ed8' : 'transparent',
                                    color: trendView === v ? '#fff' : 'var(--text-muted)',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                {v === 'monthly' ? 'Monthly' : 'Yearly'}
                            </button>
                        ))}
                    </div>
                </div>

                {trendEntries.length === 0 ? (
                    <div style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>No data</div>
                ) : (
                    <>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px', height: '110px', paddingBottom: '2px' }}>
                            {trendEntries.map(([lbl, d]) => {
                                const wH = d.w ? Math.max(3, Math.round((d.w / maxV) * BAR_H)) : 0;
                                const nwH = d.nw ? Math.max(3, Math.round((d.nw / maxV) * BAR_H)) : 0;
                                const clH = d.closed ? Math.max(3, Math.round((d.closed / maxV) * BAR_H)) : 0;
                                return (
                                    <div key={lbl} style={{ flex: 1, minWidth: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                        <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>{d.total}</div>
                                        <div style={{ width: '100%', display: 'flex', gap: '1px', alignItems: 'flex-end', height: `${BAR_H}px` }}>
                                            {wH > 0 && (
                                                <div
                                                    title={`Warranty: ${d.w}`}
                                                    style={{ flex: 1, background: '#1d4ed8', borderRadius: '2px 2px 0 0', height: `${wH}px` }}
                                                />
                                            )}
                                            {nwH > 0 && (
                                                <div
                                                    title={`Non-Warranty: ${d.nw}`}
                                                    style={{ flex: 1, background: '#ff9800', borderRadius: '2px 2px 0 0', height: `${nwH}px` }}
                                                />
                                            )}
                                            {clH > 0 && (
                                                <div
                                                    title={`Closed: ${d.closed}`}
                                                    style={{ flex: 1, background: '#0e9f6e', borderRadius: '2px 2px 0 0', height: `${clH}px` }}
                                                />
                                            )}
                                        </div>
                                        <div style={{ fontSize: '9px', color: 'var(--text-muted)', textAlign: 'center', overflow: 'hidden', width: '100%', maxWidth: '48px' }}>
                                            {lbl}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {/* Legend */}
                        <div style={{ display: 'flex', gap: '12px', marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                            <span>
                                <span style={{ display: 'inline-block', width: '7px', height: '7px', background: '#1d4ed8', borderRadius: '1px', marginRight: '4px' }} />
                                Warranty
                            </span>
                            {hasNW && (
                                <span>
                                    <span style={{ display: 'inline-block', width: '7px', height: '7px', background: '#ff9800', borderRadius: '1px', marginRight: '4px' }} />
                                    Non-W
                                </span>
                            )}
                            <span>
                                <span style={{ display: 'inline-block', width: '7px', height: '7px', background: '#0e9f6e', borderRadius: '1px', marginRight: '4px' }} />
                                Closed
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* Call Type + Status side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="card">
                    <h3 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700 }}>📋 By Call Type</h3>
                    <MiniBarList items={callTypeChartData} />
                </div>
                <div className="card">
                    <h3 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700 }}>📊 By Status</h3>
                    <MiniBarList items={statusChartData} />
                </div>
            </div>
        </div>
    );
}

function MiniBarList({ items }: { items: BarChartItem[] }) {
    const max = Math.max(...items.map((d) => d.value), 1);
    const visible = items.filter((d) => d.value > 0);
    if (!visible.length) return <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No data</p>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {visible.map((d) => (
                <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '120px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.label}
                    </div>
                    <div style={{ flex: 1, background: 'var(--bg)', borderRadius: '4px', height: '18px', overflow: 'hidden' }}>
                        <div style={{ width: `${(d.value / max) * 100}%`, background: d.color || 'var(--primary)', height: '100%', borderRadius: '4px', minWidth: d.value > 0 ? '4px' : '0' }} />
                    </div>
                    <div style={{ width: '28px', fontSize: '11px', fontWeight: 700, color: 'var(--text)' }}>{d.value}</div>
                </div>
            ))}
        </div>
    );
}