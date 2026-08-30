'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTickets } from '@/hooks/useTickets';
import { Ticket, statusBadges, TicketSpare, isChargeableSpare } from '@/types/tickets';
import { getBadgeStyle, printTicket } from '@/utils/printTicket';
import { fetchTodayInquiryFollowupCount } from '@/services/dashboardService';
import { isTicketActive, isTicketClosed, isTicketCancelled, getAllowedStatuses } from '@/types/ticketStatus';
import DashboardPeriodFilter, { DashPeriod } from './DashboardPeriodFilter';
import VBarChart from './charts/VBarChart';
import DonutChart from './charts/DonutChart';
import KpiDetailModal from './KpiDetailModal';
import EngineerLiveStatusTable from './EngineerLiveStatusTable';
import { useMyCalls } from '@/hooks/useMyCalls';
import { punchIn, punchOut, startLocationTracking, stopLocationTracking, saveLocationEvent } from '@/services/myCallsService';
import { hasKmEntryToday } from '@/services/kmTrackingService';
import {
    updateTicketStatus, validateEngineerUpdate, computeCloseCharges,
    needsPaymentConfirmation, paymentPartsCost, fetchSpareConsumableCodes,
} from '@/services/engineerUpdateService';
import { PhotoSlot, PaymentConfirmData } from '@/types/engineerUpdate';
import { hasDailyReportToday } from '@/services/engDailyReportService';
import { DailyReportModal } from '@/components/screens/MyCallsScreen';
import { isCspManager, isAccountant } from '@/lib/permissions';
import PunchModal from '@/components/screens/PunchModal';
import KmCaptureModal from '@/components/screens/tickets/KmCaptureModal';
import Modal from '@/components/Modal';
import { colors, styles } from '@/styles/ticketsStyles';

