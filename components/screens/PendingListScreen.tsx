'use client';
import { useState, useMemo, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePendingList } from '@/hooks/usePendingList';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { colors, styles } from '@/styles/ticketsStyles';
import Modal from '@/components/Modal';
import { getAllowedStatuses } from '@/types/ticketStatus';
import {
  updateTicketStatus, fetchTicketById, validateEngineerUpdate, computeCloseCharges,
  needsPaymentConfirmation, paymentPartsCost, fetchSpareConsumableCodes,
} from '@/services/engineerUpdateService';
import { EngineerTicket, PhotoSlot, PaymentConfirmData } from '@/types/engineerUpdate';
import { TicketSpare, isChargeableSpare } from '@/types/tickets';
import { isCspManager } from '@/lib/permissions';

// Status badge color map
const statusBadgeStyle = (status: string): React.CSSProperties => {
  const s = status.toLowerCase();
  if (s === 'open' || s === 'assigned' || s === 'pending allocation') {
    return { background: '#dbeafe', color: '#1d4ed8' };
  }
  if (s === 'in progress' || s.includes('customer approv') || s.includes('pending parts') || s.includes('pending repair')) {
    return { background: '#fef3c7', color: '#d97706' };
  }
  if (s === 'closed' || s === 'delivered' || s === 'repaired') {
    return { background: '#d1fae5', color: '#065f46' };
  }
  // pending / cancelled / rejected / call cancel / customer reject
  return { background: '#ffe4e6', color: '#be123c' };
};

