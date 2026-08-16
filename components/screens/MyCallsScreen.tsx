'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useMyCalls } from '@/hooks/useMyCalls';
import { punchIn, punchOut, fetchPrevLocationMap, PrevLocation, startReturnTrip, finishReturnTrip, needsClosingKm } from '@/services/myCallsService';
import { colors, styles } from '@/styles/ticketsStyles';
import PunchModal from './PunchModal';
import KmCaptureModal from './tickets/KmCaptureModal';
import { hasKmEntryToday, hasArrivalKmForTicket } from '@/services/kmTrackingService';
import AIWriteButton from '@/components/shared/AIWriteButton';
import { tatLabel } from '@/utils/tatHelpers';
import Modal from '@/components/Modal';
import { getAllowedStatuses, isTicketActive } from '@/types/ticketStatus';
import { updateTicketStatus, fetchTicketById } from '@/services/engineerUpdateService';
import {
  fetchDailyReportAutofill, saveDailyReportSelf, fetchPastDailyReports,
  DrCallSummary, DailyReportRecord,
} from '@/services/engDailyReportService';
import { startVisit, stopVisit, doWorkStart, doWorkHold, recordReachedLocation, computeWorkPanel } from '@/services/visitStartService';
import { WorkPanel, VISIT_BLOCKED_STATUSES } from './EngineerUpdateScreen';
import WarrantyClaimModal from './tickets/WarrantyClaimModal';
import EngVoidWarrantyModal from './tickets/EngVoidWarrantyModal';
import PartIndentModal from './tickets/PartIndentModal';
import MSCDispatchPanel from './tickets/MSCDispatchPanel';
import { isCspManager } from '@/lib/permissions';
import { createTicket, ensureGroupId } from '@/services/ticketService';
import { useTicketForm } from '@/hooks/useTicketForm';
import { fetchTargets } from '@/services/targetsService';
import { EngineerTarget } from '@/types/targets';

// ─── Status badge helper ─────────────────────────────────────────────────────

function getStatusBadgeStyle(status: string): React.CSSProperties {
  const s = (status ?? '').toLowerCase();
  if (s === 'closed') return { ...styles.badge, ...styles.badgeClosed };
  if (s === 'open') return { ...styles.badge, ...styles.badgeOpen };
  if (s === 'in progress' || s === 'inprogress') return { ...styles.badge, ...styles.badgeProgress };
  if (s === 'repaired' || s === 'ready') return { ...styles.badge, ...styles.badgeApprove };
  if (s === 'on hold' || s === 'hold') return { ...styles.badge, ...styles.badgeHold };
  if (s.includes('cancel')) return { ...styles.badge, ...styles.badgeCancel };
  if (s.includes('reject')) return { ...styles.badge, ...styles.badgeReject };
  return { ...styles.badge, ...styles.badgeOpen };
}