interface Props {
    role: 'admin' | 'work_controller' | 'engineer';
}

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
    const userId = (session?.user as any)?.email;
    const loginId = ((session?.user as any)?.email || '').toUpperCase(); // holds user_id, e.g. 'ENG002'
    const userName = (session?.user as any)?.name ?? '';
    const cspMgr = isCspManager(session);
    const isAcct = isAccountant(session);

    const { tickets: allTickets, loading } = useTickets({ userRole: role, userId, userName, isAccountant: isAcct });

    // Punch In/Out bar — engineers AND work controllers (matches HTML:3754).
    const canPunch = role === 'engineer' || role === 'work_controller';
    const { punchLog, refetch: refetchPunch } = useMyCalls(canPunch ? (userId ?? '') : '', userName);
    const [punchModalMode, setPunchModalMode] = useState<'in' | 'out' | null>(null);
    const [kmCaptureType, setKmCaptureType] = useState<'opening' | 'closing' | null>(null);
    // Mandatory Daily Report gate before the punch-out selfie — mirrors HTML's
    // startPunchOutDailyReport() (index.html:4402), auto-skipped when today's
    // report is already submitted. Same flow MyCallsScreen implements.
    const [forcedDailyReport, setForcedDailyReport] = useState(false);
    const memberRole = role === 'work_controller' ? 'WC' : 'Engineer';

    const handlePunchIn = async () => {
        const hasOpening = await hasKmEntryToday(userId ?? '', 'opening');
        if (!hasOpening) { setKmCaptureType('opening'); return; }
        setPunchModalMode('in');
    };
    const proceedToPunchOutReportGate = async () => {
        const today = new Date().toLocaleDateString('en-CA');
        const already = await hasDailyReportToday(userId ?? '', today);
        if (already) { setPunchModalMode('out'); return; }
        setForcedDailyReport(true);
    };
    const handlePunchOut = async () => {
        const hasClosing = await hasKmEntryToday(userId ?? '', 'closing');
        if (!hasClosing) { setKmCaptureType('closing'); return; }
        await proceedToPunchOutReportGate();
    };
    const handlePunchSubmit = async (data: { photo: string; lat: number | null; lng: number | null; meter: string; remark?: string }) => {
        if (punchModalMode === 'in') {
            const today = new Date().toLocaleDateString('en-CA');
            const currentTime = new Date().toTimeString().slice(0, 5);
            const result = await punchIn({
                eng_id: userId ?? '', eng_name: userName, punch_in_date: today, punch_in_time: currentTime,
                start_meter: data.meter ? Number(data.meter) : undefined, photo: data.photo, lat: data.lat, lng: data.lng,
            });
            // Start live GPS tracking for the day (index.html:4359-4361).
            if (result.success) { startLocationTracking(userId ?? '', userName); refetchPunch(); }
            return result;
        }
        const currentTime = new Date().toTimeString().slice(0, 5);
        const result = await punchOut({
            eng_id: userId ?? '', punch_out_time: currentTime, end_meter: data.meter ? Number(data.meter) : undefined,
            photo: data.photo, lat: data.lat, lng: data.lng, lateRemark: data.remark,
        });
        if (result.success) {
            // One final GPS point, then stop tracking (index.html:4742).
            saveLocationEvent(
                'punch_out', null,
                data.lat != null && data.lng != null ? { lat: data.lat, lng: data.lng, accuracy: 0 } : null,
                userId ?? '', userName
            ).catch(() => undefined);
            stopLocationTracking();
            refetchPunch();
        }
        return result;
    };

    // Ticket view→update wiring — engineers get an "Update" action (matches
    // HTML's openEngUpdate); closed/cancelled tickets are blocked from
    // engineer editing (matches HTML's isClosed guard).
    const [updateTicket, setUpdateTicket] = useState<Ticket | null>(null);
    const [updateForm, setUpdateForm] = useState({ newStatus: '', note: '', labour: '', faultCode: '' });
    const [updateSaving, setUpdateSaving] = useState(false);
    // Spares editing + Attachments + Payment Confirmation — ports the same
    // close-time capabilities MyCallsScreen's Update modal has, so a close
    // started from the Dashboard no longer dead-ends on parts/photos
    // (index.html's openEngUpdate is the single shared modal everywhere).
    const [updateSpares, setUpdateSpares] = useState<TicketSpare[]>([]);
    const [consumableCodes, setConsumableCodes] = useState<Set<string>>(new Set());
    const [updatePhotos, setUpdatePhotos] = useState<(PhotoSlot | null)[]>([null, null, null]);
    const [paymentPrompt, setPaymentPrompt] = useState<{ serviceCharges: number; partsCost: number } | null>(null);
    const [paymentForm, setPaymentForm] = useState({ cname: '', service: '0', parts: '0', mode: '', notes: '' });

    const openTicketUpdate = (t: Ticket) => {
        if (role === 'engineer' && (isTicketClosed(t.status) || isTicketCancelled(t.status))) {
            alert('🔒 Closed call ni details engineer ne available nathi.');
            return;
        }
        setUpdateTicket(t);
        const allowed = getAllowedStatuses(t.status, 'engineer', (t as any).service_type, (t as any).call_type, (t as any).warranty_coverage);
        setUpdateForm({ newStatus: allowed[0] || '', note: '', labour: String((t as any).labor || (t as any).service_charges || ''), faultCode: (t as any).fault_code || '' });
        const spares: TicketSpare[] = (t as any).spares || [];
        setUpdateSpares(spares);
        fetchSpareConsumableCodes(spares).then(setConsumableCodes);
        let ex = (t as any).attachments;
        if (typeof ex === 'string') { try { ex = JSON.parse(ex); } catch { ex = []; } }
        const slots: (PhotoSlot | null)[] = [(t as any).jobsheet_photo ? { url: (t as any).jobsheet_photo, isNew: false } : null, null, null];
        if (Array.isArray(ex)) ex.slice(0, 2).forEach((u: string, i: number) => { if (u) slots[i + 1] = { url: u, isNew: false }; });
        setUpdatePhotos(slots);
        setPaymentPrompt(null);
    };
    const allowedForUpdate = updateTicket
        ? getAllowedStatuses(updateTicket.status, 'engineer', (updateTicket as any).service_type, (updateTicket as any).call_type, (updateTicket as any).warranty_coverage)
        : [];

    // Warranty/AMC (not Out of Coverage) calls never bill for a part, except a
    // Consumable (index.html:7650-7656) — same rule MyCallsScreen applies.
    const spareHidesPrice = (s: TicketSpare) => {
        if (!updateTicket) return false;
        if (isChargeableSpare(s, consumableCodes)) return false;
        const isW = ['Warranty', 'Warranty Repeat', 'AMC'].includes((updateTicket as any).call_type || '');
        return isW && (updateTicket as any).warranty_coverage !== 'Out of Coverage';
    };
    const sparesPartsTotal = updateSpares.reduce((a, s) => a + (spareHidesPrice(s) ? 0 : (Number(s.qty) || 1) * (Number(s.price) || 0)), 0);
    const removeUpdateSpare = (i: number) => setUpdateSpares((prev) => prev.filter((_, idx) => idx !== i));
    const onPickPhoto = (slot: number, file: File | undefined) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            setUpdatePhotos((prev) => { const next = [...prev]; next[slot] = { url: String(reader.result), isNew: true }; return next; });
        };
        reader.readAsDataURL(file);
    };

    const doTicketUpdateSave = async (payment?: PaymentConfirmData) => {
        if (!updateTicket) return;
        setUpdateSaving(true);
        const r = await updateTicketStatus(
            updateTicket as any, updateForm.newStatus, updateForm.note.trim(), updateForm.labour, userName, updateForm.faultCode,
            { workDone: updateForm.note.trim(), spares: updateSpares, photos: updatePhotos, payment, engId: userId ?? '', memberRole },
        );
        setUpdateSaving(false);
        if (!r.success) { alert('Error: ' + r.error); return; }
        if (r.stockWarning) alert(r.stockWarning);
        setPaymentPrompt(null);
        setUpdateTicket(null);
    };

    const handleTicketUpdateSave = async () => {
        if (!updateTicket || !updateForm.newStatus) { alert('Select new status'); return; }
        const note = updateForm.note.trim();
        if (!note) { alert('❌ Action Taken is required.\nPlease describe what was done.'); return; }
        setUpdateSaving(true);
        const block = await validateEngineerUpdate(
            updateTicket as any, updateForm.newStatus, note, updateSpares, userName, updatePhotos[0]?.url,
        );
        setUpdateSaving(false);
        if (block) { alert(block); return; }

        const charges = computeCloseCharges(updateTicket as any, updateForm.newStatus, updateSpares, consumableCodes);
        if (needsPaymentConfirmation(updateTicket as any, updateForm.newStatus, charges)) {
            const parts = paymentPartsCost(updateTicket as any, updateSpares, consumableCodes);
            setPaymentPrompt({ serviceCharges: charges.serviceCharges, partsCost: parts });
            setPaymentForm({
                cname: (updateTicket as any).cname || '', service: charges.serviceCharges.toFixed(0), parts: parts.toFixed(0), mode: '', notes: '',
            });
            return;
        }
        await doTicketUpdateSave();
    };

    const handleConfirmPayment = async () => {
        if (!paymentForm.mode) { alert('Please select a payment mode.'); return; }
        await doTicketUpdateSave({
            cname: paymentForm.cname.trim(),
            payment_mode: paymentForm.mode,
            service_charges: Number(paymentForm.service) || 0,
            parts_cost: Number(paymentForm.parts) || 0,
            payment_notes: paymentForm.notes.trim(),
        });
    };

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

    const periodLabel = period === 'custom'
        ? (appliedFrom && appliedTo ? `${appliedFrom} to ${appliedTo}` : 'All Time')
        : PERIOD_LABELS[period as keyof typeof PERIOD_LABELS];

    const applyCustom = () => {
        if (!fromDate || !toDate) { alert('Please select both From and To dates.'); return; }
        setAppliedFrom(fromDate); setAppliedTo(toDate);
    };

    const total = dashTix.length;
    const active = dashTix.filter(t => isTicketActive(t.status)).length;
    const closed = dashTix.filter(t => isTicketClosed(t.status)).length;
    const unalloc = dashTix.filter(t => isTicketActive(t.status) && !t.assigned_to).length;

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
        const cancelled = dashTix.filter(t => isTicketCancelled(t.status)).length;
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

    // Recent Tickets deliberately ignores the period filter, but excludes
    // Delivered/Call Cancel — matches HTML (index.html:3860).
    const recentTickets = allTickets.filter(t => !['Delivered', 'Call Cancel'].includes(t.status)).slice(0, 10);

    if (loading) return <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>Loading...</div>;

    return (
        <div style={{ padding: '20px 24px' }}>
            {canPunch && (
                <div style={{ background: 'linear-gradient(135deg, #1a56db 0%, #1240a8 100%)', borderRadius: 10, padding: 16, color: '#fff', marginBottom: 16 }}>
                    {!punchLog?.punch_in_time ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 700 }}>🟢 Ready to Work</div>
                                <div style={{ fontSize: 12, opacity: 0.85 }}>Click to start your duty</div>
                            </div>
                            <button onClick={handlePunchIn} style={{ padding: '9px 18px', background: '#0e9f6e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>▶ Punch In / Work Start</button>
                        </div>
                    ) : !punchLog.punch_out_time ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                            <div>
                                <div style={{ fontSize: 18, fontWeight: 700 }}>🔴 On Duty</div>
                                <div style={{ fontSize: 12, opacity: 0.85 }}>Started: {punchLog.punch_in_time} | Meter: {punchLog.start_meter ?? '-'}</div>
                            </div>
                            <button onClick={handlePunchOut} style={{ padding: '9px 18px', background: colors.danger, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>⏹ Punch Out / Work Over</button>
                        </div>
                    ) : (
                        <div style={{ fontSize: 15, fontWeight: 600 }}>✅ {punchLog.punch_in_time} → {punchLog.punch_out_time}</div>
                    )}
                </div>
            )}

            {kmCaptureType && (
                <KmCaptureModal
                    type={kmCaptureType} engId={userId ?? ''} engName={userName}
                    onClose={() => setKmCaptureType(null)}
                    onDone={() => {
                        const type = kmCaptureType;
                        setKmCaptureType(null);
                        if (type === 'opening') setPunchModalMode('in'); else proceedToPunchOutReportGate();
                    }}
                />
            )}
            {forcedDailyReport && (
                <DailyReportModal
                    engId={userId ?? ''} engName={userName} memberRole={memberRole} forcedHint
                    onClose={() => { setForcedDailyReport(false); setPunchModalMode('out'); }}
                />
            )}
            {punchModalMode && (
                <PunchModal mode={punchModalMode} onSubmit={handlePunchSubmit} onClose={() => setPunchModalMode(null)} />
            )}

            <DashboardPeriodFilter
                period={period} fromDate={fromDate} toDate={toDate}
                resultCount={dashTix.length} periodLabel={periodLabel}
                onPeriodChange={(p) => { setPeriod(p); if (p !== 'custom') { setAppliedFrom(''); setAppliedTo(''); } }}
                onFromChange={setFromDate} onToChange={setToDate} onApplyCustom={applyCustom}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 14 }}>
                <KpiCard label="Total Tickets" sub={periodLabel} value={total} icon="🎫" color="#1d4ed8" onClick={() => setKpiDetail({ title: `Total Tickets (${periodLabel})`, tickets: dashTix })} />
                <KpiCard label="Active" sub="In pipeline" value={active} icon="🔥" color="#d97706" onClick={() => setKpiDetail({ title: `Active Tickets (${periodLabel})`, tickets: dashTix.filter(t => isTicketActive(t.status)) })} />
                <KpiCard label="Closed" sub="Successfully resolved" value={closed} icon="✅" color="#0d9488" onClick={() => setKpiDetail({ title: `Closed Tickets (${periodLabel})`, tickets: dashTix.filter(t => isTicketClosed(t.status)) })} />
                <KpiCard label="Unassigned" sub="Needs attention" value={unalloc} icon="⏳" color="#7c3aed" onClick={() => setKpiDetail({ title: `Unassigned Tickets (${periodLabel})`, tickets: dashTix.filter(t => isTicketActive(t.status) && !t.assigned_to) })} />
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
                        <KpiCard label="Cancelled" sub="Rejected / Cancelled" value={chartData.cancelled} icon="🚫" color="#64748b" onClick={() => setKpiDetail({ title: 'Cancelled', tickets: allTickets.filter(t => isTicketCancelled(t.status)) })} />
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

            {/* HTML:3849 — admin || work_controller || window._isCspMgr */}
            {(isAdminOrWC || cspMgr) && <EngineerLiveStatusTable />}

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
                                        {role === 'engineer' ? (
                                            <button onClick={() => openTicketUpdate(t)} style={{ padding: '5px 10px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Update</button>
                                        ) : (
                                            <button onClick={() => printTicket(t)} style={{ padding: '5px 10px', background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>View</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {kpiDetail && <KpiDetailModal title={kpiDetail.title} tickets={kpiDetail.tickets} onClose={() => setKpiDetail(null)} onView={printTicket} />}

            {updateTicket && (
                <Modal
                    isOpen
                    onClose={() => setUpdateTicket(null)}
                    title={`Update — ${(updateTicket as any).cname || ''}`}
                    footer={
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button onClick={() => setUpdateTicket(null)} style={{ padding: '8px 16px', border: `1px solid ${colors.border}`, background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
                            <button
                                onClick={handleTicketUpdateSave}
                                disabled={updateSaving || !updateForm.newStatus}
                                style={{ padding: '8px 16px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: (updateSaving || !updateForm.newStatus) ? 0.6 : 1 }}
                            >
                                {updateSaving ? 'Saving...' : '💾 Save Update'}
                            </button>
                        </div>
                    }
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {allowedForUpdate.length > 0 ? (
                            <>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>New Status *</label>
                                    <select value={updateForm.newStatus} onChange={(e) => setUpdateForm((f) => ({ ...f, newStatus: e.target.value }))} style={styles.formInput}>
                                        <option value="">Select status...</option>
                                        {allowedForUpdate.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                {/* Spares / Part Request list — same as MyCallsScreen's Update
                                    modal; removals persist to tickets.spares on save. */}
                                <div>
                                    <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>🔩 Spares / Part Request</h3>
                                    {updateSpares.length === 0 ? (
                                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>No parts added.</div>
                                    ) : updateSpares.map((s, i) => {
                                        const hidePrice = spareHidesPrice(s);
                                        const isCons = isChargeableSpare(s, consumableCodes);
                                        return (
                                            <div key={`${s.code || 'x'}-${i}`} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, fontSize: 13, background: '#f9fafb', borderRadius: 8, padding: '6px 10px' }}>
                                                <span style={{ flex: 1, color: colors.primary, fontWeight: 600 }}>
                                                    {s.code || '-'}
                                                    {isCons && <span style={{ fontSize: 9, fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '1px 4px', borderRadius: 4, marginLeft: 4 }}>CONS</span>}
                                                </span>
                                                <span style={{ flex: 2 }}>{s.name}</span>
                                                <span style={{ flex: 0.5 }}>×{s.qty}</span>
                                                <span style={{ flex: 1, textAlign: 'right', fontWeight: 700 }}>
                                                    {hidePrice ? <span style={{ color: '#059669' }}>₹0 (W)</span> : `₹${((Number(s.qty) || 1) * (Number(s.price) || 0)).toFixed(2)}`}
                                                </span>
                                                <button onClick={() => removeUpdateSpare(i)} style={{ background: 'none', border: 'none', color: colors.danger, cursor: 'pointer', fontSize: 14 }}>✕</button>
                                            </div>
                                        );
                                    })}
                                    {sparesPartsTotal > 0 && (
                                        <div style={{ fontSize: 12, color: '#0d9488', fontWeight: 700, marginTop: 4 }}>Parts total: ₹{sparesPartsTotal.toFixed(0)}</div>
                                    )}
                                </div>
                                {updateForm.newStatus === 'Closed' && (
                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>Service / Labour ₹</label>
                                        <input type="number" value={updateForm.labour} onChange={(e) => setUpdateForm((f) => ({ ...f, labour: e.target.value }))} style={styles.formInput} placeholder="0" />
                                    </div>
                                )}
                                {/* Attachments — Job Sheet (slot 0) + up to 2 extras. Mandatory
                                    to close a CSP call (index.html:7293-7300, 7890-7893). */}
                                <div style={{ background: '#f0f9ff', border: '1.5px solid #7dd3fc', borderRadius: 10, padding: 12 }}>
                                    <label style={{ fontWeight: 700, color: '#0369a1', fontSize: 13 }}>
                                        📎 Attachments {(updateTicket as any).wc_type === 'CSP' && <span style={{ color: '#dc2626' }}>*</span>}
                                        <span style={{ fontSize: 11, fontWeight: 400, color: '#64748b' }}>
                                            {' '}— Job Sheet photo{(updateTicket as any).wc_type === 'CSP' ? ' is mandatory to Close (CSP call)' : ' (optional, ICP call)'}. Up to 2 extra photos.
                                        </span>
                                    </label>
                                    {[0, 1, 2].map((slot) => (
                                        <div key={slot} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12 }}>
                                            <span style={{ width: 92, fontWeight: 700, color: '#0369a1' }}>{slot === 0 ? '📄 Job Sheet' : `📎 Extra ${slot}`}</span>
                                            {updatePhotos[slot] ? (
                                                <>
                                                    <a href={updatePhotos[slot]!.url} target="_blank" rel="noreferrer" style={{ color: '#0369a1', fontWeight: 600 }}>
                                                        {updatePhotos[slot]!.isNew ? 'New photo ready' : 'View attached'}
                                                    </a>
                                                    <button
                                                        onClick={() => setUpdatePhotos((prev) => { const n = [...prev]; n[slot] = null; return n; })}
                                                        style={{ background: 'none', border: 'none', color: colors.danger, cursor: 'pointer', fontSize: 14 }}
                                                    >✕</button>
                                                </>
                                            ) : (
                                                <>
                                                    <label style={{ background: '#0369a1', color: '#fff', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}>
                                                        📷 Camera
                                                        <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => onPickPhoto(slot, e.target.files?.[0])} />
                                                    </label>
                                                    <label style={{ background: '#7c3aed', color: '#fff', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}>
                                                        📁 Gallery
                                                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => onPickPhoto(slot, e.target.files?.[0])} />
                                                    </label>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Fault Code</label>
                                    <input type="text" value={updateForm.faultCode} onChange={(e) => setUpdateForm((f) => ({ ...f, faultCode: e.target.value }))} style={styles.formInput} />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Action Taken *</label>
                                    <textarea value={updateForm.note} onChange={(e) => setUpdateForm((f) => ({ ...f, note: e.target.value }))} rows={3} placeholder="Work done, observations..." style={{ ...styles.formInput, resize: 'vertical' }} />
                                </div>
                            </>
                        ) : (
                            <div style={{ background: '#fef3c7', borderRadius: 8, padding: 12, fontSize: 13, color: '#92400e' }}>
                                ⏳ No status update available for: <strong>{updateTicket.status}</strong>
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {/* Payment Confirmation — index.html:16289. Shown on a
                Non-Warranty/'Other' On-Site close, or a Warranty On-Site close
                that ended up with a chargeable consumable. */}
            {paymentPrompt && updateTicket && (
                <Modal
                    isOpen
                    onClose={() => setPaymentPrompt(null)}
                    title="💳 Payment Confirmation"
                    footer={
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button onClick={() => setPaymentPrompt(null)} style={{ padding: '8px 16px', border: `1px solid ${colors.border}`, background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
                            <button
                                onClick={handleConfirmPayment}
                                disabled={updateSaving}
                                style={{ padding: '8px 16px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: updateSaving ? 0.6 : 1 }}
                            >
                                {updateSaving ? 'Saving...' : '✅ Confirm & Close'}
                            </button>
                        </div>
                    }
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Customer Name</label>
                            <input type="text" value={paymentForm.cname} onChange={(e) => setPaymentForm((f) => ({ ...f, cname: e.target.value }))} style={styles.formInput} />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Service Charges (₹)</label>
                            <input type="number" value={paymentForm.service} onChange={(e) => setPaymentForm((f) => ({ ...f, service: e.target.value }))} style={styles.formInput} />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Parts Cost (₹)</label>
                            <input type="number" value={paymentForm.parts} onChange={(e) => setPaymentForm((f) => ({ ...f, parts: e.target.value }))} style={styles.formInput} />
                        </div>
                        <div style={{ background: '#f0fdf4', borderRadius: 8, padding: 12, borderLeft: '4px solid #15803d' }}>
                            <div style={{ fontSize: 12, color: '#15803d', fontWeight: 700 }}>Total Amount (₹)</div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: '#15803d' }}>
                                {((Number(paymentForm.service) || 0) + (Number(paymentForm.parts) || 0)).toFixed(0)}
                            </div>
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Payment Mode *</label>
                            <select value={paymentForm.mode} onChange={(e) => setPaymentForm((f) => ({ ...f, mode: e.target.value }))} style={styles.formInput}>
                                <option value="">— Select —</option>
                                <option value="Cash">💵 Cash</option>
                                <option value="Online">💻 Online</option>
                                <option value="Check">📋 Cheque</option>
                                <option value="Card">💳 Card</option>
                            </select>
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Additional Notes</label>
                            <textarea value={paymentForm.notes} onChange={(e) => setPaymentForm((f) => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Optional notes..." style={{ ...styles.formInput, resize: 'vertical' }} />
                        </div>
                    </div>
                </Modal>
            )}

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