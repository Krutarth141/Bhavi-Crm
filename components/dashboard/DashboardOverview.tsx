'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTickets } from '@/hooks/useTickets';
import { Ticket, statusBadges } from '@/types/tickets';
import { getBadgeStyle, printTicket } from '@/utils/printTicket';
import { fetchTodayInquiryFollowupCount } from '@/services/dashboardService';
import DashboardPeriodFilter, { DashPeriod } from './DashboardPeriodFilter';
import VBarChart from './charts/VBarChart';
import DonutChart from './charts/DonutChart';
import KpiDetailModal from './KpiDetailModal';
import EngineerLiveStatusTable from './EngineerLiveStatusTable';

interface Props {
    role: 'admin' | 'work_controller' | 'engineer';
}

// Matches HTML's renderDashboard _doneStatuses exactly (index.html:3669) —
// kept faithful to source for this screen's own Active/Closed split, rather
// than reusing types/ticketStatus.ts's slightly different canonical set.
const DASH_DONE_STATUSES = ['Closed', 'Customer Reject', 'Call Cancel', 'Delivered', 'Repaired', 'Pending for Delivery'];
const DASH_CLOSED_STATUSES = ['Closed', 'Delivered', 'Repaired', 'Pending for Delivery'];

const PERIOD_LABELS: Record<'all' | 'today' | 'week' | 'month' | 'lastmonth', string> = {
    all: 'All Time', today: 'Today', week: 'This Week', month: 'This Month', lastmonth: 'Last Month',
};

function getPeriodRange(period: DashPeriod, from: string, to: string): [Date, Date] | null {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (period === 'today') return [startOfToday, new Date(startOfToday.getTime() + 86399999)];
    if (period === 'week') {
        const monday = new Date(startOfToday);
        monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
        return [monday, new Date(monday.getTime() + 7 * 86400000 - 1)];
    }
    if (period === 'month') return [new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)];
    if (period === 'lastmonth') {
        const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return [lm, new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)];
    }
    if (period === 'custom' && from && to) return [new Date(from), new Date(`${to}T23:59:59`)];
    return null;
}

const ENG_BAR_COLORS = ['#1d4ed8', '#0891b2', '#7c3aed', '#d97706', '#0d9488', '#6366f1', '#ec4899', '#475569'];
const MONTH_BAR_COLORS = ['#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8'];
const DAILY_BAR_COLORS = ['#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af'];