function getPriorityBadgeStyle(priority: string): React.CSSProperties {
  const p = (priority ?? '').toLowerCase();
  if (p === 'high' || p === 'urgent') return { ...styles.badge, backgroundColor: '#fee2e2', color: '#dc2626' };
  if (p === 'medium') return { ...styles.badge, ...styles.badgeProgress };
  return { ...styles.badge, ...styles.badgeOpen };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MyCallsScreen() {
  const { data: session } = useSession();
  const engId = (session?.user as any)?.email ?? (session?.user as any)?.id ?? '';
  const engName = (session?.user as any)?.name ?? '';
  const roleType = (session?.user as any)?.roleType ?? '';
  const cspMgr = isCspManager(session);
  const memberRole = roleType === 'work_controller' ? 'WC' : 'Engineer';

  const { punchLog, workLogs, myTickets, loading, error, refetch } = useMyCalls(engId, engName);

  // Return to Office / Return to Home — mirrors HTML's rtoHtml bar in
  // renderMyCalls(): derived from today's open travel work_log entry.
  const [rtoBusy, setRtoBusy] = useState(false);
  const openReturnLog = workLogs.find((l: any) => l.to_time === 'OPEN' && ((l.task_description || '').includes('Return to Office') || (l.task_description || '').includes('Return to Home')));
  const isReturningToOffice = !!openReturnLog && (openReturnLog.task_description || '').includes('Return to Office');
  const isReturningToHome = !!openReturnLog && (openReturnLog.task_description || '').includes('Return to Home');

  // My Target — mirrors HTML's loadMyTargetWidget().
  const [myTarget, setMyTarget] = useState<EngineerTarget | null>(null);
  useEffect(() => {
    if (!engId) return;
    fetchTargets(new Date().toISOString().slice(0, 7)).then((rows) => {
      setMyTarget(rows.find((r) => r.eng_id === engId) || null);
    });
  }, [engId]);

  // New Call / Add Product (Same Customer) — mirrors HTML's openEngNewCall()
  // and addProductForSameCustomer() (the shared ticket-create form, reused
  // here from TicketsScreen's underlying services/hooks).
  const { formData: callForm, handleFormChange: handleCallFormChange, setFormValues: setCallFormValues, resetForm: resetCallForm } = useTicketForm();
  const [newCallOpen, setNewCallOpen] = useState(false);
  const [newCallSaving, setNewCallSaving] = useState(false);
  const [groupBanner, setGroupBanner] = useState<{ groupId: string; anchor: any } | null>(null);

  // Daily Report / Past Reports — mirrors HTML's My Calls header buttons.
  const [dailyReportOpen, setDailyReportOpen] = useState(false);
  const [pastReportsOpen, setPastReportsOpen] = useState(false);

  // Ticket list — mirrors HTML's My Calls ticket cards + Update modal
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<'active' | '' | 'closed'>('active');
  const [expandedAddr, setExpandedAddr] = useState<string | null>(null);
  const [updateTicket, setUpdateTicket] = useState<any | null>(null);
  const [updateForm, setUpdateForm] = useState({ newStatus: '', note: '', labour: '', faultCode: '' });
  const [updateSaving, setUpdateSaving] = useState(false);

  // Visit/Work panel + warranty/parts — mirrors EngineerUpdateScreen's fuller
  // Update modal (matches HTML's single shared openEngUpdate() everywhere).
  const [panelBusy, setPanelBusy] = useState(false);
  const [kmGateTicket, setKmGateTicket] = useState<any | null>(null);
  const [catchupTicket, setCatchupTicket] = useState<{ newTicket: any; skipTicketId: string } | null>(null);
  const [reachedTicket, setReachedTicket] = useState<any | null>(null);
  const [holdTicket, setHoldTicket] = useState<any | null>(null);
  const [holdRemark, setHoldRemark] = useState('');
  const [holdSaving, setHoldSaving] = useState(false);
  const [warrantyModalOpen, setWarrantyModalOpen] = useState(false);
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [partIndentOpen, setPartIndentOpen] = useState(false);

  // Previous Location — mirrors HTML's mcBuildPrevLocMap()/mcConfirmPrevLocation().
  const [prevLocMap, setPrevLocMap] = useState<Record<string, PrevLocation>>({});
  const [prevLocModal, setPrevLocModal] = useState<{ pl: PrevLocation; t: any } | null>(null);
  useEffect(() => {
    if (myTickets.length) fetchPrevLocationMap(myTickets).then(setPrevLocMap);
  }, [myTickets]);
  const hasPrevLoc = (t: any): PrevLocation | null => {
    const pl = t.serial ? prevLocMap[t.serial] : undefined;
    return pl && pl.ticketId !== t.id ? pl : null;
  };
  const handleConfirmPrevLocation = (t: any) => {
    const pl = hasPrevLoc(t);
    if (!pl) return;
    const msg = `📍 આ લોકેશન આ ડિવાઇસ (સિરિયલ: ${t.serial}) ની પાછલી વિઝિટ વખતે સેવ થયેલ છે.\n\nનેવિગેટ કરતા પહેલા એક વાર કન્ફર્મ કરો કે તમે એ જ સરનામે/જગ્યાએ જવાના છો — વચ્ચે કસ્ટમરનું લોકેશન બદલાઈ પણ ગયું હોઈ શકે છે.`;
    if (confirm(msg)) setPrevLocModal({ pl, t });
  };

  // Return to Office / Return to Home — mirrors HTML's startReturnToOffice()/
  // reachedOffice()/startReturnToHome()/reachedHome(). KM catch-up (skipped
  // arrival KM) is picked up first, same gate as the next call's Visit Start.
  const [rtoCatchupKind, setRtoCatchupKind] = useState<{ kind: 'office' | 'home'; skipTicketId: string } | null>(null);
  const [rtoClosingKind, setRtoClosingKind] = useState<{ kind: 'office' | 'home'; logId: string } | null>(null);

  const runStartReturnTrip = async (kind: 'office' | 'home') => {
    setRtoBusy(true);
    const r = await startReturnTrip(engId, engName, memberRole, kind);
    setRtoBusy(false);
    if (!r.success) { alert('Error: ' + r.error); return; }
    await refetch();
  };

  const handleStartReturnTrip = async (kind: 'office' | 'home') => {
    const today = new Date().toLocaleDateString('en-CA');
    const skipKey = `kmSkip_${engId}_${today}`;
    let skipTicket: string | null = null;
    try { skipTicket = window.localStorage.getItem(skipKey); } catch { /* localStorage unavailable */ }
    if (skipTicket) { setRtoCatchupKind({ kind, skipTicketId: skipTicket }); return; }
    await runStartReturnTrip(kind);
  };

  const handleRtoCatchupDone = async () => {
    if (!rtoCatchupKind) return;
    const { kind } = rtoCatchupKind;
    try { window.localStorage.removeItem(`kmSkip_${engId}_${new Date().toLocaleDateString('en-CA')}`); } catch { /* localStorage unavailable */ }
    setRtoCatchupKind(null);
    await runStartReturnTrip(kind);
  };

  const finishReturn = async (logId: string, kind: 'office' | 'home') => {
    setRtoBusy(true);
    const r = await finishReturnTrip(logId, engId, engName, memberRole, kind);
    setRtoBusy(false);
    if (!r.success) { alert('Error: ' + r.error); return; }
    await refetch();
  };

  const handleReachedReturn = async (logId: string, kind: 'office' | 'home') => {
    const needsClosing = await needsClosingKm(engId);
    if (needsClosing) { setRtoClosingKind({ kind, logId }); return; }
    await finishReturn(logId, kind);
  };

  const handleRtoClosingDone = async () => {
    if (!rtoClosingKind) return;
    const { logId, kind } = rtoClosingKind;
    setRtoClosingKind(null);
    await finishReturn(logId, kind);
  };

  // New Call / Add Product (Same Customer) — mirrors HTML's openEngNewCall().
  const handleOpenNewCall = () => {
    resetCallForm();
    setGroupBanner(null);
    setCallFormValues({ assigned_to: engId, assigned_name: engName });
    setNewCallOpen(true);
  };

  const handleAddProductSameCustomer = async (t: any) => {
    const r = await ensureGroupId(t);
    if (!r.success || !r.groupId) { alert('❌ ' + (r.error || 'Could not link call group')); return; }
    resetCallForm();
    setCallFormValues({
      cname: t.cname, mobile: t.mobile, alt_mobile: t.alt_mobile || '', address: t.address || '',
      city: t.city || '', state: t.state || 'Gujarat', pin: t.pin || '', area: t.area || '',
      brand_name: t.brand_name || '', wc_type: t.wc_type || 'ICP',
      assigned_to: engId, assigned_name: engName,
    });
    setGroupBanner({ groupId: r.groupId, anchor: t });
    setNewCallOpen(true);
  };

  const handleSaveNewCall = async () => {
    if (!callForm.cname || !callForm.mobile || !callForm.serial) { alert('❌ Fill required fields'); return; }
    setNewCallSaving(true);
    const ticketData: any = { ...callForm };
    if (groupBanner) ticketData.group_id = groupBanner.groupId;
    const result = await createTicket(ticketData);
    setNewCallSaving(false);
    if (!result.success) { alert('❌ Error: ' + result.error); return; }
    alert('✅ Created! ID: ' + result.id);
    setNewCallOpen(false);
    setGroupBanner(null);
    resetCallForm();
    await refetch();
  };

  const openTicketUpdate = (t: any) => {
    setUpdateTicket(t);
    const allowed = getAllowedStatuses(t.status, 'engineer', t.service_type, t.call_type, t.warranty_coverage);
    setUpdateForm({ newStatus: allowed[0] || '', note: '', labour: String(t.labor || t.service_charges || ''), faultCode: t.fault_code || '' });
  };

  const allowedForUpdate = updateTicket
    ? getAllowedStatuses(updateTicket.status, 'engineer', updateTicket.service_type, updateTicket.call_type, updateTicket.warranty_coverage)
    : [];

  // Refreshes the open modal's ticket in place after a panel action, without
  // dropping the modal (mirrors EngineerUpdateScreen's reloadSelected()).
  const reloadUpdateTicket = async (id: string) => {
    const fresh = await fetchTicketById(id);
    if (fresh) setUpdateTicket(fresh);
    await refetch();
  };

  const handleVisitStart = async (t: any) => {
    if (roleType === 'engineer' && t.service_type !== 'Carry In') {
      const today = new Date().toLocaleDateString('en-CA');
      const skipKey = `kmSkip_${engId}_${today}`;
      let skipTicket: string | null = null;
      try { skipTicket = window.localStorage.getItem(skipKey); } catch { /* localStorage unavailable */ }
      if (skipTicket) { setCatchupTicket({ newTicket: t, skipTicketId: skipTicket }); return; }
      const hasOpening = await hasKmEntryToday(engId, 'opening');
      if (!hasOpening) { setKmGateTicket(t); return; }
    }
    setPanelBusy(true);
    const r = await startVisit(t, engId, engName, roleType);
    setPanelBusy(false);
    if (!r.success) alert('Error: ' + r.error); else await reloadUpdateTicket(t.id);
  };

  const handleVisitStop = async (t: any) => {
    setPanelBusy(true);
    const r = await stopVisit(t, engId, engName);
    setPanelBusy(false);
    if (!r.success) alert('Error: ' + r.error); else await reloadUpdateTicket(t.id);
  };

  const handleKmGateDone = async () => {
    if (!kmGateTicket) return;
    const t = kmGateTicket;
    setKmGateTicket(null);
    setPanelBusy(true);
    const r = await startVisit(t, engId, engName, roleType);
    setPanelBusy(false);
    if (!r.success) alert('Error: ' + r.error); else await reloadUpdateTicket(t.id);
  };

  const handleCatchupDone = async () => {
    if (!catchupTicket) return;
    const { newTicket } = catchupTicket;
    try { window.localStorage.removeItem(`kmSkip_${engId}_${new Date().toLocaleDateString('en-CA')}`); } catch { /* localStorage unavailable */ }
    setCatchupTicket(null);
    await handleVisitStart(newTicket);
  };

  const handleWorkStart = async (t: any) => {
    setPanelBusy(true);
    const r = await doWorkStart(t, engId, engName, roleType);
    setPanelBusy(false);
    if (!r.success) { alert('Error: ' + r.error); return; }
    alert(`Work Started! ✅ Time In: ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`);
    await reloadUpdateTicket(t.id);
  };

  const handleReachedLocationClick = async (t: any) => {
    const already = await hasArrivalKmForTicket(engId, t.id);
    if (already) { alert('✅ Arrival KM is already recorded for this call today.'); return; }
    setReachedTicket(t);
  };

  const handleReachedLocationDone = async (skipped?: boolean) => {
    if (!reachedTicket) return;
    const t = reachedTicket;
    setReachedTicket(null);
    const r = await recordReachedLocation(t, engId, engName, !!skipped);
    if (!r.success) { alert('Error: ' + r.error); return; }
    if (skipped) { try { window.localStorage.setItem(`kmSkip_${engId}_${new Date().toLocaleDateString('en-CA')}`, t.id); } catch { /* localStorage unavailable */ } }
    alert(`📍 Reached Location saved${skipped ? '\n\n⏭️ KM skip karyu — next call na Visit Start (travel start) par farjiyat KM levase.' : ''}\n\nNow go inside and tap 🔧 Work Start when you begin work.`);
    await reloadUpdateTicket(t.id);
  };

  const handleConfirmHold = async () => {
    if (!holdTicket) return;
    if (!holdRemark.trim()) { alert('Reason is mandatory!'); return; }
    setHoldSaving(true);
    const r = await doWorkHold(holdTicket, engId, engName, holdRemark.trim());
    setHoldSaving(false);
    if (!r.success) { alert('Error: ' + r.error); return; }
    const t = holdTicket;
    setHoldTicket(null); setHoldRemark('');
    alert('Work paused ✅\nYou can now go to another call.\nCome back and tap Work Start to resume.');
    await reloadUpdateTicket(t.id);
  };

  const workPanel = updateTicket ? computeWorkPanel(updateTicket) : null;

  const handleTicketUpdateSave = async () => {
    if (!updateTicket || !updateForm.newStatus) { alert('Select new status'); return; }
    setUpdateSaving(true);
    const r = await updateTicketStatus(updateTicket, updateForm.newStatus, updateForm.note, updateForm.labour, engName, updateForm.faultCode);
    setUpdateSaving(false);
    if (r.success) { setUpdateTicket(null); refetch(); }
    else alert('Error: ' + r.error);
  };

  // ── Punch In / Out ───────────────────────────────────────────────────────────
  const [punchModalMode, setPunchModalMode] = useState<'in' | 'out' | null>(null);
  const [kmCaptureType, setKmCaptureType] = useState<'opening' | 'closing' | null>(null);

  const handlePunchIn = async () => {
    const hasOpening = await hasKmEntryToday(engId, 'opening');
    if (!hasOpening) { setKmCaptureType('opening'); return; }
    setPunchModalMode('in');
  };
  const handlePunchOut = async () => {
    const hasClosing = await hasKmEntryToday(engId, 'closing');
    if (!hasClosing) { setKmCaptureType('closing'); return; }
    setPunchModalMode('out');
  };

  const handlePunchSubmit = async (data: { photo: string; lat: number | null; lng: number | null; meter: string; remark?: string }) => {
    if (punchModalMode === 'in') {
      const today = new Date().toLocaleDateString('en-CA');
      const currentTime = new Date().toTimeString().slice(0, 5);
      const result = await punchIn({
        eng_id: engId,
        eng_name: engName,
        punch_in_date: today,
        punch_in_time: currentTime,
        start_meter: data.meter ? Number(data.meter) : undefined,
        photo: data.photo,
        lat: data.lat,
        lng: data.lng,
      });
      if (result.success) refetch();
      return result;
    } else {
      const currentTime = new Date().toTimeString().slice(0, 5);
      const result = await punchOut({
        eng_id: engId,
        punch_out_time: currentTime,
        end_meter: data.meter ? Number(data.meter) : undefined,
        photo: data.photo,
        lat: data.lat,
        lng: data.lng,
        lateRemark: data.remark,
      });
      if (result.success) refetch();
      return result;
    }
  };

  // ── Derived KPIs ──────────────────────────────────────────────────────────
  const activeTickets = myTickets.filter((t) => isTicketActive(t.status));
  const closedTickets = myTickets.filter((t) => !isTicketActive(t.status));
  const todayDateStr = new Date().toLocaleDateString('en-CA');
  const todayRoute = myTickets
    .filter((t) => t.planned_date === todayDateStr && isTicketActive(t.status))
    .sort((a, b) => (a.sequence_no ?? 999) - (b.sequence_no ?? 999));

  // My Daily Calls chart — mirrors HTML's last7 bar chart in renderMyCalls().
  const dailyCounts: Record<string, number> = {};
  myTickets.forEach((t) => {
    if (!t.created_at) return;
    const d = new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    dailyCounts[d] = (dailyCounts[d] || 0) + 1;
  });
  const last7 = Object.entries(dailyCounts).slice(-7);
  const maxDaily = Math.max(...last7.map(([, v]) => v), 1);

  // My Target — mirrors HTML's loadMyTargetWidget() progress bar.
  const targetCalls = myTarget?.target_calls || 0;
  const targetMonth = new Date().toISOString().slice(0, 7);
  const closedThisMonth = myTickets.filter((t) => t.status === 'Closed' && t.updated_at && t.updated_at.slice(0, 7) === targetMonth).length;
  const targetPct = targetCalls ? Math.min(100, Math.round((closedThisMonth / targetCalls) * 100)) : 0;
  const targetColor = targetPct >= 80 ? '#0e9f6e' : targetPct >= 50 ? '#f59e0b' : '#f05252';
  const targetEmoji = targetPct >= 100 ? '🏆' : targetPct >= 80 ? '🔥' : targetPct >= 50 ? '💪' : '🎯';

  // CSP managers can browse closed calls too (matches HTML's window._isCspMgr
  // gate); regular engineers only ever see their open calls.
  const statusFilteredTickets = !cspMgr ? activeTickets
    : ticketStatusFilter === 'closed' ? closedTickets
      : ticketStatusFilter === '' ? myTickets
        : activeTickets;

  const ticketSearchQ = ticketSearch.trim().toLowerCase();
  const visibleTickets = statusFilteredTickets.filter((t) => {
    if (!ticketSearchQ) return true;
    return (t.id || '').toLowerCase().includes(ticketSearchQ)
      || (t.cname || '').toLowerCase().includes(ticketSearchQ)
      || (t.mobile || '').includes(ticketSearchQ)
      || (t.model || '').toLowerCase().includes(ticketSearchQ)
      || (t.serial || '').toLowerCase().includes(ticketSearchQ);
  }).sort((a, b) => {
    // Active calls bubble to the top even in "All Status", then newest first
    // within each group — matches HTML's sort in renderMyCalls().
    const aOpen = isTicketActive(a.status);
    const bOpen = isTicketActive(b.status);
    if (aOpen !== bOpen) return aOpen ? -1 : 1;
    return (b.id || '').localeCompare(a.id || '');
  });

  // ── Loading / Error ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ ...styles.loadingText, fontSize: '15px', padding: '60px' }}>
        Loading your calls...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: colors.danger, fontWeight: 600 }}>
        ❌ {error}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '20px', backgroundColor: colors.bg, minHeight: '100vh' }}>

      {/* 1. Header */}
      <div style={{ ...styles.sectionHeader, marginBottom: '20px' }}>
        <h2 style={{ ...styles.sectionTitle, fontSize: '22px' }}>📞 My Calls</h2>
      </div>

      {/* 2. Punch Bar */}
      <div
        style={{
          ...styles.card,
          background: 'linear-gradient(135deg, #1a56db 0%, #1240a8 100%)',
          marginBottom: '20px',
          color: '#fff',
        }}
      >
        {!punchLog?.punch_in_time ? (
          /* Not punched in */
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontSize: '16px', fontWeight: 600 }}>🟢 Not Punched In</span>
            <button
              onClick={handlePunchIn}
              style={{
                ...styles.btn,
                backgroundColor: '#0e9f6e',
                color: '#fff',
                fontSize: '14px',
              }}
            >
              ▶ Punch In
            </button>
          </div>
        ) : !punchLog.punch_out_time ? (
          /* Punched in — on duty */
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>
                🔴 On Duty since {punchLog.punch_in_time}
              </div>
              {punchLog.start_meter !== undefined && punchLog.start_meter !== null && (
                <div style={{ fontSize: '13px', opacity: 0.85 }}>
                  Start Meter: {punchLog.start_meter}
                </div>
              )}
            </div>
            <button
              onClick={handlePunchOut}
              style={{
                ...styles.btn,
                backgroundColor: colors.danger,
                color: '#fff',
                fontSize: '14px',
              }}
            >
              ⏹ Punch Out
            </button>
          </div>
        ) : (
          /* Punched out — day complete */
          <div style={{ fontSize: '16px', fontWeight: 600 }}>
            ✅ {punchLog.punch_in_time} → {punchLog.punch_out_time}
          </div>
        )}
      </div>

      {kmCaptureType && (
        <KmCaptureModal
          type={kmCaptureType}
          engId={engId}
          engName={engName}
          onClose={() => setKmCaptureType(null)}
          onDone={() => { const mode = kmCaptureType === 'opening' ? 'in' : 'out'; setKmCaptureType(null); setPunchModalMode(mode); }}
        />
      )}
      {punchModalMode && (
        <PunchModal mode={punchModalMode} onSubmit={handlePunchSubmit} onClose={() => setPunchModalMode(null)} />
      )}

      {/* 2b. Return to Office / Return to Home — mirrors HTML's rtoHtml bar. */}
      {punchLog?.punch_in_time && !punchLog?.punch_out_time && (
        openReturnLog ? (
          <div style={{ background: isReturningToOffice ? '#1e3a5f' : '#3f2d5c', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, borderRadius: 10, flexWrap: 'wrap' }}>
            <div style={{ color: isReturningToOffice ? '#93c5fd' : '#d8b4fe', fontSize: 13, fontWeight: 600 }}>
              🚗 Traveling to {isReturningToOffice ? 'Office' : 'Home'}... (since {openReturnLog.from_time})
            </div>
            <button
              disabled={rtoBusy}
              onClick={() => handleReachedReturn(openReturnLog.id, isReturningToOffice ? 'office' : 'home')}
              style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: rtoBusy ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: rtoBusy ? 0.6 : 1 }}
            >
              ✅ Reached {isReturningToOffice ? 'Office' : 'Home'}
            </button>
          </div>
        ) : (
          <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, borderRadius: 10, flexWrap: 'wrap' }}>
            <div style={{ color: '#166534', fontSize: 13, fontWeight: 600 }}>🏁 End of day — mark your return trip</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button disabled={rtoBusy} onClick={() => handleStartReturnTrip('office')} style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: rtoBusy ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: rtoBusy ? 0.6 : 1 }}>🏢 Return to Office</button>
              <button disabled={rtoBusy} onClick={() => handleStartReturnTrip('home')} style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: rtoBusy ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: rtoBusy ? 0.6 : 1 }}>🏡 Return to Home</button>
            </div>
          </div>
        )
      )}
      {rtoCatchupKind && (
        <KmCaptureModal
          type="arrival"
          engId={engId}
          engName={engName}
          ticketId={rtoCatchupKind.skipTicketId}
          onClose={() => setRtoCatchupKind(null)}
          onDone={handleRtoCatchupDone}
        />
      )}
      {rtoClosingKind && (
        <KmCaptureModal
          type="closing"
          engId={engId}
          engName={engName}
          allowSkip
          onClose={() => setRtoClosingKind(null)}
          onDone={handleRtoClosingDone}
        />
      )}

      {/* 3. KPI Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {[
          { label: 'Total', value: myTickets.length, color: colors.primary },
          { label: 'Active', value: activeTickets.length, color: colors.warning },
          { label: 'Closed', value: closedTickets.length, color: colors.success },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              ...styles.card,
              textAlign: 'center',
              borderTop: `3px solid ${kpi.color}`,
            }}
          >
            <div style={{ fontSize: '26px', fontWeight: 700, color: kpi.color }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '4px' }}>
              {kpi.label}
            </div>
          </div>
        ))}
      </div>

      {/* 4. Today's Route */}
      {todayRoute.length > 0 && (
        <div style={{ ...styles.card, marginBottom: '20px' }}>
          <div style={{ ...styles.sectionHeader, marginBottom: '12px' }}>
            <span style={{ ...styles.sectionTitle, fontSize: '15px' }}>🗺️ Today's Route</span>
            <span style={{ fontSize: '12px', color: colors.textMuted }}>{todayRoute.length} calls planned</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {['Seq #', 'Ticket ID', 'Customer', 'Mobile', 'Area', 'Status', 'TAT'].map((h) => (
                    <th key={h} style={styles.tableHeader}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {todayRoute.map((ticket) => {
                  const tat = tatLabel(ticket.tat_date);
                  return (
                    <tr key={ticket.id} style={styles.tableRow}>
                      <td style={{ ...styles.tableCell, textAlign: 'center' }}>{ticket.sequence_no ?? '—'}</td>
                      <td style={{ ...styles.tableCell, fontWeight: 600, color: colors.primary }}>{ticket.id}</td>
                      <td style={styles.tableCell}>{ticket.cname ?? '—'}</td>
                      <td style={styles.tableCell}>{ticket.mobile ?? '—'}</td>
                      <td style={styles.tableCell}>{ticket.area ?? '—'}</td>
                      <td style={styles.tableCell}>
                        <span style={getStatusBadgeStyle(ticket.status)}>{ticket.status}</span>
                      </td>
                      <td style={{ ...styles.tableCell, fontSize: 11, fontWeight: 700, color: tat.overdue ? '#dc2626' : '#166534' }}>
                        {tat.text}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. My Daily Calls chart — mirrors HTML's last7 bar chart. */}
      {last7.length > 0 && (
        <div style={{ ...styles.card, marginBottom: '20px' }}>
          <div style={{ ...styles.sectionTitle, fontSize: '15px', marginBottom: '12px' }}>📊 My Daily Calls</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {last7.map(([d, v]) => (
              <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 50, fontSize: 12, color: colors.textMuted, flexShrink: 0 }}>{d}</div>
                <div style={{ flex: 1, background: colors.bg, borderRadius: 6, overflow: 'hidden', height: 22 }}>
                  <div style={{ background: colors.primary, height: '100%', width: `${Math.round((v / maxDaily) * 100)}%`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6, color: '#fff', fontSize: 11, fontWeight: 700 }}>
                    {v}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5b. My Target — mirrors HTML's loadMyTargetWidget(). */}
      {targetCalls > 0 && (
        <div style={{ ...styles.card, marginBottom: '20px', borderLeft: `4px solid ${targetColor}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
              {targetEmoji} {new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })} Target
            </h3>
            <span style={{ fontSize: 20, fontWeight: 800, color: targetColor }}>{closedThisMonth} / {targetCalls}</span>
          </div>
          <div style={{ background: '#f1f5f9', borderRadius: 99, height: 14, overflow: 'hidden' }}>
            <div style={{ background: targetColor, height: '100%', width: `${targetPct}%`, borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6 }}>
              {targetPct > 15 && <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>{targetPct}%</span>}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: colors.textMuted }}>
            <span>Closed this month</span><span>Target: {targetCalls} calls</span>
          </div>
          {!!myTarget?.target_amount && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#065f46', fontWeight: 600 }}>💰 Revenue Target: ₹{myTarget.target_amount}</div>
          )}
        </div>
      )}

      {/* 5c. My Tickets — searchable list with Update action */}
      <div style={{ ...styles.card, marginBottom: '20px' }}>
        <div style={{ ...styles.sectionHeader, marginBottom: '12px' }}>
          <span style={{ ...styles.sectionTitle, fontSize: '15px' }}>🎫 My Calls ({visibleTickets.length})</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setPastReportsOpen(true)} style={{ ...styles.btn, ...styles.btnOutline, ...styles.btnSm }}>🕐 Past Reports</button>
            <button onClick={() => setDailyReportOpen(true)} style={{ ...styles.btn, ...styles.btnOutline, ...styles.btnSm }}>📋 Daily Report</button>
            <button onClick={handleOpenNewCall} style={{ ...styles.btn, ...styles.btnPrimary, ...styles.btnSm }}>➕ New Call</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="🔍 Search ticket, customer, mobile, model, serial..."
            value={ticketSearch}
            onChange={(e) => setTicketSearch(e.target.value)}
            style={{ ...styles.formInput, flex: 1, minWidth: 200 }}
          />
          {cspMgr && (
            <select value={ticketStatusFilter} onChange={(e) => setTicketStatusFilter(e.target.value as any)} style={{ ...styles.formInput, width: 140 }}>
              <option value="active">Active Only</option>
              <option value="">All Status</option>
              <option value="closed">Closed Only</option>
            </select>
          )}
        </div>
        {visibleTickets.length === 0 ? (
          <div style={styles.emptyMessage}>No calls</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {visibleTickets.map((t) => {
              const tat = tatLabel(t.tat_date);
              const addr = [t.address, t.area, t.city, t.state, t.pin].filter(Boolean).join(', ');
              return (
                <div key={t.id} style={{ border: `1.5px solid ${colors.border}`, borderRadius: '12px', padding: '14px 16px', background: '#f0f7ff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: colors.primary }}>
                        {t.id}{' '}
                        {t.priority && <span style={getPriorityBadgeStyle(t.priority)}>{t.priority}</span>}
                        {t.se_call_id && (
                          <span style={{ ...styles.badge, backgroundColor: '#fef3c7', color: '#92400e', marginLeft: '4px' }}>
                            SE: {t.se_call_id}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '2px' }}>{t.cname || '—'}</div>
                      {t.problem && (
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#b45309', marginTop: '2px' }}>🔧 {t.problem}</div>
                      )}
                    </div>
                    <span style={getStatusBadgeStyle(t.status)}>{t.status}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: '12px', color: colors.textMuted, marginBottom: '10px' }}>
                    <div>📱 <b style={{ color: colors.text }}>{t.model || '—'}</b></div>
                    <div>🔢 <b style={{ color: colors.text }}>{t.serial || '—'}</b></div>
                    <div>
                      📞 <a href={`tel:${t.mobile}`} style={{ color: colors.primary, fontWeight: 600 }}>{t.mobile || '—'}</a>
                      {t.mobile && (
                        <a href={`https://wa.me/91${(t.mobile || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ color: '#25D366', marginLeft: '4px' }}>💬</a>
                      )}
                    </div>
                    <div style={{ fontWeight: 700, color: tat.overdue ? '#dc2626' : '#166534' }}>⏱ TAT: {tat.text}</div>
                    {t.alt_mobile && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        📞 Alt: <a href={`tel:${t.alt_mobile}`} style={{ color: colors.primary, fontWeight: 600 }}>{t.alt_mobile}</a>
                        <a href={`https://wa.me/91${(t.alt_mobile || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ color: '#25D366', marginLeft: '4px' }}>💬</a>
                      </div>
                    )}
                  </div>
                  {addr && (
                    <div
                      onClick={() => setExpandedAddr(expandedAddr === t.id ? null : t.id)}
                      style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', fontWeight: 700, color: '#166534', marginBottom: '8px' }}
                    >
                      📍 Address <span style={{ fontSize: '9px' }}>▼</span>
                    </div>
                  )}
                  {addr && expandedAddr === t.id && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '8px 10px', marginBottom: '8px', fontSize: '12px', color: '#166534' }}>
                      <div>{addr}</div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([t.address, t.area, t.city, t.state].filter(Boolean).join(', '))}`}
                        target="_blank" rel="noreferrer"
                        style={{ display: 'inline-block', marginTop: '4px', color: colors.primary, fontWeight: 600, fontSize: '11px' }}
                      >
                        🗺️ Open in Maps
                      </a>
                    </div>
                  )}
                  {hasPrevLoc(t) && (
                    <div
                      onClick={() => handleConfirmPrevLocation(t)}
                      style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', fontWeight: 700, color: colors.primary, marginBottom: '8px', marginLeft: addr ? '6px' : 0 }}
                    >
                      📍 Previous Location
                    </div>
                  )}
                  <div
                    onClick={() => handleAddProductSameCustomer(t)}
                    style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', fontWeight: 700, color: '#065f46', marginBottom: '8px', marginLeft: (addr || hasPrevLoc(t)) ? '6px' : 0 }}
                  >
                    ➕ Add Product (Same Customer)
                  </div>
                  <button
                    onClick={() => openTicketUpdate(t)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px', fontWeight: 700, border: 'none', cursor: 'pointer', background: isTicketActive(t.status) ? colors.primary : '#f1f5f9', color: isTicketActive(t.status) ? '#fff' : colors.text }}
                  >
                    {isTicketActive(t.status) ? '✏️ Update' : '👁️ View'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {dailyReportOpen && (
        <DailyReportModal engId={engId} engName={engName} onClose={() => setDailyReportOpen(false)} />
      )}
      {pastReportsOpen && (
        <PastReportsPanel engId={engId} onClose={() => setPastReportsOpen(false)} />
      )}

      {updateTicket && (
        <Modal
          isOpen
          onClose={() => setUpdateTicket(null)}
          title={`Update — ${updateTicket.cname || ''}`}
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
            <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, fontSize: 13 }}>
              <div style={{ fontWeight: 600 }}>{updateTicket.brand_name} {updateTicket.model} | {updateTicket.serial}</div>
              <div style={{ color: '#6b7280', marginTop: 2 }}>{updateTicket.problem}</div>
            </div>

            {!VISIT_BLOCKED_STATUSES.includes(updateTicket.status || '') && workPanel && (
              <WorkPanel
                panel={workPanel}
                busy={panelBusy}
                onVisitStart={() => handleVisitStart(updateTicket)}
                onVisitStop={() => handleVisitStop(updateTicket)}
                onWorkStart={() => handleWorkStart(updateTicket)}
                onReachedLocation={() => handleReachedLocationClick(updateTicket)}
                onWorkHold={() => setHoldTicket(updateTicket)}
              />
            )}

            {(updateTicket.call_type === 'Non-Warranty' || updateTicket.call_type === 'Non-Warranty Repeat') && !updateTicket.warranty_claim_pending && (
              <button onClick={() => setWarrantyModalOpen(true)} style={{ padding: '8px 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>🔓 Submit Warranty Claim</button>
            )}
            {updateTicket.warranty_claim_pending && (
              <div style={{ background: '#fef3c7', color: '#92400e', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600 }}>⏳ Warranty claim pending review</div>
            )}
            {updateTicket.warranty_coverage !== 'Out of Coverage' && (
              <button onClick={() => setVoidModalOpen(true)} style={{ padding: '8px 14px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>⚠️ Mark Out of Coverage</button>
            )}
            {updateTicket.status === 'Sent to MSC' && (
              <MSCDispatchPanel ticketId={updateTicket.id} readOnly byUser={engName} />
            )}
            {!['Closed', 'Call Cancel', 'Customer Reject', 'Pending Customer Approval'].includes(updateTicket.status || '') && (
              <button onClick={() => setPartIndentOpen(true)} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, alignSelf: 'flex-start' }}>📦 Request Part</button>
            )}

            {allowedForUpdate.length > 0 ? (
              <>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>New Status *</label>
                  <select value={updateForm.newStatus} onChange={(e) => setUpdateForm((f) => ({ ...f, newStatus: e.target.value }))} style={styles.formInput}>
                    <option value="">Select status...</option>
                    {allowedForUpdate.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {updateForm.newStatus === 'Closed' && (
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Service / Labour ₹</label>
                    <input type="number" value={updateForm.labour} onChange={(e) => setUpdateForm((f) => ({ ...f, labour: e.target.value }))} style={styles.formInput} placeholder="0" />
                  </div>
                )}
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Fault Code</label>
                  <input type="text" value={updateForm.faultCode} onChange={(e) => setUpdateForm((f) => ({ ...f, faultCode: e.target.value }))} style={styles.formInput} />
                </div>
                <div style={styles.formGroup}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={styles.formLabel}>Update Note</label>
                    <AIWriteButton type="update" onInsert={(text) => setUpdateForm((f) => ({ ...f, note: text }))} />
                  </div>
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

      {warrantyModalOpen && updateTicket && (
        <WarrantyClaimModal
          ticket={updateTicket}
          submittedBy={engName}
          onClose={() => setWarrantyModalOpen(false)}
          onDone={async () => { setWarrantyModalOpen(false); setUpdateTicket(null); await refetch(); }}
        />
      )}
      {voidModalOpen && updateTicket && (
        <EngVoidWarrantyModal
          ticket={updateTicket}
          byUser={engName}
          onClose={() => setVoidModalOpen(false)}
          onDone={async () => { setVoidModalOpen(false); setUpdateTicket(null); await refetch(); }}
        />
      )}
      {partIndentOpen && updateTicket && (
        <PartIndentModal
          ticket={updateTicket}
          byUser={engName}
          isEngineerOnSite={updateTicket.service_type === 'On Site'}
          onClose={() => setPartIndentOpen(false)}
          onDone={async () => { setPartIndentOpen(false); setUpdateTicket(null); await refetch(); }}
        />
      )}
      {kmGateTicket && (
        <KmCaptureModal
          type="opening"
          engId={engId}
          engName={engName}
          ticketId={null}
          onClose={() => setKmGateTicket(null)}
          onDone={handleKmGateDone}
        />
      )}
      {catchupTicket && (
        <KmCaptureModal
          type="arrival"
          engId={engId}
          engName={engName}
          ticketId={catchupTicket.skipTicketId}
          onClose={() => setCatchupTicket(null)}
          onDone={handleCatchupDone}
        />
      )}
      {reachedTicket && (
        <KmCaptureModal
          type="arrival"
          engId={engId}
          engName={engName}
          ticketId={reachedTicket.id}
          allowSkip
          onClose={() => setReachedTicket(null)}
          onDone={handleReachedLocationDone}
        />
      )}
      {holdTicket && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: 360, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#92400e', marginBottom: 6 }}>⏸️ Work on Hold</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Work log will be paused. You can start another call and come back to resume this one.</div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Reason for hold <span style={{ color: '#dc2626' }}>*</span></label>
              <textarea
                value={holdRemark}
                onChange={(e) => setHoldRemark(e.target.value)}
                rows={3}
                placeholder="e.g. Customer not available, waiting for part, going to urgent call..."
                style={{ width: '100%', border: '1.5px solid #d1d5db', borderRadius: 8, padding: 10, fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setHoldTicket(null); setHoldRemark(''); }} style={{ flex: 1, padding: 10, background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={handleConfirmHold} disabled={holdSaving} style={{ flex: 1, padding: 10, background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: holdSaving ? 0.6 : 1 }}>
                {holdSaving ? 'Saving...' : '⏸️ Put on Hold'}
              </button>
            </div>
          </div>
        </div>
      )}

      {prevLocModal && (
        <Modal
          isOpen
          onClose={() => setPrevLocModal(null)}
          title={`📍 Previous Location — ${prevLocModal.t.cname || prevLocModal.t.serial}`}
          footer={
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <button onClick={() => setPrevLocModal(null)} style={{ flex: 1, padding: '8px 16px', border: `1px solid ${colors.border}`, background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>⬅ Back to My Calls</button>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${prevLocModal.pl.lat},${prevLocModal.pl.lng}`}
                target="_blank" rel="noreferrer"
                style={{ flex: 1, textAlign: 'center', textDecoration: 'none', padding: '8px 16px', background: colors.primary, color: '#fff', borderRadius: 6, fontSize: 14, fontWeight: 600 }}
              >
                🧭 Get Directions
              </a>
            </div>
          }
        >
          <div style={{ fontSize: 12, color: colors.textMuted }}>
            Recorded {new Date(prevLocModal.pl.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })} (Ticket {prevLocModal.pl.ticketId})
          </div>
        </Modal>
      )}

      {newCallOpen && (
        <Modal
          isOpen
          onClose={() => { setNewCallOpen(false); setGroupBanner(null); }}
          title="➕ New Call"
          footer={
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setNewCallOpen(false); setGroupBanner(null); }} style={{ padding: '8px 16px', border: `1px solid ${colors.border}`, background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button
                onClick={handleSaveNewCall}
                disabled={newCallSaving}
                style={{ padding: '8px 16px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: newCallSaving ? 0.6 : 1 }}
              >
                {newCallSaving ? 'Saving...' : '💾 Save'}
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {groupBanner && (
              <div style={{ background: '#ecfdf5', border: '1.5px solid #6ee7b7', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#065f46' }}>
                🔗 Linked to Call Group <b>{groupBanner.groupId}</b> — Customer/Address/Brand same as {groupBanner.anchor.id} used. Just fill in Model No, Serial No, Call Type &amp; Problem — Save creates a new ticket ID under the same group.
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Name *</label>
                <input type="text" name="cname" value={callForm.cname} onChange={handleCallFormChange} style={styles.formInput} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Mobile *</label>
                <input type="text" name="mobile" value={callForm.mobile} onChange={handleCallFormChange} style={styles.formInput} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>City *</label>
                <input type="text" name="city" value={callForm.city} onChange={handleCallFormChange} style={styles.formInput} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Alt Mobile</label>
                <input type="text" name="alt_mobile" value={callForm.alt_mobile} onChange={handleCallFormChange} style={styles.formInput} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>State</label>
                <input type="text" name="state" value={callForm.state} onChange={handleCallFormChange} style={styles.formInput} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>PIN</label>
                <input type="text" name="pin" value={callForm.pin} onChange={handleCallFormChange} style={styles.formInput} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Area</label>
                <input type="text" name="area" value={callForm.area} onChange={handleCallFormChange} style={styles.formInput} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Address</label>
                <input type="text" name="address" value={callForm.address} onChange={handleCallFormChange} style={styles.formInput} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Brand</label>
                <input type="text" name="brand_name" value={callForm.brand_name} onChange={handleCallFormChange} style={styles.formInput} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Model</label>
                <input type="text" name="model" value={callForm.model} onChange={handleCallFormChange} style={styles.formInput} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Serial *</label>
                <input type="text" name="serial" value={callForm.serial} onChange={handleCallFormChange} style={styles.formInput} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Call Type</label>
                <select name="call_type" value={callForm.call_type} onChange={handleCallFormChange} style={styles.formInput}>
                  {['Warranty', 'Non-Warranty', 'AMC'].map((o) => (<option key={o} value={o}>{o}</option>))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>SE Call ID</label>
                <input type="text" name="se_call_id" value={callForm.se_call_id} onChange={handleCallFormChange} style={styles.formInput} />
              </div>
            </div>
            <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
              <label style={styles.formLabel}>Problem *</label>
              <textarea name="problem" value={callForm.problem} onChange={handleCallFormChange} rows={2} style={{ ...styles.formInput, fontFamily: 'inherit', width: '100%' }} />
            </div>
            <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
              <label style={styles.formLabel}>Description</label>
              <textarea name="description" value={callForm.description} onChange={handleCallFormChange} rows={2} style={{ ...styles.formInput, fontFamily: 'inherit', width: '100%' }} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Daily Report ────────────────────────────────────────────────────────────
// Mirrors HTML's openDailyReport()/saveDailyReport() — call-summary counts
// (auto-filled, editable), pending backlog, petrol KM and remarks. The
// office-work/payment/review/site-visit sub-forms from HTML's monolithic
// modal are intentionally left out — this app already has dedicated Field
// Tasks, Payment Collection and Site Visits screens for that data.

const CALL_SUMMARY_FIELDS: { key: keyof DrCallSummary; label: string }[] = [
  { key: 'w_install', label: 'Warranty — Installation' },
  { key: 'w_breakdown', label: 'Warranty — Breakdown' },
  { key: 'w_repeat', label: 'Warranty — Repeat' },
  { key: 'w_resolved_phone', label: 'Warranty — Resolved by Phone' },
  { key: 'nw_breakdown', label: 'Non-Warranty — Breakdown' },
  { key: 'nw_repeat', label: 'Non-Warranty — Repeat' },
  { key: 'nw_delivery', label: 'Non-Warranty — Delivery' },
  { key: 'nw_resolved_phone', label: 'Non-Warranty — Resolved by Phone' },
  { key: 'nw_other', label: 'Non-Warranty — Other (AMC etc.)' },
];

const PENDING_SUMMARY_FIELDS: { key: keyof DrCallSummary; label: string }[] = [
  { key: 'pending_parts', label: 'Pending Parts' },
  { key: 'pending_approval', label: 'Pending Approval' },
  { key: 'pending_other', label: 'Pending Other' },
  { key: 'customer_reject', label: 'Customer Reject (today)' },
];

function DailyReportModal({ engId, engName, onClose }: { engId: string; engName: string; onClose: () => void }) {
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [cs, setCs] = useState<DrCallSummary | null>(null);
  const [petrolKm, setPetrolKm] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchDailyReportAutofill(engId, date).then(({ callSummary, petrolKm: km }) => {
      setCs(callSummary);
      setPetrolKm(km ? String(km) : '');
      setLoading(false);
    });
  }, [engId, date]);

  const setField = (key: keyof DrCallSummary, v: string) => {
    setCs((prev) => (prev ? { ...prev, [key]: parseInt(v, 10) || 0 } : prev));
  };

  const wTotal = cs ? cs.w_install + cs.w_breakdown + cs.w_repeat + cs.w_resolved_phone : 0;
  const nwTotal = cs ? cs.nw_breakdown + cs.nw_repeat + cs.nw_other + cs.nw_delivery + cs.nw_resolved_phone : 0;

  const handleSave = async () => {
    if (!cs) return;
    setSaving(true);
    const r = await saveDailyReportSelf({ engId, engName, date, callSummary: cs, petrolKm: parseFloat(petrolKm) || 0, remarks });
    setSaving(false);
    if (r.success) { alert('✅ Daily Report submitted!'); onClose(); }
    else alert('❌ ' + r.error);
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="📋 Daily Report"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', border: `1px solid ${colors.border}`, background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || loading || !cs}
            style={{ padding: '8px 16px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: (saving || loading || !cs) ? 0.6 : 1 }}
          >
            {saving ? 'Saving...' : '💾 Submit Report'}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={styles.formInput} />
        </div>

        {loading || !cs ? (
          <div style={styles.loadingText}>Loading auto-fill...</div>
        ) : (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>Call Summary — auto-filled, edit if needed</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px' }}>
              {CALL_SUMMARY_FIELDS.map((f) => (
                <div key={f.key} style={styles.formGroup}>
                  <label style={{ ...styles.formLabel, fontSize: 11 }}>{f.label}</label>
                  <input type="number" min={0} value={cs[f.key]} onChange={(e) => setField(f.key, e.target.value)} style={styles.formInput} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, fontSize: 12, fontWeight: 700, background: colors.bg, borderRadius: 8, padding: '8px 12px' }}>
              <span style={{ color: '#1d4ed8' }}>Warranty: {wTotal}</span>
              <span style={{ color: '#065f46' }}>Non-Warranty: {nwTotal}</span>
              <span style={{ color: colors.text }}>Total: {wTotal + nwTotal}</span>
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, marginTop: 4 }}>Pending Backlog</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px' }}>
              {PENDING_SUMMARY_FIELDS.map((f) => (
                <div key={f.key} style={styles.formGroup}>
                  <label style={{ ...styles.formLabel, fontSize: 11 }}>{f.label}</label>
                  <input type="number" min={0} value={cs[f.key]} onChange={(e) => setField(f.key, e.target.value)} style={styles.formInput} />
                </div>
              ))}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Petrol KM</label>
              <input type="number" min={0} value={petrolKm} onChange={(e) => setPetrolKm(e.target.value)} style={styles.formInput} placeholder="Auto-filled from KM Tracking" />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Remarks</label>
              <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} style={{ ...styles.formInput, resize: 'vertical' }} placeholder="Anything else worth noting..." />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// ─── Past Reports ─────────────────────────────────────────────────────────────
// Mirrors HTML's openPastReports() — last 30 reports, tap to share via WhatsApp.

function PastReportsPanel({ engId, onClose }: { engId: string; onClose: () => void }) {
  const [reports, setReports] = useState<DailyReportRecord[] | null>(null);

  useEffect(() => { fetchPastDailyReports(engId).then(setReports); }, [engId]);

  const shareReport = (r: DailyReportRecord) => {
    const dateStr = new Date(r.report_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const cs = r.call_summary || ({} as DrCallSummary);
    const lines = [
      `📋 Daily Report — ${dateStr}`,
      r.eng_name,
      '',
      `Warranty: ${cs.warranty_total ?? 0} | Non-Warranty: ${cs.nonwarranty_total ?? 0} | Total: ${r.total_calls ?? 0}`,
      `Pending: ${r.pending_calls ?? 0}`,
      r.petrol_km ? `🛣️ Petrol KM: ${r.petrol_km}` : '',
      r.remarks ? `\n📝 ${r.remarks}` : '',
    ].filter(Boolean);
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  };

  return (
    <Modal isOpen onClose={onClose} title="🕐 Past Daily Reports">
      {reports === null ? (
        <div style={styles.loadingText}>Loading...</div>
      ) : reports.length === 0 ? (
        <div style={styles.emptyMessage}>No reports found</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {reports.map((r) => {
            const dateStr = new Date(r.report_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
            const cs = r.call_summary || ({} as DrCallSummary);
            return (
              <div key={r.id} onClick={() => shareReport(r)} style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>📅 {dateStr}</span>
                  <span style={{ background: '#25D366', color: '#fff', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>📲 Share</span>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap', fontSize: 12 }}>
                  <span style={{ color: '#1d4ed8' }}>📞 {cs.grand_total ?? r.total_calls ?? 0} Calls</span>
                  {(r.pending_calls ?? 0) > 0 && <span style={{ color: '#b45309' }}>⏳ {r.pending_calls} Pending</span>}
                  {r.petrol_km ? <span style={{ color: '#065f46' }}>🛣️ {r.petrol_km} km</span> : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}