// Hour-level TAT urgency badge — matches HTML's tatBadge(): red/amber/green
// tiers with a countdown ("2h 15m left") or "Overdue"/"Xd left" caption.
function TatBadge({ tatDate }: { tatDate?: string }) {
  if (!tatDate) return <span style={{ color: '#9ca3af', fontSize: 11 }}>—</span>;
  const isDateOnly = /T00:00:00/.test(tatDate);
  const d = new Date(tatDate);
  const deadline = isDateOnly ? new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59) : d;
  const timeStr = isDateOnly ? 'End of Day' : deadline.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = deadline.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  const label = `${dateStr} · ${timeStr}`;
  const diff = deadline.getTime() - Date.now();

  if (diff < 0) {
    return (
      <div>
        <span style={{ background: '#fef2f2', color: '#dc2626', padding: '3px 7px', borderRadius: 4, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>⚠️ {label}</span>
        <div style={{ fontSize: 10, color: '#dc2626', marginTop: 2 }}>Overdue</div>
      </div>
    );
  }

  const hrs = Math.floor(diff / 3600000);
  const mins = Math.round((diff % 3600000) / 60000);
  const timeLeft = `⏰ ${hrs > 0 ? `${hrs}h${mins ? ` ${mins}m` : ''}` : `${mins}m`} left`;

  if (hrs < 24) {
    const bg = hrs < 2 ? '#fee2e2' : '#fef9c3';
    const col = hrs < 2 ? '#dc2626' : '#ca8a04';
    return (
      <div>
        <span style={{ background: bg, color: col, padding: '3px 7px', borderRadius: 4, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{label}</span>
        <div style={{ fontSize: 10, color: col, marginTop: 2 }}>{timeLeft}</div>
      </div>
    );
  }

  const days = Math.floor(hrs / 24);
  return (
    <div>
      <span style={{ background: '#f0fdf4', color: '#15803d', padding: '3px 7px', borderRadius: 4, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>✅ {days}d left</div>
    </div>
  );
}

interface TicketRow {
  id: string;
  cname: string;
  mobile: string;
  brand_name: string;
  model: string;
  serial: string;
  area?: string;
  pin?: string;
  status: string;
  created_at: string;
  assigned_to?: string;
  assigned_name?: string;
  call_type: string;
  service_type: string;
  wc_type?: string;
  tat_date?: string;
  sequence_no?: number;
  problem?: string;
  remarks?: string;
}

interface Engineer {
  id: string;
  user_id: string;
  name: string;
}

interface RouteChange {
  engId: string;
  engName: string;
  seq: string;
}

export default function PendingListScreen() {
  const { data: session } = useSession();
  const byUser = (session?.user as any)?.name ?? '';
  // index.html:26718 — isAdminOrWC = admin || work_controller || CSP manager;
  // gates the Ready-for-Pickup section's Update button.
  const roleType = (session?.user as any)?.roleType;
  const isAdmin = (session?.user as any)?.role === 'admin';
  const isWC = roleType === 'work_controller';
  const isAdminOrWC = isAdmin || isWC || isCspManager(session);
  const { tickets, engineers, loading, error, refetch } = usePendingList();

  // Local, move-able copy of the raw ticket list — mirrors HTML's
  // window._pendingData, which plMove()/route staging mutate in place
  // between fetches (only a real re-fetch resets it), not on every render.
  const [localTickets, setLocalTickets] = useState<TicketRow[]>([]);
  useEffect(() => { setLocalTickets(tickets); }, [tickets]);

  // Matches HTML's defaults (window._pendingWCFilter||'CSP', _pendingServiceFilter||'On Site').
  const [wcTypeFilter, setWcTypeFilter] = useState<string>('CSP');
  const [serviceFilter, setServiceFilter] = useState<string>('On Site');
  const [brandFilter, setBrandFilter] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');

  // Route Mode — mirrors HTML's window._routeMode / _routeChanges / saveRoutePlanInline().
  // Engineer/sequence assignment is staged locally and only written to the DB
  // in one batch via "Save Route Plan", with a timeline entry per changed
  // ticket — unlike an instant per-row write, this leaves the same audit
  // trail HTML's route plan does.
  const [routeMode, setRouteMode] = useState(false);
  const [routeChanges, setRouteChanges] = useState<Record<string, RouteChange>>({});
  const [routeDate, setRouteDate] = useState(new Date().toISOString().slice(0, 10));
  const [routeSaving, setRouteSaving] = useState(false);

  // Status-update modal — mirrors HTML's only status-change entry point from
  // this screen, openEngUpdate()/viewTicket(), which goes through the full
  // ticket-update flow (timeline + notification), never a raw field PATCH.
  const [updateTicket, setUpdateTicket] = useState<EngineerTicket | null>(null);
  const [updateForm, setUpdateForm] = useState({ newStatus: '', note: '', labour: '', faultCode: '' });
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateSaving, setUpdateSaving] = useState(false);

  // index.html:26669-26686 — "Ready for Pickup" is computed from the RAW
  // ticket list with only wcTypeFilter/brandFilter applied — deliberately
  // independent of serviceFilter (whose default is 'On Site') and search
  // text, so a Repaired/Carry-In device stays visible there regardless of
  // what the main table's filters are set to.
  const readyForPickup = useMemo(() => {
    return localTickets.filter((t) => {
      if (t.status !== 'Repaired') return false;
      if (wcTypeFilter && t.wc_type !== wcTypeFilter) return false;
      if (brandFilter && !t.brand_name?.toLowerCase().includes(brandFilter.toLowerCase())) return false;
      return true;
    });
  }, [localTickets, wcTypeFilter, brandFilter]);

  // "actionable" (all non-Repaired) is filtered separately by every filter,
  // including serviceFilter and searchText — this is the main table.
  const actionable = useMemo(() => {
    return localTickets.filter((t) => {
      if (t.status === 'Repaired') return false;
      if (wcTypeFilter && t.wc_type !== wcTypeFilter) return false;
      if (serviceFilter && t.service_type !== serviceFilter) return false;
      if (brandFilter && !t.brand_name?.toLowerCase().includes(brandFilter.toLowerCase())) return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        // Matches HTML's search scope: cname, mobile, pin, area, model, serial, id, assigned_name.
        const matches =
          t.cname.toLowerCase().includes(q) ||
          t.mobile.includes(q) ||
          (t.pin || '').toLowerCase().includes(q) ||
          (t.area || '').toLowerCase().includes(q) ||
          t.model.toLowerCase().includes(q) ||
          t.serial.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          (t.assigned_name || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [localTickets, wcTypeFilter, serviceFilter, brandFilter, searchText]);

  // In Route Mode: group actionable calls by engineer (sorted by sequence_no
  // within each group), unassigned at the bottom — matches HTML's grouping
  // in pendingListRender().
  const displayActionable = useMemo(() => {
    if (!routeMode) return actionable;
    const assigned = actionable.filter((t) => t.assigned_to);
    const unassigned = actionable.filter((t) => !t.assigned_to);
    const groups: Record<string, TicketRow[]> = {};
    const order: string[] = [];
    assigned.forEach((t) => {
      const eid = t.assigned_to!;
      if (!groups[eid]) { groups[eid] = []; order.push(eid); }
      groups[eid].push(t);
    });
    order.forEach((eid) => groups[eid].sort((a, b) => (a.sequence_no ?? 999) - (b.sequence_no ?? 999)));
    order.sort((a, b) => {
      const na = (groups[a][0].assigned_name || '').toLowerCase();
      const nb = (groups[b][0].assigned_name || '').toLowerCase();
      return na < nb ? -1 : na > nb ? 1 : 0;
    });
    return order.flatMap((eid) => groups[eid]).concat(unassigned);
  }, [actionable, routeMode]);

  // Route Mode: stage an engineer assignment (resets the staged sequence,
  // matching HTML's _rpEngChange() regenerating the seq dropdown on change).
  const handleRouteEngChange = (ticketId: string, engId: string, engName: string) => {
    setRouteChanges((prev) => ({ ...prev, [ticketId]: { engId, engName, seq: '' } }));
  };

  // Route Mode: stage a sequence number.
  const handleRouteSeqChange = (ticketId: string, seq: string) => {
    setRouteChanges((prev) => ({ ...prev, [ticketId]: { engId: prev[ticketId]?.engId || '', engName: prev[ticketId]?.engName || '', seq } }));
  };

  // Route Mode: move a row up/down within the raw list and renumber
  // sequence_no for whichever engineer group it now belongs to — mirrors
  // HTML's plMove() exactly, including operating on the raw fetch order
  // rather than the currently-displayed grouped order.
  const moveRow = (id: string, dir: 1 | -1) => {
    setLocalTickets((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx === -1) return prev;
      const ni = idx + dir;
      if (ni < 0 || ni >= prev.length) return prev;
      const arr = prev.slice();
      [arr[idx], arr[ni]] = [arr[ni], arr[idx]];
      const engId = arr[idx].assigned_to;
      if (engId) {
        let seq = 1;
        for (let i = 0; i < arr.length; i++) {
          if (arr[i].assigned_to === engId) {
            arr[i] = { ...arr[i], sequence_no: seq };
            seq++;
          }
        }
      }
      return arr;
    });
  };

  // Batch-save all staged route changes — mirrors HTML's saveRoutePlanInline():
  // sets planned_date on every changed ticket, flips status → Assigned and
  // writes a timeline entry when the engineer changed, sets sequence_no when staged.
  const saveRoutePlan = async () => {
    const keys = Object.keys(routeChanges).filter((k) => routeChanges[k].engId || routeChanges[k].seq);
    if (!keys.length) { alert('No changes to save'); return; }
    setRouteSaving(true);
    let saved = 0;
    for (const tid of keys) {
      const c = routeChanges[tid];
      const patch: any = { planned_date: routeDate };
      if (c.engId) { patch.assigned_to = c.engId; patch.assigned_name = c.engName; patch.status = 'Assigned'; }
      if (c.seq) patch.sequence_no = parseInt(c.seq, 10) || null;
      try {
        if (c.engId) {
          let timeline: any[] = [];
          try {
            const { data: fresh } = await supabase.from('tickets').select('timeline').eq('id', tid).maybeSingle();
            timeline = Array.isArray(fresh?.timeline) ? fresh!.timeline : [];
          } catch { /* best-effort — still write the assignment even if timeline fetch fails */ }
          patch.timeline = [...timeline, {
            action: `Assigned to ${c.engName} (Route Plan)`,
            by: byUser,
            at: new Date().toISOString(),
            note: `Planned date: ${routeDate}${c.seq ? ' | Seq: ' + c.seq : ''}`,
          }];
        }
        const { error: updateError } = await supabase.from('tickets').update(patch).eq('id', tid);
        if (!updateError) saved++;
      } catch (err) { console.error(err); }
    }
    setRouteSaving(false);
    setRouteChanges({});
    alert(`${saved} call route plan(s) saved! ✅`);
    await refetch();
  };

  // Open the status-update modal — fetches the full ticket (spares, warranty
  // coverage, timeline) the same way My Calls / Engineer Update do, so
  // getAllowedStatuses and the audit trail have everything they need.
  const openUpdate = async (ticketId: string) => {
    setUpdateLoading(true);
    const fresh = await fetchTicketById(ticketId);
    setUpdateLoading(false);
    if (!fresh) { alert('Could not load ticket'); return; }
    setUpdateTicket(fresh);
    const allowed = getAllowedStatuses(fresh.status, 'admin', fresh.service_type, fresh.call_type, fresh.warranty_coverage);
    setUpdateForm({ newStatus: allowed[0] || '', note: '', labour: String(fresh.labor || fresh.service_charges || ''), faultCode: fresh.fault_code || '' });
  };

  const allowedForUpdate = updateTicket
    ? getAllowedStatuses(updateTicket.status, 'admin', updateTicket.service_type, updateTicket.call_type, updateTicket.warranty_coverage)
    : [];

  const saveUpdate = async () => {
    if (!updateTicket || !updateForm.newStatus) { alert('Select new status'); return; }
    setUpdateSaving(true);
    // validateEngineerUpdate before saving (Action Taken required, terminal/
    // locked-stage block, Job Sheet-on-Close, parts-approval/stock checks).
    // Its own transition check hardcodes the ENGINEER transition table
    // internally, which has no case for "Repaired" — the only status this
    // Ready-for-Pickup modal ever sees — so that specific "Cannot change to"
    // mismatch is expected here and is safe to ignore: the dropdown above
    // already built its options from the correct admin/WC transition table.
    const block = await validateEngineerUpdate(updateTicket, updateForm.newStatus, updateForm.note, updateTicket.spares || [], byUser, undefined);
    if (block && !block.startsWith('❌ Cannot change to')) {
      setUpdateSaving(false);
      alert(block);
      return;
    }
    const r = await updateTicketStatus(updateTicket, updateForm.newStatus, updateForm.note, updateForm.labour, byUser, updateForm.faultCode);
    setUpdateSaving(false);
    if (r.success) { setUpdateTicket(null); refetch(); }
    else alert('Error: ' + r.error);
  };

  // ── Full ticket-update modal for the main "Actionable Calls" table ─────────
  // index.html:26836-26837 sends that button through viewTicket() (the full
  // ticket-detail modal with adminActions/timeline/etc). Porting that whole
  // modal here would duplicate TicketsScreen's entire view-modal machinery, so
  // this instead reuses DashboardOverview's richer engineer-update flow
  // (spares editing, Attachments incl. mandatory CSP Job Sheet, Payment
  // Confirmation, validateEngineerUpdate-gated save) — a materially richer
  // modal than the plain status-only one above, and an existing, already
  // '/lib/permissions'-vetted pattern in this codebase.
  const [fullTicket, setFullTicket] = useState<EngineerTicket | null>(null);
  const [fullForm, setFullForm] = useState({ newStatus: '', note: '', labour: '', faultCode: '' });
  const [fullLoading, setFullLoading] = useState(false);
  const [fullSaving, setFullSaving] = useState(false);
  const [fullSpares, setFullSpares] = useState<TicketSpare[]>([]);
  const [fullConsumableCodes, setFullConsumableCodes] = useState<Set<string>>(new Set());
  const [fullPhotos, setFullPhotos] = useState<(PhotoSlot | null)[]>([null, null, null]);
  const [fullPaymentPrompt, setFullPaymentPrompt] = useState<{ serviceCharges: number; partsCost: number } | null>(null);
  const [fullPaymentForm, setFullPaymentForm] = useState({ cname: '', service: '0', parts: '0', mode: '', notes: '' });
  const engId = (session?.user as any)?.email ?? '';

  const openFullUpdate = async (ticketId: string) => {
    setFullLoading(true);
    const fresh = await fetchTicketById(ticketId);
    setFullLoading(false);
    if (!fresh) { alert('Could not load ticket'); return; }
    setFullTicket(fresh);
    // Matches HTML's openEngUpdate/saveEngUpdate (index.html:7219,7705): admin/
    // WC use the 'admin' transition table.
    const allowed = getAllowedStatuses(fresh.status, 'admin', fresh.service_type, fresh.call_type, fresh.warranty_coverage);
    setFullForm({ newStatus: allowed[0] || '', note: '', labour: String(fresh.labor || fresh.service_charges || ''), faultCode: fresh.fault_code || '' });
    const spares: TicketSpare[] = fresh.spares || [];
    setFullSpares(spares);
    fetchSpareConsumableCodes(spares).then(setFullConsumableCodes);
    let ex: any = fresh.attachments;
    if (typeof ex === 'string') { try { ex = JSON.parse(ex); } catch { ex = []; } }
    const slots: (PhotoSlot | null)[] = [fresh.jobsheet_photo ? { url: fresh.jobsheet_photo, isNew: false } : null, null, null];
    if (Array.isArray(ex)) ex.slice(0, 2).forEach((u: string, i: number) => { if (u) slots[i + 1] = { url: u, isNew: false }; });
    setFullPhotos(slots);
    setFullPaymentPrompt(null);
  };
  const allowedForFullUpdate = fullTicket
    ? getAllowedStatuses(fullTicket.status, 'admin', fullTicket.service_type, fullTicket.call_type, fullTicket.warranty_coverage)
    : [];

  const spareHidesFullPrice = (s: TicketSpare) => {
    if (!fullTicket) return false;
    if (isChargeableSpare(s, fullConsumableCodes)) return false;
    const isW = ['Warranty', 'Warranty Repeat', 'AMC'].includes(fullTicket.call_type || '');
    return isW && fullTicket.warranty_coverage !== 'Out of Coverage';
  };
  const fullSparesTotal = fullSpares.reduce((a, s) => a + (spareHidesFullPrice(s) ? 0 : (Number(s.qty) || 1) * (Number(s.price) || 0)), 0);
  const removeFullSpare = (i: number) => setFullSpares((prev) => prev.filter((_, idx) => idx !== i));
  const onPickFullPhoto = (slot: number, file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setFullPhotos((prev) => { const next = [...prev]; next[slot] = { url: String(reader.result), isNew: true }; return next; }); };
    reader.readAsDataURL(file);
  };

  const doFullUpdateSave = async (payment?: PaymentConfirmData) => {
    if (!fullTicket) return;
    setFullSaving(true);
    const r = await updateTicketStatus(
      fullTicket, fullForm.newStatus, fullForm.note.trim(), fullForm.labour, byUser, fullForm.faultCode,
      { workDone: fullForm.note.trim(), spares: fullSpares, photos: fullPhotos, payment, engId, memberRole: 'WC' },
    );
    setFullSaving(false);
    if (!r.success) { alert('Error: ' + r.error); return; }
    if (r.stockWarning) alert(r.stockWarning);
    setFullPaymentPrompt(null);
    setFullTicket(null);
    refetch();
  };

  const handleFullUpdateSave = async () => {
    if (!fullTicket || !fullForm.newStatus) { alert('Select new status'); return; }
    const note = fullForm.note.trim();
    if (!note) { alert('❌ Action Taken is required.\nPlease describe what was done.'); return; }
    // NOT routed through validateEngineerUpdate: this modal is reachable only
    // via the main table's Update button (admin/WC/CSP manager), and that
    // service function hardcodes several ENGINEER-only gates unconditionally
    // — the locked-stage block and the transition check's own ENGINEER
    // transition table barely overlap the admin/WC one this dropdown is built
    // from (e.g. "Pending Parts"/"Pending Engineer Stock" are legitimately
    // admin/WC-actionable — index.html:3128-3129 — but validateEngineerUpdate
    // would reject them outright, matching HTML's saveEngUpdate, which gates
    // both of those checks behind currentUser.role==='engineer',
    // index.html:7695,7705-7709). The one admin-applicable guard HTML does
    // NOT role-gate — Job Sheet Photo mandatory to close a CSP call
    // (index.html:7890) — is reproduced inline below instead.
    if (fullForm.newStatus === 'Closed' && fullTicket.wc_type === 'CSP' && !fullPhotos[0]?.url) {
      alert('📄 Job Sheet Photo is required to close a CSP call!\n\nAttach the Job Sheet photo (camera or gallery) under "Attachments", then Save.');
      return;
    }

    const charges = computeCloseCharges(fullTicket, fullForm.newStatus, fullSpares, fullConsumableCodes);
    if (needsPaymentConfirmation(fullTicket, fullForm.newStatus, charges)) {
      const parts = paymentPartsCost(fullTicket, fullSpares, fullConsumableCodes);
      setFullPaymentPrompt({ serviceCharges: charges.serviceCharges, partsCost: parts });
      setFullPaymentForm({ cname: fullTicket.cname || '', service: charges.serviceCharges.toFixed(0), parts: parts.toFixed(0), mode: '', notes: '' });
      return;
    }
    await doFullUpdateSave();
  };

  const handleConfirmFullPayment = async () => {
    if (!fullPaymentForm.mode) { alert('Please select a payment mode.'); return; }
    await doFullUpdateSave({
      cname: fullPaymentForm.cname.trim(),
      payment_mode: fullPaymentForm.mode,
      service_charges: Number(fullPaymentForm.service) || 0,
      parts_cost: Number(fullPaymentForm.parts) || 0,
      payment_notes: fullPaymentForm.notes.trim(),
    });
  };

  // Excel export
  const handleExport = () => {
    const rows = [...readyForPickup, ...actionable].map((t) => ({
      'Ticket ID': t.id,
      'Date': new Date(t.created_at).toLocaleDateString(),
      'Customer': t.cname,
      'Mobile': t.mobile,
      'Brand/Model': `${t.brand_name} ${t.model}`,
      'Serial': t.serial,
      'Area': t.area || '',
      'PIN': t.pin || '',
      'Status': t.status,
      'Engineer': t.assigned_name || '',
      'Service Type': t.service_type,
      'Call Type': t.call_type,
      'TAT Date': t.tat_date || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pending');
    XLSX.writeFile(wb, 'pending_list.xlsx');
  };

  if (loading) {
    return (
      <div style={styles.loadingText}>Loading pending tickets...</div>
    );
  }

  if (error) {
    return (
      <div style={{ ...styles.loadingText, color: colors.danger }}>
        ❌ {error}
      </div>
    );
  }

  const totalCount = actionable.length + readyForPickup.length;

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={styles.sectionHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div>
            <h2 style={{ ...styles.sectionTitle, margin: 0 }}>📋 Pending List</h2>
            {/* index.html:26846-26847 — live "As of {date}, {time}" subtitle */}
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>
              As of {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}, {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </div>
          </div>
          <span
            style={{
              ...styles.badge,
              background: '#dbeafe',
              color: '#1d4ed8',
              fontSize: '13px',
              padding: '4px 12px',
            }}
          >
            {totalCount}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            style={{ ...styles.btn, ...styles.btnPrimary }}
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.btnPrimaryHover)}
            onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.btnPrimary)}
            onClick={handleExport}
          >
            📥 Export Excel
          </button>
          <button
            onClick={() => { setRouteMode((v) => !v); setRouteChanges({}); }}
            style={{ ...styles.btn, background: routeMode ? '#7c3aed' : '#e0e7ff', color: routeMode ? '#fff' : '#4338ca', border: 'none', fontWeight: 700 }}
          >
            🗺️ Route Plan {routeMode ? 'ON ✓' : 'OFF'}
          </button>
          {routeMode && (
            <>
              <input
                type="date"
                value={routeDate}
                onChange={(e) => setRouteDate(e.target.value)}
                title="Date to add to Route Plan"
                style={{ ...styles.filterSelect }}
              />
              <button
                onClick={saveRoutePlan}
                disabled={routeSaving}
                style={{ ...styles.btn, background: '#059669', color: '#fff', border: 'none', fontWeight: 700, opacity: routeSaving ? 0.6 : 1 }}
              >
                {routeSaving ? '⏳ Saving...' : '💾 Save Route Plan'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div style={styles.filterBar}>
        <select
          value={wcTypeFilter}
          onChange={(e) => setWcTypeFilter(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All WC Types</option>
          <option value="CSP">CSP</option>
          <option value="ICP">ICP</option>
        </select>

        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Services</option>
          <option value="On Site">On Site</option>
          <option value="Carry In">Carry In</option>
        </select>

        {/* index.html:26869-26873 — fixed 3-option dropdown, not free text */}
        <select
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Brands</option>
          <option value="Printer">Printer</option>
          <option value="Scanner">Scanner</option>
        </select>

        <input
          type="text"
          placeholder="Ticket ID, customer, mobile..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ ...styles.filterInput, flex: 1 }}
        />

        {/* index.html:26874-26875 — one-click reset to the default filter state */}
        <button
          onClick={() => { setSearchText(''); setWcTypeFilter('CSP'); setServiceFilter('On Site'); setBrandFilter(''); }}
          style={{ padding: '8px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
        >
          ✕ Reset
        </button>

        {/* index.html:26876 — live actionable-call count near the filter bar */}
        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>{actionable.length} actionable calls</span>
      </div>

      {/* Ready for Pickup section */}
      {readyForPickup.length > 0 && (
        <div
          style={{
            ...styles.card,
            border: '2px solid #16a34a',
            marginBottom: '20px',
          }}
        >
          <h3
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#16a34a',
              marginBottom: '12px',
            }}
          >
            ✅ Ready for Pickup ({readyForPickup.length})
          </h3>
          <TicketTable
            tickets={readyForPickup}
            engineers={engineers}
            onUpdateClick={openUpdate}
            actionLabel="🔄 Update"
            gateAction={isAdminOrWC}
          />
        </div>
      )}

      {/* Main actionable table */}
      {actionable.length === 0 ? (
        <div style={styles.emptyMessage}>
          {tickets.length === 0 ? 'No pending tickets.' : 'No tickets match the current filters.'}
        </div>
      ) : (
        <div style={styles.card}>
          <TicketTable
            tickets={displayActionable}
            engineers={engineers}
            routeMode={routeMode}
            routeChanges={routeChanges}
            onRouteEngChange={handleRouteEngChange}
            onRouteSeqChange={handleRouteSeqChange}
            onMove={moveRow}
            onUpdateClick={openFullUpdate}
            actionLabel="✏️ Update"
          />
        </div>
      )}

      {(updateLoading || fullLoading) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: '16px 24px', fontSize: 14, fontWeight: 600 }}>Loading ticket…</div>
        </div>
      )}

      {updateTicket && (
        <Modal
          isOpen
          onClose={() => setUpdateTicket(null)}
          title={`Update — ${updateTicket.cname || updateTicket.id}`}
          footer={
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setUpdateTicket(null)} style={{ padding: '8px 16px', border: `1px solid ${colors.border}`, background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button
                onClick={saveUpdate}
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
              <div style={{ color: '#6b7280', marginTop: 4 }}>Engineer: {updateTicket.assigned_name || 'Unassigned'}</div>
            </div>

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
                  <label style={styles.formLabel}>Update Note</label>
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

      {/* Full ticket-update modal — main "Actionable Calls" table's Update
          button (index.html:26836-26837 sends this through the full
          viewTicket modal; see the comment above openFullUpdate). */}
      {fullTicket && (
        <Modal
          isOpen
          onClose={() => setFullTicket(null)}
          title={`Update — ${fullTicket.cname || fullTicket.id}`}
          footer={
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setFullTicket(null)} style={{ padding: '8px 16px', border: `1px solid ${colors.border}`, background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button
                onClick={handleFullUpdateSave}
                disabled={fullSaving || !fullForm.newStatus}
                style={{ padding: '8px 16px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: (fullSaving || !fullForm.newStatus) ? 0.6 : 1 }}
              >
                {fullSaving ? 'Saving...' : '💾 Save Update'}
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, fontSize: 13 }}>
              <div style={{ fontWeight: 600 }}>{fullTicket.brand_name} {fullTicket.model} | {fullTicket.serial}</div>
              <div style={{ color: '#6b7280', marginTop: 2 }}>{fullTicket.problem}</div>
              <div style={{ color: '#6b7280', marginTop: 4 }}>Engineer: {fullTicket.assigned_name || 'Unassigned'}</div>
            </div>

            {allowedForFullUpdate.length > 0 ? (
              <>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>New Status *</label>
                  <select value={fullForm.newStatus} onChange={(e) => setFullForm((f) => ({ ...f, newStatus: e.target.value }))} style={styles.formInput}>
                    <option value="">Select status...</option>
                    {allowedForFullUpdate.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>🔩 Spares / Part Request</h3>
                  {fullSpares.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>No parts added.</div>
                  ) : fullSpares.map((s, i) => {
                    const hidePrice = spareHidesFullPrice(s);
                    const isCons = isChargeableSpare(s, fullConsumableCodes);
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
                        <button onClick={() => removeFullSpare(i)} style={{ background: 'none', border: 'none', color: colors.danger, cursor: 'pointer', fontSize: 14 }}>✕</button>
                      </div>
                    );
                  })}
                  {fullSparesTotal > 0 && (
                    <div style={{ fontSize: 12, color: '#0d9488', fontWeight: 700, marginTop: 4 }}>Parts total: ₹{fullSparesTotal.toFixed(0)}</div>
                  )}
                </div>
                {fullForm.newStatus === 'Closed' && (
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Service / Labour ₹</label>
                    <input type="number" value={fullForm.labour} onChange={(e) => setFullForm((f) => ({ ...f, labour: e.target.value }))} style={styles.formInput} placeholder="0" />
                  </div>
                )}
                <div style={{ background: '#f0f9ff', border: '1.5px solid #7dd3fc', borderRadius: 10, padding: 12 }}>
                  <label style={{ fontWeight: 700, color: '#0369a1', fontSize: 13 }}>
                    📎 Attachments {fullTicket.wc_type === 'CSP' && <span style={{ color: '#dc2626' }}>*</span>}
                    <span style={{ fontSize: 11, fontWeight: 400, color: '#64748b' }}>
                      {' '}— Job Sheet photo{fullTicket.wc_type === 'CSP' ? ' is mandatory to Close (CSP call)' : ' (optional, ICP call)'}. Up to 2 extra photos.
                    </span>
                  </label>
                  {[0, 1, 2].map((slot) => (
                    <div key={slot} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12 }}>
                      <span style={{ width: 92, fontWeight: 700, color: '#0369a1' }}>{slot === 0 ? '📄 Job Sheet' : `📎 Extra ${slot}`}</span>
                      {fullPhotos[slot] ? (
                        <>
                          <a href={fullPhotos[slot]!.url} target="_blank" rel="noreferrer" style={{ color: '#0369a1', fontWeight: 600 }}>
                            {fullPhotos[slot]!.isNew ? 'New photo ready' : 'View attached'}
                          </a>
                          <button
                            onClick={() => setFullPhotos((prev) => { const n = [...prev]; n[slot] = null; return n; })}
                            style={{ background: 'none', border: 'none', color: colors.danger, cursor: 'pointer', fontSize: 14 }}
                          >✕</button>
                        </>
                      ) : (
                        <>
                          <label style={{ background: '#0369a1', color: '#fff', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}>
                            📷 Camera
                            <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => onPickFullPhoto(slot, e.target.files?.[0])} />
                          </label>
                          <label style={{ background: '#7c3aed', color: '#fff', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}>
                            📁 Gallery
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => onPickFullPhoto(slot, e.target.files?.[0])} />
                          </label>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Fault Code</label>
                  <input type="text" value={fullForm.faultCode} onChange={(e) => setFullForm((f) => ({ ...f, faultCode: e.target.value }))} style={styles.formInput} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Action Taken *</label>
                  <textarea value={fullForm.note} onChange={(e) => setFullForm((f) => ({ ...f, note: e.target.value }))} rows={3} placeholder="Work done, observations..." style={{ ...styles.formInput, resize: 'vertical' }} />
                </div>
              </>
            ) : (
              <div style={{ background: '#fef3c7', borderRadius: 8, padding: 12, fontSize: 13, color: '#92400e' }}>
                ⏳ No status update available for: <strong>{fullTicket.status}</strong>
              </div>
            )}
          </div>
        </Modal>
      )}

      {fullPaymentPrompt && fullTicket && (
        <Modal
          isOpen
          onClose={() => setFullPaymentPrompt(null)}
          title="💳 Payment Confirmation"
          footer={
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setFullPaymentPrompt(null)} style={{ padding: '8px 16px', border: `1px solid ${colors.border}`, background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button
                onClick={handleConfirmFullPayment}
                disabled={fullSaving}
                style={{ padding: '8px 16px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: fullSaving ? 0.6 : 1 }}
              >
                {fullSaving ? 'Saving...' : '✅ Confirm & Close'}
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Customer Name</label>
              <input type="text" value={fullPaymentForm.cname} onChange={(e) => setFullPaymentForm((f) => ({ ...f, cname: e.target.value }))} style={styles.formInput} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Service Charges (₹)</label>
              <input type="number" value={fullPaymentForm.service} onChange={(e) => setFullPaymentForm((f) => ({ ...f, service: e.target.value }))} style={styles.formInput} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Parts Cost (₹)</label>
              <input type="number" value={fullPaymentForm.parts} onChange={(e) => setFullPaymentForm((f) => ({ ...f, parts: e.target.value }))} style={styles.formInput} />
            </div>
            <div style={{ background: '#f0fdf4', borderRadius: 8, padding: 12, borderLeft: '4px solid #15803d' }}>
              <div style={{ fontSize: 12, color: '#15803d', fontWeight: 700 }}>Total Amount (₹)</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#15803d' }}>
                {((Number(fullPaymentForm.service) || 0) + (Number(fullPaymentForm.parts) || 0)).toFixed(0)}
              </div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Payment Mode *</label>
              <select value={fullPaymentForm.mode} onChange={(e) => setFullPaymentForm((f) => ({ ...f, mode: e.target.value }))} style={styles.formInput}>
                <option value="">— Select —</option>
                <option value="Cash">💵 Cash</option>
                <option value="Online">💻 Online</option>
                <option value="Check">📋 Cheque</option>
                <option value="Card">💳 Card</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Additional Notes</label>
              <textarea value={fullPaymentForm.notes} onChange={(e) => setFullPaymentForm((f) => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Optional notes..." style={{ ...styles.formInput, resize: 'vertical' }} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Sub-component: reusable ticket table
// ──────────────────────────────────────────────────────────────
interface TicketTableProps {
  tickets: TicketRow[];
  engineers: Engineer[];
  routeMode?: boolean;
  routeChanges?: Record<string, RouteChange>;
  onRouteEngChange?: (ticketId: string, engId: string, engName: string) => void;
  onRouteSeqChange?: (ticketId: string, seq: string) => void;
  onMove?: (ticketId: string, dir: 1 | -1) => void;
  onUpdateClick: (ticketId: string) => void;
  actionLabel: string;
  // index.html:26768 — when set, gates the Action cell to the Update button
  // for permitted roles only, showing a plain "Awaiting pickup" text
  // otherwise. Omitted (undefined) means always show the button, matching
  // the main actionable table's unconditional behavior.
  gateAction?: boolean;
}

function TicketTable({ tickets, engineers, routeMode, routeChanges, onRouteEngChange, onRouteSeqChange, onMove, onUpdateClick, actionLabel, gateAction }: TicketTableProps) {
  const inlineSelectStyle: React.CSSProperties = {
    border: `1px solid ${colors.border}`,
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '12px',
    backgroundColor: colors.card,
    color: colors.text,
    cursor: 'pointer',
    maxWidth: '160px',
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.tableHeader}>Ticket ID</th>
            <th style={styles.tableHeader}>Date</th>
            <th style={styles.tableHeader}>Customer</th>
            <th style={styles.tableHeader}>Mobile</th>
            <th style={styles.tableHeader}>Brand/Model</th>
            <th style={styles.tableHeader}>Problem</th>
            <th style={styles.tableHeader}>Area/PIN</th>
            <th style={styles.tableHeader}>Status</th>
            <th style={styles.tableHeader}>TAT Date</th>
            {routeMode && <th style={{ ...styles.tableHeader, color: '#7c3aed' }}>🧑‍🔧 Assign Eng</th>}
            {routeMode && <th style={{ ...styles.tableHeader, color: '#7c3aed' }}>Seq</th>}
            {routeMode && <th style={{ ...styles.tableHeader, color: '#7c3aed', textAlign: 'center' }}>Move</th>}
            <th style={styles.tableHeader}>Action</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => {
            const staged = routeChanges?.[t.id];
            const curEngId = staged?.engId ?? t.assigned_to ?? '';
            const curEngName = staged?.engName ?? t.assigned_name ?? '';
            const seqPrefix = curEngName ? curEngName.trim().charAt(0).toUpperCase() : '';
            const seqValue = staged?.seq ?? (t.sequence_no ? String(t.sequence_no) : '');

            // index.html:26815-26818 — Pending Parts/Pending Engineer Stock rows get a
            // striped/hatched "on hold" background + badge; Pending Repair On Site
            // rows get a green "ready" background + badge.
            const isPendParts = t.status === 'Pending Parts' || t.status === 'Pending Engineer Stock';
            const isReady = t.status === 'Pending Repair On Site';
            const rowBg = isPendParts
              ? 'repeating-linear-gradient(135deg,#f3f4f6,#f3f4f6 6px,#e5e7eb 6px,#e5e7eb 12px)'
              : isReady ? '#dcfce7' : undefined;

            return (
              <tr
                key={t.id}
                style={{ ...styles.tableRow, ...(rowBg ? { background: rowBg } : {}) }}
                onMouseEnter={(e) => {
                  if (!rowBg) e.currentTarget.style.backgroundColor = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  if (!rowBg) e.currentTarget.style.backgroundColor = colors.card;
                }}
              >
                {/* Ticket ID */}
                <td style={styles.tableCell}>
                  <strong style={{ color: colors.primary }}>{t.id}</strong>
                </td>

                {/* Date */}
                <td style={{ ...styles.tableCell, fontSize: '12px' }}>
                  {new Date(t.created_at).toLocaleDateString()}
                </td>

                {/* Customer */}
                <td style={styles.tableCell}>
                  <strong>{t.cname}</strong>
                </td>

                {/* Mobile */}
                <td style={styles.tableCell}>{t.mobile}</td>

                {/* Brand/Model — index.html:26825-26826, Model + Serial combined */}
                <td style={styles.tableCell}>
                  <div>{t.brand_name} {t.model}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>S/N: {t.serial || '—'}</div>
                </td>

                {/* Problem / Remarks */}
                <td style={{ ...styles.tableCell, fontSize: '12px', maxWidth: 180 }}>
                  <div>{t.problem || '—'}</div>
                  {t.remarks && (
                    <div style={{ marginTop: 2, padding: '2px 6px', background: '#fef3c7', borderRadius: 4, color: '#92400e', fontSize: 11 }}>
                      {t.remarks}
                    </div>
                  )}
                </td>

                {/* Area/PIN */}
                <td style={{ ...styles.tableCell, fontSize: '12px' }}>
                  {t.area || '—'}
                  {t.pin ? ` / ${t.pin}` : ''}
                </td>

                {/* Status badge (read-only — status changes go through Update) */}
                <td style={styles.tableCell}>
                  <span
                    style={{
                      ...styles.badge,
                      ...statusBadgeStyle(t.status),
                    }}
                  >
                    {t.status}
                  </span>
                  {isPendParts && <span style={{ marginLeft: 4, background: '#fee2e2', color: '#b91c1c', padding: '1px 5px', borderRadius: 4, fontSize: 9, fontWeight: 700 }}>⛔ HOLD</span>}
                  {isReady && <span style={{ marginLeft: 4, background: '#bbf7d0', color: '#15803d', padding: '1px 5px', borderRadius: 4, fontSize: 9, fontWeight: 700 }}>✅ READY</span>}
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{t.assigned_name || 'Unassigned'}</div>
                </td>

                {/* TAT Date */}
                <td style={{ ...styles.tableCell, fontSize: '12px' }}>
                  <TatBadge tatDate={t.tat_date} />
                </td>

                {/* Route Mode: Assign Engineer (staged, not written until Save Route Plan) */}
                {routeMode && (
                  <td style={styles.tableCell}>
                    <select
                      value={curEngId}
                      onChange={(e) => {
                        const eng = engineers.find((en) => en.user_id === e.target.value);
                        if (eng) onRouteEngChange?.(t.id, eng.user_id, eng.name);
                      }}
                      style={inlineSelectStyle}
                    >
                      <option value="">— Select Eng —</option>
                      {engineers.map((eng) => (
                        <option key={eng.id} value={eng.user_id}>
                          {eng.name}
                        </option>
                      ))}
                    </select>
                  </td>
                )}

                {/* Route Mode: Sequence (staged) */}
                {routeMode && (
                  <td style={styles.tableCell}>
                    <select
                      value={seqValue}
                      onChange={(e) => onRouteSeqChange?.(t.id, e.target.value)}
                      style={{ ...inlineSelectStyle, maxWidth: 72 }}
                      disabled={!seqPrefix}
                    >
                      <option value="">—</option>
                      {seqPrefix && Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{seqPrefix}{n}</option>
                      ))}
                    </select>
                  </td>
                )}

                {/* Route Mode: Move up/down */}
                {routeMode && (
                  <td style={{ ...styles.tableCell, textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <button onClick={() => onMove?.(t.id, -1)} title="Move Up" style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}>▲</button>
                    <button onClick={() => onMove?.(t.id, 1)} title="Move Down" style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}>▼</button>
                  </td>
                )}

                {/* Action — opens the real status-update modal (timeline + notification) */}
                <td style={{ ...styles.tableCell, textAlign: 'center' }}>
                  {gateAction === false ? (
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>Awaiting pickup</span>
                  ) : (
                    <button
                      onClick={() => onUpdateClick(t.id)}
                      style={{ background: colors.primary, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                    >
                      {actionLabel}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}