export default function DashboardOverview({ role }: Props) {
    const { data: session } = useSession();
    const userId = (session?.user as any)?.id;
    const loginId = ((session?.user as any)?.email || '').toUpperCase(); // holds user_id, e.g. 'ENG002'

    const { tickets: allTickets, loading } = useTickets({ userRole: role, userId });

    const [period, setPeriod] = useState<DashPeriod>('all');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [appliedFrom, setAppliedFrom] = useState('');
    const [appliedTo, setAppliedTo] = useState('');

    const [kpiDetail, setKpiDetail] = useState<{ title: string; tickets: Ticket[] } | null>(null);
    const [followup, setFollowup] = useState<{ count: number; names: string[] } | null>(null);

    useEffect(() => {
        // Matches HTML: Admin (non-WC) + hardcoded ENG002/ENG008 only (index.html:3866).
        const canSeeFollowup = role === 'admin' || loginId === 'ENG002' || loginId === 'ENG008';
        if (!canSeeFollowup) return;
        fetchTodayInquiryFollowupCount().then(r => { if (r.count > 0) setFollowup(r); });
    }, [role, loginId]);

    const range = useMemo(() => getPeriodRange(period, appliedFrom, appliedTo), [period, appliedFrom, appliedTo]);
    const dashTix = useMemo(() => {
        if (!range) return allTickets;
        return allTickets.filter(t => t.created_at && new Date(t.created_at) >= range[0] && new Date(t.created_at) <= range[1]);
    }, [allTickets, range]);

    const periodLabel = period === 'custom' && appliedFrom && appliedTo ? `${appliedFrom} to ${appliedTo}` : PERIOD_LABELS[period as keyof typeof PERIOD_LABELS];

    const applyCustom = () => {
        if (!fromDate || !toDate) { alert('Please select both From and To dates.'); return; }
        setAppliedFrom(fromDate); setAppliedTo(toDate);
    };

    const total = dashTix.length;
    const active = dashTix.filter(t => !DASH_DONE_STATUSES.includes(t.status)).length;
    const closed = dashTix.filter(t => DASH_CLOSED_STATUSES.includes(t.status)).length;
    const unalloc = dashTix.filter(t => !DASH_DONE_STATUSES.includes(t.status) && !t.assigned_to).length;

    const isAdminOrWC = role === 'admin' || role === 'work_controller';

    const chartData = useMemo(() => {
        if (!isAdminOrWC) return null;

        const byEng: Record<string, number> = {};
        dashTix.forEach(t => { const k = t.assigned_name || 'Unassigned'; byEng[k] = (byEng[k] || 0) + 1; });

        const byMonth: Record<string, number> = {};
        dashTix.forEach(t => { if (!t.created_at) return; const k = new Date(t.created_at).toLocaleString('en-IN', { month: 'short', year: '2-digit' }); byMonth[k] = (byMonth[k] || 0) + 1; });
        const monthEntries = Object.entries(byMonth).slice(-6);

        const inProgress = dashTix.filter(t => t.status === 'In Progress').length;
        const pendParts = dashTix.filter(t => t.status === 'Pending Parts').length;
        const pendRepair = dashTix.filter(t => ['Pending Repair Carry In', 'Pending Repair On Site'].includes(t.status)).length;
        const cancelled = dashTix.filter(t => ['Call Cancel', 'Customer Reject'].includes(t.status)).length;
        const warranty = dashTix.filter(t => t.call_type === 'Warranty' || t.call_type === 'Warranty Repeat').length;
        const nonWarranty = dashTix.filter(t => t.call_type === 'Non-Warranty' || t.call_type === 'Non-Warranty Repeat').length;
        const amc = dashTix.filter(t => t.call_type === 'AMC').length;
        const assigned = dashTix.filter(t => t.status === 'Assigned').length;
        const pendCustApproval = dashTix.filter(t => t.status === 'Pending Customer Approval').length;
        const custApproved = dashTix.filter(t => t.status === 'Customer Approved').length;
        const pendRepairCI = dashTix.filter(t => t.status === 'Pending Repair Carry In').length;
        const pendRepairOS = dashTix.filter(t => t.status === 'Pending Repair On Site').length;
        const custRejectCount = dashTix.filter(t => t.status === 'Customer Reject').length;
        const cancelCount = dashTix.filter(t => t.status === 'Call Cancel').length;

        const activeStatuses = ['Pending Customer Arrival', 'Pending Allocation', 'Assigned', 'In Progress', 'Pending Customer Approval', 'Customer Approved', 'Pending Parts', 'Pending Repair Carry In', 'Pending Repair On Site'];
        const activeTickets = dashTix.filter(t => activeStatuses.includes(t.status));

        const ciTotal = dashTix.filter(t => t.service_type === 'Carry In').length;
        const osTotal = dashTix.filter(t => t.service_type === 'On Site').length;
        const ciActive = activeTickets.filter(t => t.service_type === 'Carry In').length;
        const osActive = activeTickets.filter(t => t.service_type === 'On Site').length;
        const ciClosed = dashTix.filter(t => t.service_type === 'Carry In' && t.status === 'Closed').length;
        const osClosed = dashTix.filter(t => t.service_type === 'On Site' && t.status === 'Closed').length;
        const ciPendParts = activeTickets.filter(t => t.service_type === 'Carry In' && t.status === 'Pending Parts').length;
        const osPendParts = activeTickets.filter(t => t.service_type === 'On Site' && t.status === 'Pending Parts').length;

        const resRate = total ? Math.round((closed / total) * 100) : 0;
        const invoicePending = dashTix.filter(t => (t.call_type === 'Non-Warranty' || t.call_type === 'Non-Warranty Repeat') && t.status === 'Closed' && !t.invoice_done).length;

        const ciWorking = Math.max(0, ciActive - ciPendParts - pendRepairCI);
        const osWorking = Math.max(0, osActive - osPendParts - pendRepairOS);

        return {
            byEng, monthEntries, inProgress, pendParts, pendRepair, cancelled, warranty, nonWarranty, amc,
            assigned, pendCustApproval, custApproved, pendRepairCI, pendRepairOS, custRejectCount, cancelCount,
            activeTickets, ciTotal, osTotal, ciClosed, osClosed, resRate, invoicePending, ciWorking, osWorking,
            unalloc,
        };
    }, [isAdminOrWC, dashTix, total, closed]);

    const engDaily = useMemo(() => {
        if (isAdminOrWC) return null;
        const daily: Record<string, number> = {};
        dashTix.forEach(t => { if (!t.created_at) return; const d = new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }); daily[d] = (daily[d] || 0) + 1; });
        return Object.entries(daily).slice(-7);
    }, [isAdminOrWC, dashTix]);

    // Recent Tickets deliberately ignores the period filter — matches HTML (index.html:3854).
    const recentTickets = allTickets.slice(0, 10);

    if (loading) return <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>Loading...</div>;

    return (
        <div style={{ padding: '20px 24px' }}>
            <DashboardPeriodFilter
                period={period} fromDate={fromDate} toDate={toDate}
                resultCount={dashTix.length} periodLabel={periodLabel}
                onPeriodChange={(p) => { setPeriod(p); if (p !== 'custom') { setAppliedFrom(''); setAppliedTo(''); } }}
                onFromChange={setFromDate} onToChange={setToDate} onApplyCustom={applyCustom}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 14 }}>
                <KpiCard label="Total Tickets" sub={periodLabel} value={total} icon="🎫" color="#1d4ed8" onClick={() => setKpiDetail({ title: `Total Tickets (${periodLabel})`, tickets: dashTix })} />
                <KpiCard label="Active" sub="In pipeline" value={active} icon="🔥" color="#d97706" onClick={() => setKpiDetail({ title: `Active Tickets (${periodLabel})`, tickets: dashTix.filter(t => !DASH_DONE_STATUSES.includes(t.status)) })} />
                <KpiCard label="Closed" sub="Successfully resolved" value={closed} icon="✅" color="#0d9488" onClick={() => setKpiDetail({ title: `Closed Tickets (${periodLabel})`, tickets: dashTix.filter(t => DASH_CLOSED_STATUSES.includes(t.status)) })} />
                <KpiCard label="Unassigned" sub="Needs attention" value={unalloc} icon="⏳" color="#7c3aed" onClick={() => setKpiDetail({ title: `Unassigned Tickets (${periodLabel})`, tickets: dashTix.filter(t => !DASH_DONE_STATUSES.includes(t.status) && !t.assigned_to) })} />
            </div>

            {!isAdminOrWC && engDaily && (
                <Card title="📊 My Daily Calls (Last 7 days)">
                    <VBarChart entries={engDaily.map(([d, v], i) => ({ label: d, value: v, color: DAILY_BAR_COLORS[i % DAILY_BAR_COLORS.length] }))} />
                </Card>
            )}

            {isAdminOrWC && chartData && (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 14 }}>
                        <KpiCard label="In Progress" sub="Being worked on" value={chartData.inProgress} icon="⚡" color="#1d4ed8" onClick={() => setKpiDetail({ title: 'In Progress', tickets: allTickets.filter(t => t.status === 'In Progress') })} />
                        <KpiCard label="Pending Parts" sub="Awaiting spare parts" value={chartData.pendParts} icon="🔩" color="#d97706" onClick={() => setKpiDetail({ title: 'Pending Parts', tickets: allTickets.filter(t => t.status === 'Pending Parts') })} />
                        <KpiCard label="Pending Repair" sub="Repair scheduled" value={chartData.pendRepair} icon="🔧" color="#0891b2" onClick={() => setKpiDetail({ title: 'Pending Repair', tickets: allTickets.filter(t => ['Pending Repair Carry In', 'Pending Repair On Site'].includes(t.status)) })} />
                        <KpiCard label="Cancelled" sub="Rejected / Cancelled" value={chartData.cancelled} icon="🚫" color="#64748b" onClick={() => setKpiDetail({ title: 'Cancelled', tickets: allTickets.filter(t => ['Call Cancel', 'Customer Reject'].includes(t.status)) })} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <Card title="👷 Engineer-wise Calls">
                            <VBarChart entries={Object.entries(chartData.byEng).map(([name, v], i) => ({ label: name.split(' ')[0], value: v, color: ENG_BAR_COLORS[i % ENG_BAR_COLORS.length] }))} />
                        </Card>
                        <Card title="🏷️ Call Type Breakdown">
                            <VBarChart entries={[
                                { label: 'Warranty', value: chartData.warranty, color: '#1d4ed8' },
                                { label: 'Non-Warranty', value: chartData.nonWarranty, color: '#d97706' },
                                { label: 'AMC', value: chartData.amc, color: '#0d9488' },
                            ]} />
                            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280', paddingTop: 8, borderTop: '1px solid #e5e7eb' }}>
                                <span>Total: <b style={{ color: '#111827' }}>{total}</b></span>
                                <span>Resolution: <b style={{ color: '#0d9488' }}>{chartData.resRate}%</b></span>
                            </div>
                        </Card>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <Card title="📅 Monthly Call Trend">
                            <VBarChart entries={chartData.monthEntries.map(([m, v], i) => ({ label: m, value: v, color: MONTH_BAR_COLORS[i % MONTH_BAR_COLORS.length] }))} />
                        </Card>
                        <Card title="📋 Active Workload" subtitle="Current pipeline status">
                            <WorkloadBars items={[
                                { l: 'Pend. Alloc', v: chartData.unalloc, c: '#d97706' },
                                { l: 'Assigned', v: chartData.assigned, c: '#1d4ed8' },
                                { l: 'In Progress', v: chartData.inProgress, c: '#0891b2' },
                                { l: 'Pend. Approval', v: chartData.pendCustApproval, c: '#7c3aed' },
                                { l: 'Cust. Approved', v: chartData.custApproved, c: '#0d9488' },
                                { l: 'Pend. Parts', v: chartData.pendParts, c: '#d97706' },
                                { l: 'Repair CI', v: chartData.pendRepairCI, c: '#6366f1' },
                                { l: 'Repair OS', v: chartData.pendRepairOS, c: '#6366f1' },
                            ]} />
                            <div style={{ marginTop: 8, padding: '6px 10px', background: '#f8fafc', borderRadius: 8, fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#6b7280' }}>Total active</span><b>{chartData.activeTickets.length} calls</b>
                            </div>
                        </Card>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <Card title="🏠 Carry In" center subtitle={`${chartData.ciTotal} Total`}>
                            <DonutChart segments={buildServiceTypeSegments(chartData.ciWorking, chartData.ciClosed, dashTix, 'Carry In')} />
                        </Card>
                        <Card title="🚗 On Site" center subtitle={`${chartData.osTotal} Total`}>
                            <DonutChart segments={buildServiceTypeSegments(chartData.osWorking, chartData.osClosed, dashTix, 'On Site')} />
                        </Card>
                        <Card title="📊 Historical Summary">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                                <StatTile value={closed} label="Total Closed" bg="#f0fdf4" color="#0d9488" />
                                <StatTile value={chartData.cancelCount} label="Cancelled" bg="#fff7ed" color="#d97706" />
                                <StatTile value={chartData.custRejectCount} label="Cust. Reject" bg="#fef9c3" color="#ca8a04" />
                                <StatTile value={`${chartData.resRate}%`} label="Resolution" bg="#eff6ff" color="#1d4ed8" />
                                {chartData.invoicePending > 0 ? (
                                    <div style={{ background: '#fef3c7', border: '1.5px solid #f59e0b', borderRadius: 8, padding: 10, textAlign: 'center', gridColumn: 'span 2' }}>
                                        <div style={{ fontSize: 28, fontWeight: 700, color: '#92400e' }}>{chartData.invoicePending}</div>
                                        <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>🧾 Invoice Pending (Non-Warranty)</div>
                                    </div>
                                ) : (
                                    <div style={{ background: '#dcfce7', border: '1.5px solid #16a34a', borderRadius: 8, padding: 10, textAlign: 'center', gridColumn: 'span 2' }}>
                                        <div style={{ fontSize: 22 }}>✅</div>
                                        <div style={{ fontSize: 11, color: '#15803d', fontWeight: 600 }}>All Invoices Done</div>
                                    </div>
                                )}
                            </div>
                            <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${chartData.resRate}%`, background: 'linear-gradient(90deg,#0d9488,#1d4ed8)' }} />
                            </div>
                        </Card>
                    </div>
                </>
            )}

            {isAdminOrWC && <EngineerLiveStatusTable />}

            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>Recent Tickets</h2>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr>
                                {['Ticket', 'Customer', 'Model', 'Problem', 'Engineer', 'Status', 'Date', 'Action'].map(h => (
                                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 12, color: '#6b7280', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {recentTickets.length === 0 ? (
                                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30, color: '#6b7280' }}>No tickets</td></tr>
                            ) : recentTickets.map(t => (
                                <tr key={t.id}>
                                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', fontWeight: 700 }}>{t.id}</td>
                                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9' }}>{t.cname || '-'}</td>
                                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9' }}>{t.model || '-'}</td>
                                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9' }}>{t.problem || '-'}</td>
                                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9' }}>{t.assigned_name || <span style={{ color: '#dc2626', fontSize: 12 }}>Unassigned</span>}</td>
                                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9' }}><span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, ...getBadgeStyle(statusBadges[t.status] || 'badge-open') }}>{t.status}</span></td>
                                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN') : '-'}</td>
                                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9' }}>
                                        <button onClick={() => printTicket(t)} style={{ padding: '5px 10px', background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>View</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {kpiDetail && <KpiDetailModal title={kpiDetail.title} tickets={kpiDetail.tickets} onClose={() => setKpiDetail(null)} onView={printTicket} />}

            {followup && (
                <div onClick={() => setFollowup(null)} style={{ position: 'fixed', bottom: 20, right: 20, background: '#f59e0b', color: '#fff', padding: '12px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 999, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', maxWidth: 280 }}>
                    🔔 {followup.count} Inquiry Followup Today!
                    <div style={{ fontSize: 11, fontWeight: 400, marginTop: 4 }}>{followup.names.join(', ')}</div>
                </div>
            )}
        </div>
    );
}

function KpiCard({ label, sub, value, icon, color, onClick }: { label: string; sub: string; value: number; icon: string; color: string; onClick: () => void }) {
    return (
        <div onClick={onClick} style={{ background: '#fff', borderRadius: 10, padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderTop: `3px solid ${color}`, cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{label}</div>
                <span style={{ fontSize: 18 }}>{icon}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{sub}</div>
        </div>
    );
}

function Card({ title, subtitle, center, children }: { title: string; subtitle?: string; center?: boolean; children: React.ReactNode }) {
    return (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, display: center ? 'flex' : undefined, flexDirection: center ? 'column' : undefined, alignItems: center ? 'center' : undefined, textAlign: center ? 'center' : undefined }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: subtitle ? 2 : 10 }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10, fontWeight: 600, background: '#f1f5f9', padding: '2px 10px', borderRadius: 99 }}>{subtitle}</div>}
            {children}
        </div>
    );
}

function StatTile({ value, label, bg, color }: { value: number | string; label: string; bg: string; color: string }) {
    return (
        <div style={{ background: bg, borderRadius: 8, padding: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>{label}</div>
        </div>
    );
}

function WorkloadBars({ items }: { items: { l: string; v: number; c: string }[] }) {
    const max = Math.max(...items.map(i => i.v), 1);
    return (
        <div>
            {items.map((i, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                    <div style={{ fontSize: 11, color: '#6b7280', width: 88, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.l}</div>
                    <div style={{ flex: 1, height: 13, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.max(i.v > 0 ? 5 : 0, Math.round((i.v / max) * 100))}%`, background: i.c, borderRadius: 3 }} />
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, width: 18, textAlign: 'right' }}>{i.v}</div>
                </div>
            ))}
        </div>
    );
}

function buildServiceTypeSegments(working: number, closedCount: number, dashTix: Ticket[], serviceType: string) {
    const pendParts = dashTix.filter(t => t.service_type === serviceType && t.status === 'Pending Parts').length;
    const pendRepairStatus = serviceType === 'Carry In' ? 'Pending Repair Carry In' : 'Pending Repair On Site';
    const pendRepair = dashTix.filter(t => t.status === pendRepairStatus).length;
    const segs = [
        { label: 'Working', value: working, color: '#2563eb' },
        { label: 'Pend.Parts', value: pendParts, color: '#f59e0b' },
        { label: 'Pend.Repair', value: pendRepair, color: '#ef4444' },
        { label: 'Closed', value: closedCount, color: '#22c55e' },
    ].filter(s => s.value > 0);
    return segs.length ? segs : [{ label: 'No data', value: 1, color: '#e2e8f0' }];
}