'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useMyCalls } from '@/hooks/useMyCalls';
import {
  punchIn, punchOut, fetchPrevLocationMap, PrevLocation, startReturnTrip, finishReturnTrip, needsClosingKm,
  startLocationTracking, stopLocationTracking, saveLocationEvent,
} from '@/services/myCallsService';
import { colors, styles } from '@/styles/ticketsStyles';
import PunchModal from './PunchModal';
import KmCaptureModal from './tickets/KmCaptureModal';
import { hasKmEntryToday, hasArrivalKmForTicket } from '@/services/kmTrackingService';
import AIWriteButton from '@/components/shared/AIWriteButton';
import { tatLabel } from '@/utils/tatHelpers';
import Modal from '@/components/Modal';
import { getAllowedStatuses, isTicketActive } from '@/types/ticketStatus';
import {
  updateTicketStatus, fetchTicketById, validateEngineerUpdate, computeCloseCharges,
  needsPaymentConfirmation, paymentPartsCost, fetchSpareConsumableCodes, uploadCrmPhoto,
} from '@/services/engineerUpdateService';
import { PhotoSlot, PaymentConfirmData } from '@/types/engineerUpdate';
import { TicketSpare, isChargeableSpare } from '@/types/tickets';
import {
  fetchDailyReportAutofill, saveDailyReportSelf, fetchPastDailyReports, hasDailyReportToday,
  fetchDrAutoOfficeWork, formatDailyReportWA, waArr, DR_OFFICE_WORK_TYPES, DR_PAYMENT_MODES,
  DrCallSummary, DailyReportRecord, DrOfficeWork, DrAutoOfficeWork, DrPayment, DrGoogleReview,
} from '@/services/engDailyReportService';
import { startVisit, stopVisit, doWorkStart, doWorkHold, recordReachedLocation, computeWorkPanel } from '@/services/visitStartService';
import { WorkPanel, VISIT_BLOCKED_STATUSES } from './EngineerUpdateScreen';
import WarrantyClaimModal from './tickets/WarrantyClaimModal';
import EngVoidWarrantyModal from './tickets/EngVoidWarrantyModal';
import PartIndentModal from './tickets/PartIndentModal';
import MSCDispatchPanel from './tickets/MSCDispatchPanel';
import { fetchMSCCenters } from '@/services/mscDispatchService';
import { supabase } from '@/lib/supabase';
import { isCspManager } from '@/lib/permissions';
import { createTicket, ensureGroupId, findOpenCallsForSerial } from '@/services/ticketService';
import { useTicketForm, deriveWcType } from '@/hooks/useTicketForm';
import { fetchBrands, fetchSubCategories } from '@/services/masterService';
import { Brand, SubCategory } from '@/types/masters';
import { fetchTargets } from '@/services/targetsService';
import { EngineerTarget } from '@/types/targets';
import { approveTicket, rejectTicket, removeApprovalPart } from '@/services/customerApprovalService';
import { EstimateForm, emptyEstimateForm, calcEstimate, ApprovalSpare } from '@/types/customerApproval';

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

  // Brand + Sub-Category masters — the New Call form needs both because
  // wc_type is derived from them (index.html:5688, deriveWcType).
  const [brands, setBrands] = useState<Brand[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  useEffect(() => {
    if (!newCallOpen) return;
    if (brands.length) return;
    fetchBrands().then(setBrands).catch(() => setBrands([]));
    fetchSubCategories().then(setSubCategories).catch(() => setSubCategories([]));
  }, [newCallOpen, brands.length]);
  const subCatsForBrand = subCategories.filter((s) => !callForm.brand_id || s.brand_id === callForm.brand_id);

  // "Canon received" date + 24h time. HTML injects the same date + hour-select
  // + minute-number control here (index.html:5319-5321, _tat12Controls) and
  // derives tat_date from it as received + 24h (autoCalcCallTAT).
  const [canonRecv, setCanonRecv] = useState({ date: '', hh: '00', mm: '00' });
  const applyCanonRecv = (next: { date: string; hh: string; mm: string }) => {
    setCanonRecv(next);
    if (!next.date) { setCallFormValues({ tat_date: '' }); return; }
    const [y, m, d] = next.date.split('-').map((n) => parseInt(n, 10));
    const h = Math.min(23, Math.max(0, parseInt(next.hh, 10) || 0));
    const mi = Math.min(59, Math.max(0, parseInt(next.mm, 10) || 0));
    const recv = new Date(y, (m || 1) - 1, d || 1, h, mi, 0, 0);
    if (isNaN(recv.getTime())) { setCallFormValues({ tat_date: '' }); return; }
    // NOTE: HTML additionally pushes the deadline past any consecutive holiday
    // days (isHolidayDate). This port has no holiday master at all, so it is a
    // plain +24h.
    setCallFormValues({ tat_date: new Date(recv.getTime() + 24 * 3600000).toISOString() });
  };

  // Daily Report / Past Reports — mirrors HTML's My Calls header buttons.
  const [dailyReportOpen, setDailyReportOpen] = useState(false);
  const [pastReportsOpen, setPastReportsOpen] = useState(false);

  // Ticket list — mirrors HTML's My Calls ticket cards + Update modal
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<'active' | '' | 'closed'>('active');
  const [expandedAddr, setExpandedAddr] = useState<string | null>(null);
  const [updateTicket, setUpdateTicket] = useState<any | null>(null);
  const [updateForm, setUpdateForm] = useState({
    newStatus: '', note: '', labour: '', faultCode: '', workDone: '',
    seCallId: '', pageCount: '', pageCountSkip: false, pageCountSkipReason: '',
    otherCharge: '', visitDate: '', visitIn: '', visitOut: '', meterStart: '', meterEnd: '', mscCenter: '',
    // Product Condition (index.html:7302-7316) + manual Time In/Out reason
    // (index.html:7249-7252).
    conditionType: '', manualTimeReason: '',
  });
  const [updateSaving, setUpdateSaving] = useState(false);
  // Up to 3 Product Condition photos → tickets.condition_photos.
  const [conditionPhotos, setConditionPhotos] = useState<(PhotoSlot | null)[]>([null, null, null]);
  // The Time In/Out the modal OPENED with — HTML's data-orig on those inputs
  // (index.html:7249). Any difference means the engineer hand-edited them and a
  // reason becomes mandatory (index.html:7757-7766).
  const [origVisitTimes, setOrigVisitTimes] = useState({ visitIn: '', visitOut: '' });
  // MSC centre suggestions for the datalist behind the MSC Center input
  // (index.html:7211 + loadMSCCentersDropdown at 27668).
  const [mscCenters, setMscCenters] = useState<{ name: string; city?: string }[]>([]);
  // Serial edit for NO-SN- tickets (index.html:5267 / openSerialEditModal 25307).
  const [serialEditTicket, setSerialEditTicket] = useState<any | null>(null);
  const [serialEditValue, setSerialEditValue] = useState('');
  const [serialEditSaving, setSerialEditSaving] = useState(false);

  // Spares list as edited in the Update modal — HTML's `currentSpares`
  // (index.html:7073). Removals live here until the whole form is saved.
  const [updateSpares, setUpdateSpares] = useState<TicketSpare[]>([]);
  // Which of the spares' part codes are flagged is_consumable in Inventory, so
  // the CONS badge and the ₹0-under-warranty pricing match HTML's
  // isChargeableSpare()/_spareHidesPrice() (index.html:6114-6131, 7650-7657).
  const [consumableCodes, setConsumableCodes] = useState<Set<string>>(new Set());
  // Attachments: slot 0 = Job Sheet (mandatory for CSP closes), slots 1-2 extra
  // (index.html:7293-7300, 7319-7322).
  const [updatePhotos, setUpdatePhotos] = useState<(PhotoSlot | null)[]>([null, null, null]);
  // Payment Confirmation popup (index.html:7936-7961 / 16289).
  const [paymentPrompt, setPaymentPrompt] = useState<{ serviceCharges: number; partsCost: number } | null>(null);
  const [paymentForm, setPaymentForm] = useState({ cname: '', service: '0', parts: '0', mode: '', notes: '' });

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

  // Estimate Approve/Reject — engineers handle this directly on their own
  // "Pending Customer Approval" call, same modal admin/WC uses (mirrors
  // HTML's openApproval()/processApproval()).
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalForm, setApprovalForm] = useState<EstimateForm>(emptyEstimateForm);
  const [approvalInspCharges, setApprovalInspCharges] = useState('300');
  const [approvalProcessing, setApprovalProcessing] = useState(false);

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
    // index.html:5704-5707 — Call Type, then Service Charges for a chargeable
    // call type, then the core identifying fields.
    if (!callForm.call_type) { alert('⚠️ Call Type is required! Please select Warranty / Non-Warranty / AMC etc.'); return; }
    const chargeableCallType = ['Non-Warranty', 'Non-Warranty Repeat', 'Other'].includes(callForm.call_type);
    if (chargeableCallType && !callForm.service_charges && callForm.service_charges !== 0) {
      alert('⚠️ Service Charge is required for Non-Warranty calls!'); return;
    }
    if (!callForm.model || !callForm.serial || !callForm.cname || !callForm.mobile || !callForm.problem) {
      alert('Fill: Model, Serial, Customer, Mobile, Problem'); return;
    }
    // Sub-Category is mandatory whenever the selected brand actually HAS
    // sub-categories to pick from — a missing one lands the call under the
    // wrong Work Controller. Skipped in the "Add Product (Same Customer)" flow,
    // where the field isn't reachable and wc_type is copied from the anchor
    // call instead (index.html:5709-5713).
    if (!groupBanner && callForm.brand_id && subCatsForBrand.length > 0 && !callForm.subcategory_id) {
      alert('⚠️ Sub-Category select karvu farjiyat chhe — jethi call sahi Work Controller ma dekhaay.'); return;
    }
    setNewCallSaving(true);

    // Hard block: a second ACTIVE call must never be logged for the same device
    // (index.html:5715-5730). Auto-generated NO-SN- placeholders are exempt.
    const openDup = await findOpenCallsForSerial(callForm.serial.trim());
    if (openDup.length > 0) {
      const od = openDup[0];
      setNewCallSaving(false);
      alert(`🚫 Open Call Already Exists!\n\nSerial: ${callForm.serial}\nTicket: ${od.id} — ${od.status}\nCustomer: ${od.cname || '-'}\n\nPehla ae call close karo pachhi j navi call log kari shako.`);
      return;
    }

    // brand_id / subcategory_id are form-only master ids (no such ticket
    // columns); address2 and subcategory_name are folded in below.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { address2, brand_id, subcategory_id, subcategory_name, ...rest } = callForm;
    const ticketData: any = {
      ...rest,
      // Address line 1 + line 2 collapse into the single address column (index.html:5687).
      address: `${(callForm.address || '').trim()}${address2.trim() ? ', ' + address2.trim() : ''}`,
      // Warranty coverage follows the call type (index.html:5699).
      warranty_coverage: (callForm.call_type === 'Warranty' || callForm.call_type === 'Warranty Repeat') ? 'Under Coverage' : 'NA',
      // Only a chargeable call type carries a service charge (index.html:5677).
      service_charges: chargeableCallType ? (Number(callForm.service_charges) || 0) : 0,
      // In "Add Product (Same Customer)" mode the Sub-Category field is not
      // reachable, so the anchor call's own wc_type is kept (HTML copies it
      // from the anchor best-effort for the same reason, index.html:5713-5716).
      wc_type: groupBanner
        ? (groupBanner.anchor.wc_type || deriveWcType(subcategory_name, callForm.brand_name, roleType, engName))
        : deriveWcType(subcategory_name, callForm.brand_name, roleType, engName),
      tat_date: callForm.tat_date || null,
      timeline: [{ action: 'Call Logged', by: engName, at: new Date().toISOString() }],
      spares: [],
    };
    if (groupBanner) ticketData.group_id = groupBanner.groupId;

    const result = await createTicket(ticketData);
    setNewCallSaving(false);
    if (!result.success) { alert('❌ Error: ' + result.error); return; }
    alert('✅ Created! ID: ' + result.id);
    setNewCallOpen(false);
    setGroupBanner(null);
    resetCallForm();
    setCanonRecv({ date: '', hh: '00', mm: '00' });
    await refetch();
  };

  const openTicketUpdate = (t: any) => {
    if (roleType === 'engineer' && !cspMgr && !isTicketActive(t.status)) {
      alert('🔒 Closed call ni details engineer ne available nathi.\nFakt open (active) calls j joi shakay.');
      return;
    }
    setUpdateTicket(t);
    const allowed = getAllowedStatuses(t.status, 'engineer', t.service_type, t.call_type, t.warranty_coverage);
    setUpdateForm({
      newStatus: allowed[0] || '', note: '', labour: String(t.labor || t.service_charges || ''), faultCode: t.fault_code || '',
      workDone: t.work_done || '',
      seCallId: t.se_call_id || '', pageCount: t.page_count != null ? String(t.page_count) : '', pageCountSkip: false, pageCountSkipReason: '',
      otherCharge: t.other_charge != null ? String(t.other_charge) : '', visitDate: t.visit_date || '', visitIn: t.visit_in || '', visitOut: t.visit_out || '',
      meterStart: t.meter_start || '', meterEnd: t.meter_end || '', mscCenter: '',
      conditionType: t.condition_type || '', manualTimeReason: '',
    });
    setOrigVisitTimes({ visitIn: t.visit_in || '', visitOut: t.visit_out || '' });
    // Preload existing condition photos (index.html:7328-7332).
    let cp = t.condition_photos;
    if (typeof cp === 'string') { try { cp = JSON.parse(cp); } catch { cp = []; } }
    const condSlots: (PhotoSlot | null)[] = [null, null, null];
    if (Array.isArray(cp)) cp.slice(0, 3).forEach((u: string, i: number) => { if (u) condSlots[i] = { url: u, isNew: false }; });
    setConditionPhotos(condSlots);
    const spares: TicketSpare[] = t.spares || [];
    setUpdateSpares(spares);
    fetchSpareConsumableCodes(spares).then(setConsumableCodes);
    // Preload existing photos: slot 0 = jobsheet, slots 1-2 = extras
    // (index.html:7319-7322).
    let ex = t.attachments;
    if (typeof ex === 'string') { try { ex = JSON.parse(ex); } catch { ex = []; } }
    const slots: (PhotoSlot | null)[] = [t.jobsheet_photo ? { url: t.jobsheet_photo, isNew: false } : null, null, null];
    if (Array.isArray(ex)) ex.slice(0, 2).forEach((u: string, i: number) => { if (u) slots[i + 1] = { url: u, isNew: false }; });
    setUpdatePhotos(slots);
    setPaymentPrompt(null);
  };

  // Warranty/AMC (and not Out of Coverage) calls never bill the customer for a
  // part — the price shows ₹0 there. EXCEPT a Consumable, which is billed even
  // under warranty since Canon never covers those (index.html:7650-7656).
  const spareHidesPrice = (s: TicketSpare) => {
    if (!updateTicket) return false;
    if (isChargeableSpare(s, consumableCodes)) return false;
    const isW = ['Warranty', 'Warranty Repeat', 'AMC'].includes(updateTicket.call_type || '');
    return isW && updateTicket.warranty_coverage !== 'Out of Coverage';
  };

  // index.html:7659 refreshEstimateTotal()
  const sparesPartsTotal = updateSpares.reduce((a, s) => a + (spareHidesPrice(s) ? 0 : (Number(s.qty) || 1) * (Number(s.price) || 0)), 0);
  const estimateTotal = sparesPartsTotal + (Number(updateForm.labour) || 0) + (Number(updateForm.otherCharge) || 0);

  const removeUpdateSpare = (i: number) => setUpdateSpares((prev) => prev.filter((_, idx) => idx !== i));

  // Reads a picked file as a data: URL, matching HTML's onJsPhotoPick(). Camera
  // vs gallery is just the `capture` attribute on the input.
  const onPickPhoto = (slot: number, file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUpdatePhotos((prev) => { const next = [...prev]; next[slot] = { url: String(reader.result), isNew: true }; return next; });
    };
    reader.readAsDataURL(file);
  };

  // Same picker for the Product Condition slots (index.html:onCondPhotoPick).
  const onPickConditionPhoto = (slot: number, file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setConditionPhotos((prev) => { const next = [...prev]; next[slot] = { url: String(reader.result), isNew: true }; return next; });
    };
    reader.readAsDataURL(file);
  };

  // HTML calls loadMSCCentersDropdown() when the status select hits "Sent to
  // MSC" (index.html:27665); the datalist is sourced from auto_msc_centers.
  useEffect(() => {
    if (updateForm.newStatus !== 'Sent to MSC' || mscCenters.length) return;
    fetchMSCCenters().then(setMscCenters).catch(() => undefined);
  }, [updateForm.newStatus, mscCenters.length]);

  // Time In/Out hand-edited away from what the modal opened with
  // (index.html:7757-7761) — the reason box appears and becomes mandatory.
  const isManualTimeEdit = !!updateTicket && updateTicket.service_type === 'On Site'
    && (updateForm.visitIn !== origVisitTimes.visitIn || updateForm.visitOut !== origVisitTimes.visitOut);

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

  // Performs the actual save. Called directly, or from the Payment
  // Confirmation popup's Confirm button (mirrors HTML's _doSaveEngUpdate).
  const doTicketUpdateSave = async (payment?: PaymentConfirmData) => {
    if (!updateTicket) return;
    setUpdateSaving(true);
    const r = await updateTicketStatus(updateTicket, updateForm.newStatus, updateForm.note, updateForm.labour, engName, updateForm.faultCode, {
      seCallId: updateForm.seCallId, pageCount: updateForm.pageCount, pageCountSkip: updateForm.pageCountSkip, pageCountSkipReason: updateForm.pageCountSkipReason,
      otherCharge: updateForm.otherCharge, visitDate: updateForm.visitDate, visitIn: updateForm.visitIn, visitOut: updateForm.visitOut,
      meterStart: updateForm.meterStart, meterEnd: updateForm.meterEnd, mscCenter: updateForm.mscCenter,
      workDone: updateForm.workDone, spares: updateSpares, photos: updatePhotos, payment,
      engId, memberRole,
      conditionType: updateForm.conditionType, conditionPhotos,
      manualTimeReason: isManualTimeEdit ? updateForm.manualTimeReason : undefined,
    });
    setUpdateSaving(false);
    if (!r.success) { alert('Error: ' + r.error); return; }
    if (r.stockWarning) alert(r.stockWarning);
    if (r.finalStatus && r.finalStatus !== updateForm.newStatus) {
      alert(`✅ Saved — status set to "${r.finalStatus}".`);
    }
    setPaymentPrompt(null);
    setUpdateTicket(null);
    refetch();
  };

  const handleTicketUpdateSave = async () => {
    if (!updateTicket || !updateForm.newStatus) { alert('Select new status'); return; }
    if (updateForm.newStatus === 'Closed' && updateTicket.wc_type === 'CSP' && !updateForm.pageCount && !updateForm.pageCountSkip) {
      alert('Page Count is mandatory for CSP calls (or check skip and give a reason)'); return;
    }
    if (updateForm.newStatus === 'Closed' && updateTicket.wc_type === 'CSP' && updateForm.pageCountSkip && !updateForm.pageCountSkipReason.trim()) {
      alert('Reason is mandatory when skipping Page Count'); return;
    }
    // Manual Time In/Out edit needs a reason (index.html:7757-7766).
    if (isManualTimeEdit && !updateForm.manualTimeReason.trim()) {
      alert('⚠️ Please provide a reason for the manual time change.\n(Time In or Time Out was edited manually)'); return;
    }

    // All the close guards (Work Start / unapproved parts / missing physical
    // stock / CSP job sheet) run before anything is written — a blocked close
    // leaves the ticket completely untouched (index.html:7710-7803, 7890-7893).
    setUpdateSaving(true);
    const blocked = await validateEngineerUpdate(
      updateTicket, updateForm.newStatus, updateForm.workDone, updateSpares, engName, updatePhotos[0]?.url
    );
    setUpdateSaving(false);
    if (blocked) { alert(blocked); return; }

    // Payment Confirmation popup, when this close involves real money
    // (index.html:7936-7961). The popup pre-fills from the charges that the
    // save is about to compute, so it opens filled in rather than blank.
    const charges = computeCloseCharges(updateTicket, updateForm.newStatus, updateSpares, consumableCodes);
    if (needsPaymentConfirmation(updateTicket, updateForm.newStatus, charges)) {
      const parts = paymentPartsCost(updateTicket, updateSpares, consumableCodes);
      setPaymentPrompt({ serviceCharges: charges.serviceCharges, partsCost: parts });
      setPaymentForm({
        cname: updateTicket.cname || '', service: charges.serviceCharges.toFixed(0), parts: parts.toFixed(0), mode: '', notes: '',
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

  const openEstimateApproval = () => {
    if (!updateTicket) return;
    setApprovalForm({ ...emptyEstimateForm, labourAmt: String(updateTicket.service_charges || updateTicket.labor || 0) });
    setApprovalInspCharges(String(updateTicket.service_charges || updateTicket.labor || 300));
    setApprovalOpen(true);
  };

  const { partsAfterDisc: approvalPartsAfterDisc, labourAfterDisc: approvalLabourAfterDisc, final: approvalFinal, saved: approvalSaved } =
    calcEstimate(approvalForm, (updateTicket?.spares || []) as ApprovalSpare[]);

  const handleApproveEstimate = async () => {
    if (!updateTicket) return;
    if (!approvalForm.remark.trim()) { alert('Remark is required'); return; }
    setApprovalProcessing(true);
    const r = await approveTicket(updateTicket, approvalFinal, Number(approvalForm.labourAmt), approvalForm.remark, engName);
    setApprovalProcessing(false);
    if (r.success) {
      setApprovalOpen(false); setUpdateTicket(null);
      alert(`✅ Approved! Status → ${r.newStatus}`);
      await refetch();
    } else alert('Error: ' + r.error);
  };

  const handleRejectEstimate = async () => {
    if (!updateTicket) return;
    if (!approvalForm.remark.trim()) { alert('Remark is required'); return; }
    const charges = Number(approvalInspCharges);
    if (isNaN(charges) || charges < 0) { alert('Enter valid Inspection/Visit Charges'); return; }
    if (!confirm(`Customer Reject — Inspection/Visit Charges will be finalized at ₹${charges}. Continue?`)) return;
    setApprovalProcessing(true);
    const r = await rejectTicket(updateTicket, approvalForm.remark, charges, engName);
    setApprovalProcessing(false);
    if (r.success) { setApprovalOpen(false); setUpdateTicket(null); alert('❌ Rejected! Inspection Charges: ₹' + charges + ' saved as final.'); await refetch(); }
    else alert('Error: ' + r.error);
  };

  const handleRemoveApprovalPart = async (idx: number) => {
    if (!updateTicket) return;
    if (!confirm('Remove this part?')) return;
    const r = await removeApprovalPart(updateTicket, idx, engName);
    if (!r.success) { alert('Error: ' + r.error); return; }
    if (r.allRemoved) {
      alert('✅ All parts removed. Call is back to In Progress — you can close it directly.');
      setApprovalOpen(false); setUpdateTicket(null); await refetch();
    } else {
      setUpdateTicket((t: any) => t ? { ...t, spares: r.spares } : t);
    }
  };

  const [punchModalMode, setPunchModalMode] = useState<'in' | 'out' | null>(null);
  const [kmCaptureType, setKmCaptureType] = useState<'opening' | 'closing' | null>(null);
  // Forces the Daily Report to be shown (skippable) before the punch-out
  // selfie — mirrors HTML's startPunchOutDailyReport(), auto-skipped if
  // today's report is already submitted.
  const [forcedDailyReport, setForcedDailyReport] = useState(false);

  const handlePunchIn = async () => {
    const hasOpening = await hasKmEntryToday(engId, 'opening');
    if (!hasOpening) { setKmCaptureType('opening'); return; }
    setPunchModalMode('in');
  };
  const proceedToPunchOutReportGate = async () => {
    const today = new Date().toLocaleDateString('en-CA');
    const already = await hasDailyReportToday(engId, today);
    if (already) { setPunchModalMode('out'); return; }
    setForcedDailyReport(true);
  };
  const handlePunchOut = async () => {
    const hasClosing = await hasKmEntryToday(engId, 'closing');
    if (!hasClosing) { setKmCaptureType('closing'); return; }
    await proceedToPunchOutReportGate();
  };

  // 8:30 PM auto punch-out reminder (index.html:5147-5154). One-shot per mount /
  // punch-state change, same as HTML — it does not nag repeatedly.
  const punchReminderShown = useRef(false);
  useEffect(() => {
    if (punchReminderShown.current) return;
    if (!punchLog?.punch_in_time || punchLog.punch_out_time) return;
    const now = new Date();
    const minsOfDay = now.getHours() * 60 + now.getMinutes();
    if (!(minsOfDay >= 20 * 60 + 30 || now.getHours() < 6)) return;
    punchReminderShown.current = true;
    const timer = setTimeout(() => {
      if (confirm('⚠️ 8:30 PM passed! Punch Out is mandatory.\nWould you like to punch out now?')) handlePunchOut();
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [punchLog?.punch_in_time, punchLog?.punch_out_time]);

  // ── Serial edit for NO-SN- placeholder tickets (index.html:25307-25411) ────
  // Photo proof + remark are mandatory so the change stays auditable; the edit
  // applies immediately and is logged in serial_edit_log + the ticket timeline.
  const [serialEditPhoto, setSerialEditPhoto] = useState<PhotoSlot | null>(null);
  const [serialEditRemark, setSerialEditRemark] = useState('');
  const openSerialEdit = (t: any) => {
    setSerialEditTicket(t);
    setSerialEditValue((t.serial || '').startsWith('NO-SN-') ? '' : (t.serial || ''));
    setSerialEditPhoto(t.serial_photo ? { url: t.serial_photo, isNew: false } : null);
    setSerialEditRemark('');
  };
  const handleSaveSerialEdit = async () => {
    const t = serialEditTicket;
    if (!t) return;
    const newSerial = serialEditValue.trim();
    if (!newSerial) { alert('⚠️ Please enter the serial number.'); return; }
    if (!serialEditPhoto) { alert('📷 Serial number photo is required.'); return; }
    if (!serialEditRemark.trim()) { alert('⚠️ Please add a remark explaining this change.'); return; }
    setSerialEditSaving(true);
    try {
      let photoUrl = serialEditPhoto.url;
      if (serialEditPhoto.isNew) {
        photoUrl = await uploadCrmPhoto(photoUrl, `serial_${String(t.id).replace(/[^A-Za-z0-9_-]/g, '')}_${Date.now()}.jpg`);
      }
      const oldSerial = t.serial || '-';
      const nowIso = new Date().toISOString();
      let existingLog = t.serial_edit_log;
      if (typeof existingLog === 'string') { try { existingLog = JSON.parse(existingLog); } catch { existingLog = []; } }
      if (!Array.isArray(existingLog)) existingLog = [];
      const patch = {
        serial: newSerial,
        serial_photo: photoUrl,
        serial_edit_log: [...existingLog, {
          old_serial: oldSerial, new_serial: newSerial, by: engName || engId,
          role: roleType, at: nowIso, remark: serialEditRemark.trim(), photo: photoUrl,
        }],
        timeline: [...(t.timeline || []), {
          action: 'Serial No Updated', by: engName || engId, at: nowIso,
          note: `${serialEditRemark.trim()} (Old: ${oldSerial} → New: ${newSerial})`,
        }],
        updated_at: nowIso,
      };
      const { error } = await supabase.from('tickets').update(patch).eq('id', t.id);
      if (error) throw error;
      setSerialEditTicket(null);
      await refetch();
    } catch (e: any) {
      const msg = (e && e.message) || String(e);
      if (msg.includes('serial_edit_log')) {
        alert('⚠️ Setup needed: add a "serial_edit_log" (jsonb) column to the tickets table, then try again.');
      } else alert('❌ Error: ' + msg);
    } finally {
      setSerialEditSaving(false);
    }
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
      if (result.success) {
        // Start live GPS tracking for the day (index.html:4359-4361).
        startLocationTracking(engId, engName);
        refetch();
      }
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
      if (result.success) {
        // One final GPS point, then stop tracking (index.html:4742).
        saveLocationEvent(
          'punch_out', null,
          data.lat != null && data.lng != null ? { lat: data.lat, lng: data.lng, accuracy: 0 } : null,
          engId, engName
        ).catch(() => undefined);
        stopLocationTracking();
        refetch();
      }
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

  // Today's route sequence badge, rendered inline on each call's own card —
  // engineer-initial + sequence number, e.g. "Y1" (index.html:5139-5144). Keyed
  // off today's planned_date, so it clears itself the next day.
  const routeSeqMap: Record<string, string> = {};
  const routeOrderMap: Record<string, number> = {};
  todayRoute.forEach((t, i) => {
    const seqN = t.sequence_no || (i + 1);
    const pfx = ((t.assigned_name || engName || '').trim().charAt(0) || '#').toUpperCase();
    routeSeqMap[t.id] = pfx + seqN;
    routeOrderMap[t.id] = seqN;
  });

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
    // Today's route calls come first, in their planned sequence order — once the
    // route sequence no longer applies (badge gone next day), this falls back to
    // the normal active-first / newest-id sort (index.html:5237-5249).
    const aSeq = routeOrderMap[a.id];
    const bSeq = routeOrderMap[b.id];
    if (aSeq != null && bSeq != null) return aSeq - bSeq;
    if (aSeq != null) return -1;
    if (bSeq != null) return 1;
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
          onDone={() => {
            const type = kmCaptureType;
            setKmCaptureType(null);
            if (type === 'opening') setPunchModalMode('in'); else proceedToPunchOutReportGate();
          }}
        />
      )}
      {forcedDailyReport && (
        <DailyReportModal engId={engId} engName={engName} memberRole={memberRole} forcedHint onClose={() => { setForcedDailyReport(false); setPunchModalMode('out'); }} />
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
              const routeBadge = routeSeqMap[t.id];
              return (
                <div key={t.id} style={{ border: `1.5px solid ${routeBadge ? '#1d4ed8' : colors.border}`, borderRadius: '12px', padding: '14px 16px', background: '#f0f7ff', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  {routeBadge && (
                    <div style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 19, background: '#1d4ed8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800 }}>
                      {routeBadge}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '14px', color: colors.primary }}>
                          {t.id}{' '}
                          {t.priority && <span style={getPriorityBadgeStyle(t.priority)}>{t.priority}</span>}
                          {/* Warranty / Non-Warranty badge — mirrors HTML's isW ternary (index.html:5259) */}
                          {['Warranty', 'Warranty Repeat', 'AMC'].includes(t.call_type || '') ? (
                            <span style={{ ...styles.badge, backgroundColor: '#dcfce7', color: '#166534', marginLeft: '4px' }}>🛡️ WARRANTY</span>
                          ) : (
                            <span style={{ ...styles.badge, backgroundColor: '#fee2e2', color: '#991b1b', marginLeft: '4px' }}>💳 NON-WARRANTY</span>
                          )}
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
                      <div>
                        🔢 <b style={{ color: colors.text }}>{t.serial || '—'}</b>
                        {/* Auto-generated "NO-SN-…" placeholder — let whoever is
                          on site fill in the real serial (index.html:5267). */}
                        {(t.serial || '').startsWith('NO-SN-') && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openSerialEdit(t); }}
                            style={{ marginLeft: 4, padding: '0px 6px', fontSize: 10, border: `1px solid ${colors.border}`, background: '#fff', borderRadius: 5, cursor: 'pointer' }}
                            title="Edit serial number"
                          >✏️</button>
                        )}
                      </div>
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
                </div>
              );
            })}
          </div>
        )}
      </div>

      {serialEditTicket && (
        <Modal
          isOpen
          onClose={() => setSerialEditTicket(null)}
          title={`🔢 Edit Serial No — ${serialEditTicket.id}`}
          footer={
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setSerialEditTicket(null)} style={{ padding: '8px 16px', border: `1px solid ${colors.border}`, background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button
                onClick={handleSaveSerialEdit}
                disabled={serialEditSaving}
                style={{ padding: '8px 16px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: serialEditSaving ? 0.6 : 1 }}
              >
                {serialEditSaving ? 'Saving...' : '💾 Update Serial'}
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 12, color: colors.textMuted }}>
              Current Serial: <b>{serialEditTicket.serial || '-'}</b>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>New Serial No <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="text" value={serialEditValue}
                onChange={(e) => setSerialEditValue(e.target.value)}
                placeholder="Actual serial number from device" style={styles.formInput}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Serial No Photo <span style={{ color: '#ef4444' }}>*</span></label>
              {serialEditPhoto ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginTop: 4 }}>
                  <a href={serialEditPhoto.url} target="_blank" rel="noreferrer" style={{ color: colors.primary, fontWeight: 600 }}>
                    {serialEditPhoto.isNew ? 'New photo ready' : 'View attached'}
                  </a>
                  <button onClick={() => setSerialEditPhoto(null)} style={{ background: 'none', border: 'none', color: colors.danger, cursor: 'pointer', fontSize: 14 }}>✕</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <label style={{ flex: 1, textAlign: 'center', background: '#0369a1', color: '#fff', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
                    📷 Camera
                    <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => {
                      const f = e.target.files?.[0]; if (!f) return;
                      const r = new FileReader(); r.onload = () => setSerialEditPhoto({ url: String(r.result), isNew: true }); r.readAsDataURL(f);
                    }} />
                  </label>
                  <label style={{ flex: 1, textAlign: 'center', background: '#7c3aed', color: '#fff', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
                    🖼️ Gallery
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                      const f = e.target.files?.[0]; if (!f) return;
                      const r = new FileReader(); r.onload = () => setSerialEditPhoto({ url: String(r.result), isNew: true }); r.readAsDataURL(f);
                    }} />
                  </label>
                </div>
              )}
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Remark — why is this being changed? <span style={{ color: '#ef4444' }}>*</span></label>
              <textarea
                value={serialEditRemark} onChange={(e) => setSerialEditRemark(e.target.value)} rows={3}
                placeholder="e.g. Actual serial no. checked on-site, previous was auto-generated placeholder"
                style={{ ...styles.formInput, resize: 'vertical' }}
              />
            </div>
          </div>
        </Modal>
      )}

      {dailyReportOpen && (
        <DailyReportModal engId={engId} engName={engName} memberRole={memberRole} onClose={() => setDailyReportOpen(false)} />
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
            {/* index.html:7259 — `isW && !isOOC`: only a Warranty/Warranty
                Repeat/AMC call that is not already Out of Coverage can be
                voided. On a Non-Warranty call the concept does not apply. */}
            {['Warranty', 'Warranty Repeat', 'AMC'].includes(updateTicket.call_type || '') && updateTicket.warranty_coverage !== 'Out of Coverage' && (
              <button onClick={() => setVoidModalOpen(true)} style={{ padding: '8px 14px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>⚠️ Mark Out of Coverage</button>
            )}
            {updateTicket.status === 'Sent to MSC' && (
              <MSCDispatchPanel ticketId={updateTicket.id} readOnly byUser={engName} />
            )}
            {updateTicket.status === 'Pending Customer Approval' && roleType === 'engineer' && (
              <button onClick={openEstimateApproval} style={{ padding: '8px 14px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>✅ Approve / Reject Estimate</button>
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
                {/* Action Taken — required on any status-changing save, and it
                    doubles as the mandatory cancellation reason when the new
                    status is Call Cancel (index.html:7269, 7701, 7808). */}
                <div style={styles.formGroup}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={styles.formLabel}>
                      Action Taken <span style={{ color: '#dc2626' }}>*</span>
                      {updateForm.newStatus === 'Call Cancel' && <span style={{ fontWeight: 400, fontSize: 11, color: '#b45309' }}> — this is the cancellation reason</span>}
                    </label>
                    <AIWriteButton type="update" onInsert={(text) => setUpdateForm((f) => ({ ...f, workDone: text }))} />
                  </div>
                  <textarea
                    value={updateForm.workDone}
                    onChange={(e) => setUpdateForm((f) => ({ ...f, workDone: e.target.value }))}
                    rows={2}
                    placeholder="What was done?"
                    style={{ ...styles.formInput, resize: 'vertical' }}
                  />
                </div>
                {/* 📦 Send to MSC — engineer side only names the centre; WC adds
                    courier + docket + dispatch date afterwards through the
                    MSC Dispatch panel (index.html:7207-7214). The suggestions
                    come from auto_msc_centers, same as loadMSCCentersDropdown. */}
                {updateForm.newStatus === 'Sent to MSC' && (
                  <div style={{ ...styles.formGroup, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 12 }}>
                    <label style={styles.formLabel}>MSC Center (optional)</label>
                    <input
                      type="text" list="msc-centers-datalist" value={updateForm.mscCenter}
                      onChange={(e) => setUpdateForm((f) => ({ ...f, mscCenter: e.target.value }))}
                      style={styles.formInput} placeholder="Which MSC center?"
                    />
                    <datalist id="msc-centers-datalist">
                      {mscCenters.map((m) => <option key={m.name} value={m.city ? `${m.name} — ${m.city}` : m.name} />)}
                    </datalist>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>WC will add courier &amp; docket details after dispatch.</div>
                  </div>
                )}
                {updateTicket.service_type === 'On Site' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Visit Date</label>
                      <input type="date" value={updateForm.visitDate} onChange={(e) => setUpdateForm((f) => ({ ...f, visitDate: e.target.value }))} style={styles.formInput} />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Time In</label>
                      <input type="time" value={updateForm.visitIn} onChange={(e) => setUpdateForm((f) => ({ ...f, visitIn: e.target.value }))} style={styles.formInput} />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Time Out</label>
                      <input type="time" value={updateForm.visitOut} onChange={(e) => setUpdateForm((f) => ({ ...f, visitOut: e.target.value }))} style={styles.formInput} />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Meter Start</label>
                      <input type="text" value={updateForm.meterStart} onChange={(e) => setUpdateForm((f) => ({ ...f, meterStart: e.target.value }))} style={styles.formInput} />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Meter End</label>
                      <input type="text" value={updateForm.meterEnd} onChange={(e) => setUpdateForm((f) => ({ ...f, meterEnd: e.target.value }))} style={styles.formInput} />
                    </div>
                  </div>
                )}
                {/* Reason for manual time change — shown only once Time In or
                    Time Out is actually edited away from its auto-filled value,
                    and required to save (index.html:7249-7252, 7757-7766). */}
                {isManualTimeEdit && (
                  <div style={{ background: '#fffbeb', border: '1.5px solid #f59e0b', borderRadius: 8, padding: '10px 14px' }}>
                    <label style={{ fontWeight: 700, color: '#b45309', fontSize: 12 }}>
                      ⚠️ Reason for manual time change <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <textarea
                      value={updateForm.manualTimeReason}
                      onChange={(e) => setUpdateForm((f) => ({ ...f, manualTimeReason: e.target.value }))}
                      rows={2}
                      placeholder="e.g. Network issue — forgot to tap Work Start button"
                      style={{ ...styles.formInput, marginTop: 6, borderColor: '#f59e0b', resize: 'vertical' }}
                    />
                  </div>
                )}
                {/* Spares / Part Request list — index.html:7281-7286 + spareRow()
                    at 7657. Editable here (✕ removes); removals persist to
                    tickets.spares when the whole form is saved. */}
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>🔩 Spares / Part Request</h3>
                  {updateSpares.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>No parts added.</div>
                  ) : updateSpares.map((s, i) => {
                    const gp = s.gst_pct != null ? s.gst_pct : 18;
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
                        <span style={{ flex: 0.7, textAlign: 'center', color: '#7c3aed', fontSize: 11 }}>GST {gp}%</span>
                        <span style={{ flex: 1, textAlign: 'right', fontWeight: 700 }}>
                          {hidePrice ? <span style={{ color: '#059669' }}>₹0 (W)</span> : `₹${((Number(s.qty) || 1) * (Number(s.price) || 0)).toFixed(2)}`}
                        </span>
                        <button onClick={() => removeUpdateSpare(i)} style={{ background: 'none', border: 'none', color: colors.danger, cursor: 'pointer', fontSize: 14 }}>✕</button>
                      </div>
                    );
                  })}
                </div>
                {['Warranty', 'Warranty Repeat', 'AMC'].includes(updateTicket.call_type || '') && updateTicket.warranty_coverage !== 'Out of Coverage' ? (
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#1e3a8a' }}>Warranty — no charges</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Service / Labour ₹ (incl. GST)</label>
                      <input type="number" value={updateForm.labour} onChange={(e) => setUpdateForm((f) => ({ ...f, labour: e.target.value }))} style={styles.formInput} placeholder="0" />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Other ₹</label>
                      <input type="number" value={updateForm.otherCharge} onChange={(e) => setUpdateForm((f) => ({ ...f, otherCharge: e.target.value }))} style={styles.formInput} placeholder="0" />
                    </div>
                  </div>
                )}
                {estimateTotal > 0 && (
                  <div style={{ background: '#f0fdf4', border: '1.5px solid #16a34a', borderRadius: 10, padding: '10px 14px', fontSize: 13, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    {sparesPartsTotal > 0 && <span>🔩 Parts: <b>₹{sparesPartsTotal.toFixed(0)}</b></span>}
                    {Number(updateForm.labour) > 0 && <span>🔧 Service: <b>₹{Number(updateForm.labour).toFixed(0)}</b></span>}
                    {Number(updateForm.otherCharge) > 0 && <span>📎 Other: <b>₹{Number(updateForm.otherCharge).toFixed(0)}</b></span>}
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#0d9488' }}>= TOTAL: ₹{estimateTotal.toFixed(0)}</span>
                  </div>
                )}

                {/* Attachments — Job Sheet (slot 0) + up to 2 extras. Mandatory
                    to close a CSP call, On Site or Carry In (index.html:7293-7300,
                    7890-7893). Camera or gallery both work. */}
                <div style={{ background: '#f0f9ff', border: '1.5px solid #7dd3fc', borderRadius: 10, padding: 12 }}>
                  <label style={{ fontWeight: 700, color: '#0369a1', fontSize: 13 }}>
                    📎 Attachments {updateTicket.wc_type === 'CSP' && <span style={{ color: '#dc2626' }}>*</span>}
                    <span style={{ fontSize: 11, fontWeight: 400, color: '#64748b' }}>
                      {' '}— Job Sheet photo{updateTicket.wc_type === 'CSP' ? ' is mandatory to Close (CSP call)' : ' (optional, ICP call)'}. Up to 2 extra photos (printer report etc.).
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

                {/* 📦 Product Condition — optional condition type + up to 3
                    photo proofs, saved to condition_type / condition_photos
                    (index.html:7302-7316). */}
                <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: 12 }}>
                  <label style={{ fontWeight: 700, color: '#991b1b', fontSize: 13 }}>
                    📦 Product Condition
                    <span style={{ fontSize: 11, fontWeight: 400, color: '#64748b' }}>
                      {' '}— Optional. Note the condition and attach photo proof if leakage / physical / liquid damage is found.
                    </span>
                  </label>
                  <select
                    value={updateForm.conditionType}
                    onChange={(e) => setUpdateForm((f) => ({ ...f, conditionType: e.target.value }))}
                    style={{ ...styles.formInput, marginTop: 8 }}
                  >
                    <option value="">-- Select (optional) --</option>
                    <option value="Normal">Normal — no issue</option>
                    <option value="Physical Damage">Physical Damage</option>
                    <option value="Liquid/Leakage Damage">Liquid / Leakage Damage</option>
                    <option value="Burnt/Electrical Damage">Burnt / Electrical Damage</option>
                    <option value="Missing Parts">Missing Parts</option>
                    <option value="Other">Other</option>
                  </select>
                  {[0, 1, 2].map((slot) => (
                    <div key={slot} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12 }}>
                      <span style={{ width: 92, fontWeight: 700, color: '#991b1b' }}>📷 Photo {slot + 1}</span>
                      {conditionPhotos[slot] ? (
                        <>
                          <a href={conditionPhotos[slot]!.url} target="_blank" rel="noreferrer" style={{ color: '#991b1b', fontWeight: 600 }}>
                            {conditionPhotos[slot]!.isNew ? 'New photo ready' : 'View attached'}
                          </a>
                          <button
                            onClick={() => setConditionPhotos((prev) => { const n = [...prev]; n[slot] = null; return n; })}
                            style={{ background: 'none', border: 'none', color: colors.danger, cursor: 'pointer', fontSize: 14 }}
                          >✕</button>
                        </>
                      ) : (
                        <>
                          <label style={{ background: '#b91c1c', color: '#fff', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}>
                            📷 Camera
                            <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => onPickConditionPhoto(slot, e.target.files?.[0])} />
                          </label>
                          <label style={{ background: '#7c3aed', color: '#fff', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}>
                            📁 Gallery
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => onPickConditionPhoto(slot, e.target.files?.[0])} />
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
                {/* index.html:7265-7269. The * is HTML's own label; the close is
                    NOT blocked without it — HTML gates that on
                    isFieldRequired('call_close','se_call_id'), whose built-in
                    default is 'optional'. The digits after the last '/' become
                    the warranty tracking key (index.html:8003). */}
                {['Warranty', 'Warranty Repeat', 'AMC'].includes(updateTicket.call_type || '') && (
                  <div style={{ ...styles.formGroup, background: '#fffbeb', border: '1.5px solid #f59e0b', borderRadius: 8, padding: 10 }}>
                    <label style={{ ...styles.formLabel, color: '#b45309' }}>
                      🔖 Canon SE Call ID <span style={{ color: '#ef4444' }}>*</span>
                      <span style={{ fontSize: 11, fontWeight: 400, color: '#92400e' }}> (required for warranty part tracking)</span>
                    </label>
                    <input
                      type="text" value={updateForm.seCallId}
                      onChange={(e) => setUpdateForm((f) => ({ ...f, seCallId: e.target.value.toUpperCase() }))}
                      placeholder="e.g. CSP/20260618/123456"
                      style={{ ...styles.formInput, borderColor: '#f59e0b', fontWeight: 600 }}
                    />
                    <div style={{ fontSize: 11, color: '#78716c', marginTop: 3 }}>Only the digits after the last / will be used for tracking (e.g. 123456)</div>
                  </div>
                )}
                {updateTicket.wc_type === 'CSP' && (
                  <div style={{ ...styles.formGroup, background: '#fefce8', border: '1px solid #fde68a', borderRadius: 8, padding: 10 }}>
                    <label style={styles.formLabel}>Page Count {updateForm.newStatus === 'Closed' && !updateForm.pageCountSkip && <span style={{ color: '#dc2626' }}>*</span>}</label>
                    <input type="number" value={updateForm.pageCount} onChange={(e) => setUpdateForm((f) => ({ ...f, pageCount: e.target.value }))} style={styles.formInput} disabled={updateForm.pageCountSkip} />
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, fontWeight: 600 }}>
                      <input type="checkbox" checked={updateForm.pageCountSkip} onChange={(e) => setUpdateForm((f) => ({ ...f, pageCountSkip: e.target.checked }))} />
                      Skip Page Count
                    </label>
                    {updateForm.pageCountSkip && (
                      <input type="text" value={updateForm.pageCountSkipReason} onChange={(e) => setUpdateForm((f) => ({ ...f, pageCountSkipReason: e.target.value }))} style={{ ...styles.formInput, marginTop: 6 }} placeholder="Reason for skipping *" />
                    )}
                  </div>
                )}
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
      {/* Payment Confirmation — index.html:16289 showPaymentConfirmation.
          Shown on a Non-Warranty/'Other' On-Site close, or a Warranty On-Site
          close that ended up with a chargeable consumable. */}
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

      {approvalOpen && updateTicket && (
        <Modal
          isOpen
          onClose={() => setApprovalOpen(false)}
          title={`Estimate — ${updateTicket.cname || ''}`}
          footer={
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setApprovalOpen(false)} style={{ padding: '8px 16px', border: `1px solid ${colors.border}`, background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button onClick={handleRejectEstimate} disabled={approvalProcessing} style={{ padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: approvalProcessing ? 0.6 : 1 }}>❌ Customer Reject</button>
              <button onClick={handleApproveEstimate} disabled={approvalProcessing} style={{ padding: '8px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: approvalProcessing ? 0.6 : 1 }}>✅ Customer Approved</button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, fontSize: 13 }}>
              <div><strong>{updateTicket.brand_name} {updateTicket.model}</strong> | {updateTicket.serial}</div>
              <div style={{ color: '#6b7280', marginTop: 2 }}>{updateTicket.problem} | {updateTicket.call_type}</div>
            </div>

            {(updateTicket.spares || []).filter((s: any) => s.requested).length > 0 && (
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Parts Required:</div>
                {(updateTicket.spares || []).map((s: any, i: number) => s.requested && (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '4px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <span>{s.code ? `${s.code} ` : ''}{s.name} × {s.qty}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600 }}>₹{((s.qty || 0) * (s.price || 0)).toFixed(0)}</span>
                      <button onClick={() => handleRemoveApprovalPart(i)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontSize: 11 }}>✕ Remove</button>
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Labour / Service ₹</label>
                <input type="number" value={approvalForm.labourAmt} onChange={(e) => setApprovalForm((f) => ({ ...f, labourAmt: e.target.value }))} style={styles.formInput} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Parts Discount %</label>
                <input type="number" value={approvalForm.partsDisc} onChange={(e) => setApprovalForm((f) => ({ ...f, partsDisc: e.target.value }))} min="0" max="100" style={styles.formInput} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Labour Discount %</label>
                <input type="number" value={approvalForm.labourDisc} onChange={(e) => setApprovalForm((f) => ({ ...f, labourDisc: e.target.value }))} min="0" max="100" style={styles.formInput} />
              </div>
            </div>

            <div style={{ background: '#d1fae5', borderRadius: 8, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span>Parts (after {approvalForm.partsDisc}% disc)</span>
                <span>₹{approvalPartsAfterDisc.toFixed(0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 4 }}>
                <span>Labour (after {approvalForm.labourDisc}% disc)</span>
                <span>₹{approvalLabourAfterDisc.toFixed(0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15, marginTop: 8, borderTop: '1px solid #a7f3d0', paddingTop: 8 }}>
                <span>Final Estimate</span>
                <span style={{ color: '#065f46' }}>₹{approvalFinal.toFixed(0)}</span>
              </div>
              {approvalSaved > 0 && <div style={{ fontSize: 11, color: '#065f46', marginTop: 4 }}>Customer saves: ₹{approvalSaved.toFixed(0)}</div>}
            </div>

            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#991b1b', display: 'block', marginBottom: 4 }}>Inspection / Visit Charges ₹ <span style={{ fontWeight: 400 }}>(billed if customer rejects)</span></label>
              <input type="number" value={approvalInspCharges} onChange={(e) => setApprovalInspCharges(e.target.value)} style={styles.formInput} />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Remark * <span style={{ color: '#dc2626' }}>(required)</span></label>
              <textarea value={approvalForm.remark} onChange={(e) => setApprovalForm((f) => ({ ...f, remark: e.target.value }))} rows={2} placeholder="Note about approval/rejection..." style={{ ...styles.formInput, resize: 'vertical' }} />
            </div>
          </div>
        </Modal>
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
                <label style={styles.formLabel}>Email</label>
                <input type="email" name="email" value={callForm.email} onChange={handleCallFormChange} style={styles.formInput} />
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
                <label style={styles.formLabel}>Address line 2</label>
                <input type="text" name="address2" value={callForm.address2} onChange={handleCallFormChange} style={styles.formInput} />
              </div>
              {/* Brand + Sub-Category drive wc_type (index.html:5688) — which
                  Work Controller's reports this call lands under. */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Brand</label>
                <select
                  value={callForm.brand_id}
                  onChange={(e) => {
                    const b = brands.find((x) => x.id === e.target.value);
                    setCallFormValues({ brand_id: e.target.value, brand_name: b?.name || '', subcategory_id: '', subcategory_name: '' });
                  }}
                  style={styles.formInput}
                >
                  <option value="">-- Select Brand --</option>
                  {brands.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Sub-Category {!groupBanner && !!callForm.brand_id && subCatsForBrand.length > 0 && <span style={{ color: '#dc2626' }}>*</span>}</label>
                <select
                  value={callForm.subcategory_id}
                  onChange={(e) => {
                    const sc = subCategories.find((x) => x.id === e.target.value);
                    setCallFormValues({ subcategory_id: e.target.value, subcategory_name: sc?.name || '' });
                  }}
                  style={styles.formInput}
                >
                  <option value="">-- All / General --</option>
                  {subCatsForBrand.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Model *</label>
                <input type="text" name="model" value={callForm.model} onChange={handleCallFormChange} style={styles.formInput} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Serial *</label>
                <input type="text" name="serial" value={callForm.serial} onChange={handleCallFormChange} style={styles.formInput} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Call Type *</label>
                <select name="call_type" value={callForm.call_type} onChange={handleCallFormChange} style={styles.formInput}>
                  <option value="">-- Select --</option>
                  {['Warranty', 'Non-Warranty', 'AMC', 'Warranty Repeat', 'Non-Warranty Repeat', 'Other'].map((o) => (<option key={o} value={o}>{o}</option>))}
                </select>
              </div>
              {/* Service Type — On Site vs Carry In decides the whole status
                  flow and the stock location used at close (index.html:5327). */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Service Type *</label>
                <select name="service_type" value={callForm.service_type} onChange={handleCallFormChange} style={styles.formInput}>
                  {['On Site', 'Carry In'].map((o) => (<option key={o} value={o}>{o}</option>))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Priority</label>
                <select name="priority" value={callForm.priority} onChange={handleCallFormChange} style={styles.formInput}>
                  {['Normal', 'High', 'Urgent', 'Low'].map((o) => (<option key={o} value={o}>{o}</option>))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>SE Call ID</label>
                <input type="text" name="se_call_id" value={callForm.se_call_id} onChange={handleCallFormChange} style={styles.formInput} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Physical Job Sheet No.</label>
                <input type="text" name="phys_js" value={callForm.phys_js} onChange={handleCallFormChange} style={styles.formInput} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Re-Repair</label>
                <select
                  value={callForm.rerepair ? 'Yes' : 'No'}
                  onChange={(e) => setCallFormValues({ rerepair: e.target.value === 'Yes', rerepair_foc: e.target.value === 'Yes' ? callForm.rerepair_foc : false })}
                  style={styles.formInput}
                >
                  {['No', 'Yes'].map((o) => (<option key={o} value={o}>{o}</option>))}
                </select>
              </div>
              {callForm.rerepair && (
                <div style={{ ...styles.formGroup, alignSelf: 'end' }}>
                  <label style={styles.formLabel}>Re-Repair charges</label>
                  <div style={{ display: 'flex', gap: 14, fontSize: 13, paddingTop: 6 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                      <input type="radio" name="rr-charges" checked={!callForm.rerepair_foc} onChange={() => setCallFormValues({ rerepair_foc: false })} />
                      Chargeable
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                      <input type="radio" name="rr-charges" checked={callForm.rerepair_foc} onChange={() => setCallFormValues({ rerepair_foc: true })} />
                      FOC (free)
                    </label>
                  </div>
                </div>
              )}
              {/* Mandatory for a chargeable call type (index.html:5705). */}
              {['Non-Warranty', 'Non-Warranty Repeat', 'Other'].includes(callForm.call_type) && (
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Service Charges ₹ <span style={{ color: '#dc2626' }}>*</span></label>
                  <input type="number" name="service_charges" value={callForm.service_charges} onChange={handleCallFormChange} style={styles.formInput} />
                </div>
              )}
            </div>
            {/* Canon received → TAT deadline (index.html:5319-5321 + autoCalcCallTAT). */}
            <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 10, padding: 12 }}>
              <label style={{ ...styles.formLabel, color: '#92400e' }}>⏱ Canon received (date + time, 24h) — sets the TAT deadline</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
                <input type="date" value={canonRecv.date} onChange={(e) => applyCanonRecv({ ...canonRecv, date: e.target.value })} style={{ ...styles.formInput, width: 'auto' }} />
                <select value={canonRecv.hh} onChange={(e) => applyCanonRecv({ ...canonRecv, hh: e.target.value })} style={{ ...styles.formInput, width: 'auto', fontWeight: 700 }}>
                  {Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0')).map((h) => (<option key={h} value={String(Number(h))}>{h}</option>))}
                </select>
                <span style={{ fontWeight: 800 }}>:</span>
                <input type="number" min={0} max={59} value={canonRecv.mm} onChange={(e) => applyCanonRecv({ ...canonRecv, mm: e.target.value })} style={{ ...styles.formInput, width: 62, textAlign: 'center' }} />
                <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 700 }}>(24h)</span>
              </div>
              {callForm.tat_date && (
                <div style={{ marginTop: 6, fontSize: 12, color: '#92400e', fontWeight: 700 }}>
                  ⏱ TAT Deadline: {new Date(callForm.tat_date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })} (Canon received + 24h)
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                <label style={styles.formLabel}>…or set the TAT deadline directly</label>
                <input
                  type="datetime-local"
                  value={callForm.tat_date ? new Date(callForm.tat_date).toLocaleString('sv-SE').slice(0, 16).replace(' ', 'T') : ''}
                  onChange={(e) => setCallFormValues({ tat_date: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                  style={styles.formInput}
                />
              </div>
            </div>
            <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
              <label style={styles.formLabel}>Problem *</label>
              <textarea name="problem" value={callForm.problem} onChange={handleCallFormChange} rows={2} style={{ ...styles.formInput, fontFamily: 'inherit', width: '100%' }} />
            </div>
            <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
              <label style={styles.formLabel}>Description / Detailed notes</label>
              <textarea name="description" value={callForm.description} onChange={handleCallFormChange} rows={2} style={{ ...styles.formInput, fontFamily: 'inherit', width: '100%' }} />
            </div>
            <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
              <label style={styles.formLabel}>Product Condition (as received)</label>
              <textarea name="condition" value={callForm.condition} onChange={handleCallFormChange} rows={2} style={{ ...styles.formInput, fontFamily: 'inherit', width: '100%' }} />
            </div>
            <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
              <label style={styles.formLabel}>Accessories received</label>
              <textarea name="accessories" value={callForm.accessories} onChange={handleCallFormChange} rows={2} style={{ ...styles.formInput, fontFamily: 'inherit', width: '100%' }} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Daily Report ────────────────────────────────────────────────────────────
// Mirrors HTML's openDailyReport() (index.html:14032) / saveDailyReport()
// (index.html:14521) — call-summary counts (auto-filled, editable), pending
// backlog, the ENG002-only automation site-visit count, Office Work rows
// (manual, plus today's already-logged Other Work shown read-only), Payment
// rows, Google Review rows, petrol KM and remarks.

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

export function DailyReportModal({ engId, engName, memberRole, onClose, forcedHint }: { engId: string; engName: string; memberRole: string; onClose: () => void; forcedHint?: boolean }) {
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [cs, setCs] = useState<DrCallSummary | null>(null);
  const [petrolKm, setPetrolKm] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Office Work: manually-added rows + today's already-logged Other Work items
  // shown read-only (index.html:14257 + 14235).
  const [officeWork, setOfficeWork] = useState<DrOfficeWork[]>([]);
  const [autoOfficeWork, setAutoOfficeWork] = useState<DrAutoOfficeWork[]>([]);
  // Payment rows — HTML seeds three blank ones and caps at 5 (index.html:14098, 14319).
  const [payments, setPayments] = useState<DrPayment[]>([
    { customer: '', amount: 0, mode: '' }, { customer: '', amount: 0, mode: '' }, { customer: '', amount: 0, mode: '' },
  ]);
  // Google reviews — up to 10 rows (index.html:14100-14125).
  const [reviews, setReviews] = useState<DrGoogleReview[]>([]);

  useEffect(() => {
    setLoading(true);
    fetchDailyReportAutofill(engId, date).then(({ callSummary, petrolKm: km }) => {
      setCs(callSummary);
      setPetrolKm(km ? String(km) : '');
      setLoading(false);
    });
    fetchDrAutoOfficeWork(engId, date).then(setAutoOfficeWork).catch(() => setAutoOfficeWork([]));
  }, [engId, date]);

  const setField = (key: keyof DrCallSummary, v: string) => {
    setCs((prev) => (prev ? { ...prev, [key]: parseInt(v, 10) || 0 } : prev));
  };

  const wTotal = cs ? cs.w_install + cs.w_breakdown + cs.w_repeat + cs.w_resolved_phone : 0;
  const nwTotal = cs ? cs.nw_breakdown + cs.nw_repeat + cs.nw_other + cs.nw_delivery + cs.nw_resolved_phone : 0;
  const paymentTotal = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const setOw = (i: number, patch: Partial<DrOfficeWork>) =>
    setOfficeWork((prev) => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  const setPay = (i: number, patch: Partial<DrPayment>) =>
    setPayments((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const setRev = (i: number, patch: Partial<DrGoogleReview>) =>
    setReviews((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const handleSave = async () => {
    if (!cs) return;
    setSaving(true);
    const r = await saveDailyReportSelf({
      engId, engName, date, callSummary: cs, petrolKm: parseFloat(petrolKm) || 0, remarks,
      officeWork, payments, googleReviews: reviews, memberRole,
    });
    setSaving(false);
    if (!r.success) { alert('❌ ' + r.error); return; }
    // Auto-share the just-submitted report — HTML calls autoSendDailyReport()
    // right after the insert (index.html:14629). HTML's own transport is
    // Telegram; here the same formatDailyReportWA() text is handed to the
    // WhatsApp share sheet, which is the channel this port already uses for
    // report sharing (Past Reports list). Filtering matches the insert's:
    // only rows with a work type / a name-or-amount / a name-and-stars count.
    try {
      const text = formatDailyReportWA({
        eng_name: engName, report_date: date, call_summary: cs,
        office_work: officeWork.filter((o) => o.work_type.trim()),
        payments: payments.filter((p) => p.customer.trim() || p.amount > 0),
        total_amount: payments.reduce((s, p) => s + (Number(p.amount) || 0), 0),
        petrol_km: parseFloat(petrolKm) || 0,
        google_reviews: reviews.filter((g) => g.customer.trim() && g.stars),
        remarks,
      });
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } catch { /* share is best-effort — the report is already saved */ }
    alert('✅ Daily Report submitted!');
    onClose();
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="📋 Daily Report"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={forcedHint ? { padding: '8px 16px', border: '1px solid #fde68a', background: 'white', color: '#b45309', borderRadius: 6, cursor: 'pointer', fontSize: 14 } : { padding: '8px 16px', border: `1px solid ${colors.border}`, background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>
            {forcedHint ? '⏭️ Skip (pachhi karish)' : 'Cancel'}
          </button>
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
        {forcedHint && (
          <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#4338ca', fontWeight: 600 }}>
            🕐 Punch Out — pehla Daily Report submit/share karo (auto bharai gayu chhe), pachhi selfie aavse. Athva Skip karo.
          </div>
        )}
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

            {/* Automation site visits — ENG002 only (index.html:14079-14083). */}
            {engId === 'ENG002' && (
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>🏗️ Automation Site Visits completed today (auto-filled)</label>
                <input type="number" min={0} value={cs.auto_site_visits} onChange={(e) => setField('auto_site_visits', e.target.value)} style={styles.formInput} />
              </div>
            )}

            {/* ── Office Work (index.html:14257 addOfficeWorkRow) ────────── */}
            <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🏢 Office Work ({officeWork.length + autoOfficeWork.length})</span>
              <button
                onClick={() => setOfficeWork((prev) => [...prev, { work_type: '', remark: '', from_time: '', to_time: '' }])}
                style={{ padding: '5px 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
              >+ Add Row</button>
            </div>
            {/* Already logged live via Other Work — read-only, and deliberately
                NOT resubmitted here (the digest reads field_tasks directly, so
                folding these into office_work would double-count them). */}
            {autoOfficeWork.map((t) => (
              <div key={t.id} style={{ background: '#f5f3ff', borderRadius: 8, padding: 10, border: '1px solid #ddd6fe', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <div>
                  <b style={{ color: '#5b21b6' }}>{t.customer_name}</b>
                  {t.notes && ` — ${t.notes}`}
                  {t.from_time && t.to_time && <span style={{ color: '#7c3aed' }}> ({t.from_time} – {t.to_time})</span>}
                </div>
                <span style={{ fontSize: 10, background: '#ede9fe', color: '#5b21b6', padding: '2px 8px', borderRadius: 99, fontWeight: 700, whiteSpace: 'nowrap' }}>🔄 Other Work</span>
              </div>
            ))}
            <datalist id="dr-ow-types">
              {DR_OFFICE_WORK_TYPES.map((t) => (<option key={t} value={t} />))}
            </datalist>
            {officeWork.map((o, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 8, padding: 10, border: '1px solid #ddd6fe' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr auto', gap: 8, alignItems: 'center' }}>
                  <input list="dr-ow-types" placeholder="Work Type *" value={o.work_type} onChange={(e) => setOw(i, { work_type: e.target.value })} style={styles.formInput} />
                  <input type="text" placeholder="Party Name / Remark" value={o.remark} onChange={(e) => setOw(i, { remark: e.target.value })} style={styles.formInput} />
                  <button onClick={() => setOfficeWork((prev) => prev.filter((_, idx) => idx !== i))} style={{ background: colors.danger, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', fontSize: 13 }}>✕</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>From (optional)</label>
                    <input type="time" value={o.from_time} onChange={(e) => setOw(i, { from_time: e.target.value })} style={styles.formInput} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>To (optional)</label>
                    <input type="time" value={o.to_time} onChange={(e) => setOw(i, { to_time: e.target.value })} style={styles.formInput} />
                  </div>
                </div>
                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>Fill in the times and this entry also lands in the Work Log automatically.</div>
              </div>
            ))}

            {/* ── Payments collected (index.html:14317 addPaymentRow) ────── */}
            <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>💰 Payments collected — Total ₹{paymentTotal.toFixed(0)}</span>
              <button
                onClick={() => setPayments((prev) => (prev.length >= 5 ? prev : [...prev, { customer: '', amount: 0, mode: '' }]))}
                disabled={payments.length >= 5}
                style={{ padding: '5px 12px', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, opacity: payments.length >= 5 ? 0.5 : 1 }}
              >+ Add Row</button>
            </div>
            {payments.map((p, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                <input type="text" placeholder="Customer Name" value={p.customer} onChange={(e) => setPay(i, { customer: e.target.value })} style={styles.formInput} />
                <input type="number" min={0} placeholder="₹ Amount" value={p.amount || ''} onChange={(e) => setPay(i, { amount: parseFloat(e.target.value) || 0 })} style={styles.formInput} />
                <select value={p.mode} onChange={(e) => setPay(i, { mode: e.target.value })} style={styles.formInput}>
                  <option value="">— Select —</option>
                  {DR_PAYMENT_MODES.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
                </select>
                <button onClick={() => setPayments((prev) => prev.filter((_, idx) => idx !== i))} style={{ background: colors.danger, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', fontSize: 13 }}>✕</button>
              </div>
            ))}

            {/* ── Google Reviews (index.html:14100-14125) ────────────────── */}
            <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>⭐ Google Reviews ({reviews.length})</span>
              <button
                onClick={() => setReviews((prev) => (prev.length >= 10 ? prev : [...prev, { customer: '', stars: 5 }]))}
                disabled={reviews.length >= 10}
                style={{ padding: '5px 12px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, opacity: reviews.length >= 10 ? 0.5 : 1 }}
              >+ Add Row</button>
            </div>
            {reviews.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="text" placeholder="Customer Name" value={r.customer} onChange={(e) => setRev(i, { customer: e.target.value })} style={{ ...styles.formInput, flex: 1 }} />
                <select value={r.stars} onChange={(e) => setRev(i, { stars: parseInt(e.target.value, 10) })} style={{ ...styles.formInput, width: 'auto' }}>
                  {[5, 4, 3, 2, 1].map((n) => (<option key={n} value={n}>{'⭐'.repeat(n)} {n} Star</option>))}
                </select>
                <button onClick={() => setReviews((prev) => prev.filter((_, idx) => idx !== i))} style={{ background: colors.danger, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', fontSize: 13 }}>✕</button>
              </div>
            ))}

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Petrol KM</label>
              <input type="number" min={0} value={petrolKm} onChange={(e) => setPetrolKm(e.target.value)} style={styles.formInput} placeholder="Auto-filled from KM Tracking" />
            </div>

            <div style={styles.formGroup}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={styles.formLabel}>Remarks</label>
                <AIWriteButton type="dailyreport" onInsert={(text) => setRemarks(text)} />
              </div>
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

  // Same formatter the submit-time auto-share uses, so a re-shared past report
  // carries office work / payments / reviews too (index.html:14646).
  const shareReport = (r: DailyReportRecord) => {
    const text = formatDailyReportWA({
      eng_name: r.eng_name, report_date: r.report_date, call_summary: r.call_summary,
      office_work: r.office_work, payments: r.payment_details, total_amount: r.total_amount,
      petrol_km: r.petrol_km, google_reviews: r.google_reviews, remarks: r.remarks,
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
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
                  {/* index.html:14889-14891 — office work / amount / reviews stat badges */}
                  {waArr<DrOfficeWork>(r.office_work).length > 0 && (
                    <span style={{ color: '#5b21b6' }}>💼 {waArr<DrOfficeWork>(r.office_work).length} Office</span>
                  )}
                  {(r.total_amount ?? 0) > 0 && <span style={{ color: '#065f46' }}>💰 ₹{r.total_amount}</span>}
                  {waArr<DrGoogleReview>(r.google_reviews).length > 0 && (
                    <span style={{ color: '#92400e' }}>⭐ {waArr<DrGoogleReview>(r.google_reviews).length} Reviews</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}