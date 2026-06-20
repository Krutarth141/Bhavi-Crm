'use client';

import { Ticket } from '@/types/reports';
import { STATUS_OPTIONS, STATUS_COLORS } from '@/types/reports';

interface TasksTabProps {
    filtered: Ticket[];
    engineers: string[];
}

export default function TasksTab({ filtered, engineers }: TasksTabProps) {
    const activeStatuses = ['Pending Allocation', 'Assigned', 'In Progress', 'Pending Parts', 'Pending Repair Carry In', 'Pending Repair On Site', 'Pending Customer Approval', 'Customer Approved'];
    const activeTickets = filtered.filter((t) => activeStatuses.includes(t.status));
    const pending = filtered.filter((t) => t.status === 'Pending Allocation');
    const assigned = filtered.filter((t) => t.status === 'Assigned');
    const inProgress = filtered.filter((t) => t.status === 'In Progress');
    const pendingParts = filtered.filter((t) => t.status === 'Pending Parts');

    // Engineer workload
    const engLoad: Record<string, number> = {};
    activeTickets.forEach((t) => {
        const name = t.assigned_name || 'Unassigned';
        engLoad[name] = (engLoad[name] || 0) + 1;
    });
    const sortedEng = Object.entries(engLoad).sort((a, b) => b[1] - a[1]);

    return (
        <div>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '18px' }}>
                <div className="kpi-card" style={{ borderColor: '#ff9800' }}>
                    <div className="kpi-value" style={{ color: '#ff9800' }}>{pending.length}</div>
                    <div className="kpi-label">⏳ Pending Allocation</div>
                </div>
                <div className="kpi-card" style={{ borderColor: '#1d4ed8' }}>
                    <div className="kpi-value" style={{ color: '#1d4ed8' }}>{assigned.length}</div>
                    <div className="kpi-label">👷 Assigned</div>
                </div>
                <div className="kpi-card" style={{ borderColor: '#7c3aed' }}>
                    <div className="kpi-value" style={{ color: '#7c3aed' }}>{inProgress.length}</div>
                    <div className="kpi-label">🔧 In Progress</div>
                </div>
                <div className="kpi-card" style={{ borderColor: '#dc2626' }}>
                    <div className="kpi-value" style={{ color: '#dc2626' }}>{pendingParts.length}</div>
                    <div className="kpi-label">📦 Pending Parts</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
                {/* Status breakdown */}
                <div className="card">
                    <h3 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700 }}>📊 All Status Breakdown</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {STATUS_OPTIONS.map((s) => {
                            const count = filtered.filter((t) => t.status === s).length;
                            if (count === 0) return null;
                            const color = STATUS_COLORS[s] || '#ff9800';
                            return (
                                <div key={s} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: '6px', background: 'var(--bg)' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s}</span>
                                    <span style={{ fontWeight: 700, fontSize: '13px', color, background: color + '18', padding: '2px 8px', borderRadius: '20px' }}>{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Engineer workload */}
                <div className="card">
                    <h3 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700 }}>👷 Engineer Workload (Active)</h3>
                    {sortedEng.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No active tickets</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {sortedEng.map(([name, count]) => {
                                const maxLoad = sortedEng[0][1];
                                return (
                                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '110px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {name}
                                        </div>
                                        <div style={{ flex: 1, background: 'var(--bg)', borderRadius: '4px', height: '18px', overflow: 'hidden' }}>
                                            <div style={{ width: `${(count / maxLoad) * 100}%`, background: '#1d4ed8', height: '100%', borderRadius: '4px' }} />
                                        </div>
                                        <div style={{ width: '24px', fontSize: '12px', fontWeight: 700 }}>{count}</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Active tickets table */}
            <div className="card">
                <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 700 }}>🔴 Active Tickets ({activeTickets.length})</h3>
                {activeTickets.length === 0 ? (
                    <p className="empty-message">No active tickets</p>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Ticket</th>
                                    <th>Date</th>
                                    <th>Customer</th>
                                    <th>Model</th>
                                    <th>Call Type</th>
                                    <th>Engineer</th>
                                    <th>Status</th>
                                    <th>City</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeTickets.map((t) => (
                                    <tr key={t.id}>
                                        <td><strong>{t.id}</strong></td>
                                        <td style={{ fontSize: '12px' }}>{new Date(t.created_at).toLocaleDateString('en-IN')}</td>
                                        <td>{t.cname}</td>
                                        <td style={{ fontSize: '12px' }}>{t.brand_name} {t.model}</td>
                                        <td>{t.call_type}</td>
                                        <td>{t.assigned_name || <span style={{ color: 'var(--danger)', fontStyle: 'italic' }}>Unassigned</span>}</td>
                                        <td>
                                            <span
                                                style={{
                                                    background: (STATUS_COLORS[t.status] || '#ff9800') + '20',
                                                    color: STATUS_COLORS[t.status] || '#ff9800',
                                                    padding: '2px 8px',
                                                    borderRadius: '20px',
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {t.status}
                                            </span>
                                        </td>
                                        <td>{t.city || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}