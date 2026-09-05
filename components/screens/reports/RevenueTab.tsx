'use client';

import { useCallback, useMemo } from 'react';
import { Ticket } from '@/types/reports';

interface RevenueTabProps {
    // ALL tickets (unfiltered) — index.html:9712-9715 computes revenue only
    // from Closed / Out-of-Coverage tickets, over all time, deliberately
    // decoupled from the Filter tab's period/status/engineer/city filters.
    tickets: Ticket[];
}

interface MonthAgg { parts: number; labor: number; total: number; count: number }

export default function RevenueTab({ tickets }: RevenueTabProps) {
    // index.html:9715
    const revTickets = useMemo(
        () => tickets.filter((t) => t.status === 'Closed' || t.warranty_coverage === 'Out of Coverage'),
        [tickets]
    );

    const { byMonth, byEng } = useMemo(() => {
        const byMonth: Record<string, MonthAgg> = {};
        const byEng: Record<string, MonthAgg> = {};
        revTickets.forEach((t) => {
            const sp = (t.spares || []).filter((s: any) => !s.requested).reduce((a, s: any) => a + (s.qty || 0) * (s.price || 0), 0);
            // index.html:9730 — labor/service_charges are alternates for the
            // same Service charge; t.labor wins if both are set.
            const lab = parseFloat(String(t.labor)) || parseFloat(String(t.service_charges)) || 0;
            const oth = parseFloat(String(t.other_charge)) || 0;
            const fin = parseFloat(String(t.final_charges)) || 0;
            const ticketTotal = fin > 0 ? fin : sp + lab + oth;

            if (t.created_at) {
                const m = new Date(t.created_at).toLocaleString('en-IN', { month: 'short', year: 'numeric' });
                if (!byMonth[m]) byMonth[m] = { parts: 0, labor: 0, total: 0, count: 0 };
                byMonth[m].parts += sp; byMonth[m].labor += lab; byMonth[m].total += ticketTotal; byMonth[m].count++;
            }

            const k = t.assigned_name || 'Unassigned';
            if (!byEng[k]) byEng[k] = { parts: 0, labor: 0, total: 0, count: 0 };
            byEng[k].parts += sp; byEng[k].labor += lab; byEng[k].total += ticketTotal; byEng[k].count++;
        });
        return { byMonth, byEng };
    }, [revTickets]);

    const totalRev = Object.values(byMonth).reduce((a, m) => a + m.total, 0);
    const totalParts = Object.values(byMonth).reduce((a, m) => a + m.parts, 0);
    const totalLabor = Object.values(byMonth).reduce((a, m) => a + m.labor, 0);
    const maxRev = Math.max(...Object.values(byMonth).map((m) => m.total), 1);
    const maxEngRev = Math.max(...Object.values(byEng).map((e) => e.total), 1);
    // index.html:9757 — note: revTickets iterates newest-first (created_at
    // desc), so Object.entries insertion order is newest→oldest and
    // `.slice(-6)` actually keeps the 6 OLDEST months seen — a latent HTML
    // quirk preserved here rather than "fixed".
    const monthEntries = Object.entries(byMonth).slice(-6);
    const engEntries = Object.entries(byEng).sort((a, b) => b[1].total - a[1].total);

    // index.html:9817-9840 downloadRevenueExcel — separate, Closed-only export
    const downloadRevenueExcel = useCallback(async () => {
        const closed = tickets.filter((t) => t.status === 'Closed');
        const XLSX = await import('xlsx');
        const data = closed.map((t) => {
            const sp = (t.spares || []).filter((s: any) => !s.requested);
            const partsTotal = sp.reduce((a, s: any) => a + (s.qty || 0) * (s.price || 0), 0);
            const lab = parseFloat(String(t.labor)) || parseFloat(String(t.service_charges)) || 0;
            const oth = parseFloat(String(t.other_charge)) || 0;
            const fin = parseFloat(String(t.final_charges)) || 0;
            const ticketTotal = fin > 0 ? fin : partsTotal + lab + oth;
            return {
                'Ticket': t.id,
                'Date': t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN') : '-',
                'Customer': t.cname,
                'Model': t.model,
                'Engineer': t.assigned_name || '-',
                'Call Type': t.call_type,
                'Parts ₹': partsTotal.toFixed(2),
                'Labor ₹': lab.toFixed(2),
                'Other ₹': oth.toFixed(2),
                'Total ₹': ticketTotal.toFixed(2),
            };
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Revenue');
        XLSX.writeFile(wb, `bhavi_revenue_${new Date().toLocaleDateString('en-CA')}.xlsx`);
    }, [tickets]);

    return (
        <div>
            {/* KPI Summary — index.html:9760-9764 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '14px' }}>
                <div className="kpi-card" style={{ borderColor: '#7c3aed' }}>
                    <div className="kpi-label">Total Revenue</div>
                    <div className="kpi-value" style={{ fontSize: '20px', color: '#7c3aed' }}>₹{totalRev.toFixed(0)}</div>
                </div>
                <div className="kpi-card" style={{ borderColor: '#1d4ed8' }}>
                    <div className="kpi-label">Parts Revenue</div>
                    <div className="kpi-value" style={{ fontSize: '20px' }}>₹{totalParts.toFixed(0)}</div>
                </div>
                <div className="kpi-card" style={{ borderColor: '#0e9f6e' }}>
                    <div className="kpi-label">Labor Revenue</div>
                    <div className="kpi-value" style={{ fontSize: '20px' }}>₹{totalLabor.toFixed(0)}</div>
                </div>
            </div>

            {/* Monthly Revenue Trend — index.html:9767-9784 */}
            <div className="card" style={{ marginBottom: '14px' }}>
                <h3 style={{ fontWeight: 700, fontSize: '14px', marginBottom: '12px' }}>💰 Monthly Revenue Trend</h3>
                {monthEntries.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No revenue data</p>
                ) : (
                    <>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', height: '160px', paddingBottom: '4px', overflowX: 'auto' }}>
                            {monthEntries.map(([m, d]) => (
                                <div key={m} style={{ flex: 1, minWidth: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed' }}>₹{Math.round(d.total / 1000)}k</div>
                                    <div style={{ width: '100%', display: 'flex', gap: '2px', alignItems: 'flex-end', height: '130px' }}>
                                        <div
                                            style={{ flex: 1, background: '#1d4ed8', borderRadius: '3px 3px 0 0', height: `${Math.max(d.parts ? 4 : 0, Math.round((d.parts / maxRev) * 120))}px` }}
                                            title={`Parts: ₹${d.parts.toFixed(0)}`}
                                        />
                                        <div
                                            style={{ flex: 1, background: '#0e9f6e', borderRadius: '3px 3px 0 0', height: `${Math.max(d.labor ? 4 : 0, Math.round((d.labor / maxRev) * 120))}px` }}
                                            title={`Labor: ₹${d.labor.toFixed(0)}`}
                                        />
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>{m}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '11px' }}>
                            <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#1d4ed8', borderRadius: '2px', marginRight: '4px' }} />Parts</span>
                            <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#0e9f6e', borderRadius: '2px', marginRight: '4px' }} />Labor</span>
                        </div>
                    </>
                )}
            </div>

            {/* Engineer Revenue + Monthly Table — index.html:9787-9812 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div className="card">
                    <h3 style={{ fontWeight: 700, fontSize: '14px', marginBottom: '12px' }}>👷 Engineer Revenue</h3>
                    {engEntries.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>No data</p>
                    ) : (
                        <div className="chart-bar-wrap">
                            {engEntries.map(([name, d]) => (
                                <div key={name} className="chart-bar-row">
                                    <div className="chart-bar-label" title={name}>{name.split(' ')[0]}</div>
                                    <div className="chart-bar-bg">
                                        <div className="chart-bar-fill success" style={{ width: `${Math.round((d.total / maxEngRev) * 100)}%` }}>
                                            ₹{Math.round(d.total / 1000)}k
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="card">
                    <h3 style={{ fontWeight: 700, fontSize: '14px', marginBottom: '12px' }}>📊 Monthly Revenue Table</h3>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr><th>Month</th><th>Calls</th><th>Parts ₹</th><th>Service/Labour ₹</th><th>Total ₹</th></tr>
                            </thead>
                            <tbody>
                                {monthEntries.map(([m, d]) => (
                                    <tr key={m}>
                                        <td>{m}</td>
                                        <td>{d.count}</td>
                                        <td>₹{d.parts.toFixed(0)}</td>
                                        <td>₹{d.labor.toFixed(0)}</td>
                                        <td><b>₹{d.total.toFixed(0)}</b></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div style={{ marginTop: '10px', textAlign: 'right' }}>
                        <button className="btn btn-success btn-sm" onClick={downloadRevenueExcel}>📊 Download Excel</button>
                    </div>
                </div>
            </div>
        </div>
    );
}