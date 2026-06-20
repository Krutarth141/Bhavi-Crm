'use client';

import { Ticket } from '@/types/reports';
import { getTicketFinancials } from '@/hooks/useReports';
import ReportsBarChart from '@/components/screens/reports/ReportsBarChart';

interface RevenueTabProps {
    filtered: Ticket[];
    totalRevenue: number;
    revenueChartData: { label: string; value: number; color?: string }[];
    engData: [string, { calls: number; closed: number; revenue: number }][];
}

export default function RevenueTab({ filtered, totalRevenue, revenueChartData, engData }: RevenueTabProps) {
    const totalParts = filtered.reduce((a, t) => a + getTicketFinancials(t).partsTotal, 0);
    const totalSvc = filtered.reduce((a, t) => a + getTicketFinancials(t).svc, 0);
    const totalOther = filtered.reduce((a, t) => a + getTicketFinancials(t).other, 0);
    const closedRevenue = filtered
        .filter((t) => t.status === 'Closed')
        .reduce((a, t) => a + getTicketFinancials(t).grand, 0);

    const warrantyRev = filtered
        .filter((t) => ['Warranty', 'Warranty Repeat', 'AMC'].includes(t.call_type))
        .reduce((a, t) => a + getTicketFinancials(t).grand, 0);
    const nonWarrantyRev = totalRevenue - warrantyRev;

    return (
        <div>
            {/* KPI Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '18px' }}>
                <div className="kpi-card" style={{ borderColor: 'var(--primary)' }}>
                    <div className="kpi-value" style={{ color: 'var(--primary)' }}>
                        ₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                    <div className="kpi-label">💰 Total Revenue</div>
                </div>
                <div className="kpi-card" style={{ borderColor: 'var(--success)' }}>
                    <div className="kpi-value" style={{ color: 'var(--success)' }}>
                        ₹{closedRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                    <div className="kpi-label">✅ Closed Revenue</div>
                </div>
                <div className="kpi-card" style={{ borderColor: '#1d4ed8' }}>
                    <div className="kpi-value" style={{ color: '#1d4ed8' }}>
                        ₹{totalSvc.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                    <div className="kpi-label">🔧 Service / Labour</div>
                </div>
                <div className="kpi-card" style={{ borderColor: '#d97706' }}>
                    <div className="kpi-value" style={{ color: '#d97706' }}>
                        ₹{totalParts.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                    <div className="kpi-label">🔩 Parts</div>
                </div>
            </div>

            {/* Monthly revenue chart */}
            <div className="card" style={{ marginBottom: '18px' }}>
                <h3 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 700 }}>💰 Monthly Revenue</h3>
                {revenueChartData.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No revenue data for selected period</p>
                ) : (
                    <ReportsBarChart data={revenueChartData} />
                )}
            </div>

            {/* Warranty vs Non-Warranty revenue */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
                <div className="card">
                    <h3 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700 }}>Revenue by Call Type</h3>
                    <ReportsBarChart data={[
                        { label: 'Warranty / AMC', value: Math.round(warrantyRev), color: '#0e9f6e' },
                        { label: 'Non-Warranty', value: Math.round(nonWarrantyRev), color: '#f05252' },
                    ]} />
                </div>
                <div className="card">
                    <h3 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700 }}>Revenue Breakdown</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[
                            { label: 'Parts', value: totalParts, color: '#d97706' },
                            { label: 'Service / Labour', value: totalSvc, color: '#1d4ed8' },
                            { label: 'Other Charges', value: totalOther, color: '#7c3aed' },
                        ].map((row) => (
                            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                                <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                                <span style={{ fontWeight: 700, color: row.color }}>₹{row.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700, paddingTop: '4px' }}>
                            <span>Grand Total</span>
                            <span style={{ color: 'var(--primary)' }}>₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Engineer Revenue Table */}
            {engData.length > 0 && (
                <div className="card">
                    <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 700 }}>👷 Revenue by Engineer</h3>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Engineer</th>
                                    <th>Total Calls</th>
                                    <th>Closed</th>
                                    <th>Closure %</th>
                                    <th style={{ textAlign: 'right' }}>Revenue ₹</th>
                                    <th style={{ textAlign: 'right' }}>Avg / Call ₹</th>
                                </tr>
                            </thead>
                            <tbody>
                                {engData.map(([name, d]) => (
                                    <tr key={name}>
                                        <td><strong>{name}</strong></td>
                                        <td>{d.calls}</td>
                                        <td>{d.closed}</td>
                                        <td>{d.calls > 0 ? Math.round((d.closed / d.calls) * 100) : 0}%</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>
                                            ₹{d.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            ₹{d.calls > 0 ? Math.round(d.revenue / d.calls).toLocaleString('en-IN') : 0}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: 'var(--bg)', fontWeight: 700 }}>
                                    <td colSpan={4} style={{ textAlign: 'right' }}>TOTAL</td>
                                    <td style={{ textAlign: 'right', color: 'var(--primary)' }}>
                                        ₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                    </td>
                                    <td />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}