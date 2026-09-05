'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Ticket, statusBadges, callTypeBadges, statusOptions } from '@/types/tickets';
import { getAllowedStatuses, validateStatusChangeReason, isTicketActive } from '@/types/ticketStatus';
import { colors, styles } from '@/styles/ticketsStyles';
import { useTickets } from '@/hooks/useTickets';
import { useTicketForm } from '@/hooks/useTicketForm';
import { useEngineers } from '@/hooks/useEngineers';
import { createTicket, updateTicket, closeTicket, ensureGroupId } from '@/services/ticketService';
import { printTicket, getBadgeStyle, printJobSheet } from '@/utils/printTicket';
import { generateInvoice } from '@/utils/printInvoice';
import InvoiceModal from '@/components/screens/tickets/InvoiceModal';
import { approveWarrantyClaim, rejectWarrantyClaim } from '@/services/warrantyClaimService';
import VoidWarrantyModal from '@/components/screens/tickets/VoidWarrantyModal';
import ReportEditRequestModal from '@/components/screens/tickets/ReportEditRequestModal';
import { approveReportEdit, rejectReportEdit } from '@/services/ticketService';
import { isCspManager, isAccountant } from '@/lib/permissions';
import BackdateCloseModal from '@/components/screens/tickets/BackdateCloseModal';
import { printLabel } from '@/utils/printLabel';
import MSCDispatchPanel from '@/components/screens/tickets/MSCDispatchPanel';
import SetTATModal from '@/components/screens/tickets/SetTATModal';
import SignatureModal from '@/components/screens/tickets/SignatureModal';
import { approveTicket, rejectTicket } from '@/services/customerApprovalService';
import { EstimateForm, emptyEstimateForm, calcEstimate, ApprovalSpare } from '@/types/customerApproval';
import { fetchProblemTypes } from '@/services/masterService';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import Modal from '@/components/Modal';

interface Props {
  // "+ New Call" fired from elsewhere (e.g. the Dashboard's Recent Tickets
  // card, index.html:3857) via a 'bhavi:navigate-tab' CustomEvent — the
  // parent dashboard switches to this tab and sets this flag; consumed once.
  autoOpenAdd?: boolean;
  onConsumedAutoOpenAdd?: () => void;
}

export default function TicketsScreen({ autoOpenAdd, onConsumedAutoOpenAdd }: Props = {}) {
  const { data: session } = useSession();
  const currentUserRole = (session?.user as any)?.roleType;
  const currentUserId = (session?.user as any)?.email;
  const cspMgr = isCspManager(session);
  const isAcct = isAccountant(session);

  const { tickets, loading, fetchTickets } = useTickets({
    userRole: currentUserRole,
    userId: currentUserId,
    userName: (session?.user as any)?.name,
    isAccountant: isAcct,
    cspOnly: cspMgr,
  });
  const { engineers, loading: engineersLoading, error: engineersError, loadEngineers: refetchEngineers } = useEngineers()
  const { formData, handleFormChange, setFormValues, resetForm } = useTicketForm();

  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [invoiceModalTicket, setInvoiceModalTicket] = useState<Ticket | null>(null);
  const [voidWarrantyTicket, setVoidWarrantyTicket] = useState<Ticket | null>(null);
  const [reportEditTicket, setReportEditTicket] = useState<Ticket | null>(null);
  const [backdateTicket, setBackdateTicket] = useState<Ticket | null>(null);
  const [tatTicket, setTatTicket] = useState<Ticket | null>(null);
  const [tatPreview, setTatPreview] = useState('');
  const [sigTicket, setSigTicket] = useState<Ticket | null>(null);
  const [estimateTicket, setEstimateTicket] = useState<Ticket | null>(null);
  const [estimateForm, setEstimateForm] = useState<EstimateForm>(emptyEstimateForm);
  const [inspCharges, setInspCharges] = useState('300');
  const [estimateSaving, setEstimateSaving] = useState(false);
  // "Add Product (Same Customer)" — mirrors HTML's addProductForSameCustomer():
  // links a new call to an existing one's group_id and pre-fills customer info.
  const [groupBanner, setGroupBanner] = useState<{ groupId: string; anchor: Ticket } | null>(null);

  // Check if current user can edit this ticket
  const canEditTicket = (ticket: Ticket) => {
    if (currentUserRole === 'admin' || currentUserRole === 'work_controller' || cspMgr) {
      return true;
    }
    if (currentUserRole === 'engineer') {
      return ticket.assigned_to === currentUserId;
    }
    return false;
  };

  const isInvoiceable = (t: Ticket) => (t.call_type === 'Non-Warranty' || t.call_type === 'Non-Warranty Repeat') && ['Closed', 'Delivered', 'Customer Reject'].includes(t.status);
  // index.html:6255 splits these two. `canInv` decides who SEES the invoice
  // status at all (WC / admin / CSP manager / accountant) and who may edit an
  // invoice number that already exists. `canMark` — who may actually ADD the
  // invoice number on a still-pending call — is narrower: work_controller or
  // the accountant only. A CSP manager gets read-only visibility of the
  // "⚠️ Invoice Pending" state, never the mark action.
  const canSeeInvoiceStatus = currentUserRole === 'admin' || currentUserRole === 'work_controller' || cspMgr || isAcct;
  const canMarkInvoice = currentUserRole === 'work_controller' || isAcct;

  const allowedStatusOptions = useMemo(() => {
    if (modalMode !== 'edit' || !selectedTicket) return statusOptions;
    const next = getAllowedStatuses(selectedTicket.status, currentUserRole, formData.service_type, formData.call_type, formData.warranty_coverage);
    return Array.from(new Set([selectedTicket.status, ...next]));
  }, [modalMode, selectedTicket, currentUserRole, formData.service_type, formData.call_type, formData.warranty_coverage]);

  // Handle engineer assignment - update both ID and name
  const handleEngineerChange = (engineerId: string) => {
    const selectedEngineer = engineers.find((e) => e.user_id === engineerId);
    // Update assigned_to
    handleFormChange({
      target: {
        name: 'assigned_to',
        value: engineerId,
      },
    } as any);
    // Update assigned_name
    handleFormChange({
      target: {
        name: 'assigned_name',
        value: selectedEngineer?.name || '',
      },
    } as any);
  };

  // Ensure assigned_name is set based on assigned_to before saving
  const getFormDataWithEngineerName = () => {
    let data = { ...formData };

    if (data.assigned_to && !data.assigned_name) {
      const engineer = engineers.find((e) => e.user_id === data.assigned_to);
      if (engineer) {
        data.assigned_name = engineer.name;
      }
    }

    return data;
  };

  const handleAddClick = () => {
    setModalMode('add');
    setSelectedTicket(null);
    resetForm();
    setGroupBanner(null);
    // Engineers creating their own call: pre-select self (mirrors HTML's
    // openEngNewCall() auto-selecting the current engineer).
    if (currentUserRole === 'engineer') {
      setFormValues({ assigned_to: currentUserId, assigned_name: (session?.user as any)?.name || '' });
    }
    setModalOpen(true);
  };

  useEffect(() => {
    if (autoOpenAdd) { handleAddClick(); onConsumedAutoOpenAdd?.(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenAdd]);

  // Mirrors HTML's addProductForSameCustomer(): links the new call to the
  // anchor ticket's group_id and pre-fills customer/address/brand so only
  // the product-specific fields need filling in.
  const handleAddProductSameCustomer = async (t: Ticket) => {
    const r = await ensureGroupId(t);
    if (!r.success || !r.groupId) { alert('❌ ' + (r.error || 'Could not link call group')); return; }
    setModalMode('add');
    setSelectedTicket(null);
    resetForm();
    setFormValues({
      cname: t.cname, mobile: t.mobile, alt_mobile: t.alt_mobile || '', address: t.address || '',
      city: t.city || '', state: t.state || 'Gujarat', pin: t.pin || '', area: t.area || '',
      service_type: t.service_type || 'On Site', priority: t.priority || 'Normal',
      brand_name: t.brand_name || '', wc_type: t.wc_type || 'ICP',
      assigned_to: currentUserRole === 'engineer' ? currentUserId : (t.assigned_to || ''),
      assigned_name: currentUserRole === 'engineer' ? ((session?.user as any)?.name || '') : (t.assigned_name || ''),
    });
    setGroupBanner({ groupId: r.groupId, anchor: t });
    setModalOpen(true);
  };

  const handleViewTicket = (ticket: Ticket) => {
    setModalMode('view');
    setSelectedTicket(ticket);
    setFormValues(ticket);
    setModalOpen(true);
  };

  const handlePrintTicket = () => {
    if (selectedTicket) printTicket(selectedTicket);
  };

  const handleSaveRemarks = async () => {
    if (!selectedTicket) return;

    // Check authorization
    if (!canEditTicket(selectedTicket)) {
      alert('❌ You can only edit tickets assigned to you');
      return;
    }

    // View mode's Status / Assign-to-Engineer fields are quick-edit —
    // mirrors HTML's quickStatusChange()/quickEngChange() dropdowns, which
    // are always available on the ticket view (not gated behind a separate
    // edit mode). Only include them in the update when actually changed.
    const updates: Record<string, any> = { remarks: formData.remarks };
    if (formData.status && formData.status !== selectedTicket.status) {
      if (formData.status === 'Call Cancel') {
        const reason = prompt('🚫 Cancel Reason (mandatory):');
        if (!reason || !reason.trim()) { alert('Reason is mandatory!'); return; }
        updates.remarks = updates.remarks ? `${updates.remarks}\n\nCancel reason: ${reason}` : `Cancel reason: ${reason}`;
      }
      updates.status = formData.status;
    }
    if (formData.assigned_to !== undefined && formData.assigned_to !== selectedTicket.assigned_to) {
      updates.assigned_to = formData.assigned_to || null;
      updates.assigned_name = formData.assigned_name || null;
    }

    try {
      const result = await updateTicket(selectedTicket.id, updates);
      if (result.success) {
        alert('✅ Changes saved!');
        setModalOpen(false);
        await fetchTickets();
      } else alert('❌ Failed');
    } catch (err) {
      alert('❌ Error');
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;

    // Check authorization
    if (!canEditTicket(selectedTicket)) {
      alert('❌ You can only close tickets assigned to you');
      return;
    }

    if (selectedTicket.status === 'Closed') {
      alert('⚠️ This ticket is already closed');
      return;
    }

    const confirmed = confirm(`Are you sure you want to close ticket ${selectedTicket.id}? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      const result = await closeTicket(selectedTicket.id, formData.remarks, (session?.user as any)?.name || currentUserRole || '');
      if (result.success) {
        alert('✅ Ticket closed!');
        setModalOpen(false);
        resetForm();
        await fetchTickets();
      } else {
        alert('❌ Failed to close ticket: ' + result.error);
      }
    } catch (err) {
      alert('❌ Error');
    }
  };

  const handleAddTicket = async () => {
    if (!formData.cname || !formData.mobile || !formData.serial) {
      alert('❌ Fill required fields');
      return;
    }

    try {
      if (modalMode === 'edit' && selectedTicket) {
        // Check authorization
        if (!canEditTicket(selectedTicket)) {
          alert('❌ You can only edit tickets assigned to you');
          return;
        }

        const ticketData = getFormDataWithEngineerName();
        if (ticketData.status !== selectedTicket.status) {
          const reason = validateStatusChangeReason(selectedTicket.status, ticketData.status);
          if (reason === null) return; // user cancelled the mandatory reason prompt
          if (reason) ticketData.remarks = ticketData.remarks ? `${ticketData.remarks}\n\nStatus change reason: ${reason}` : `Status change reason: ${reason}`;
        }
        console.log('Updating ticket with data:', { assigned_to: ticketData.assigned_to, assigned_name: ticketData.assigned_name, status: ticketData.status });
        const result = await updateTicket(selectedTicket.id, ticketData);
        if (!result.success) throw new Error(result.error);
        alert('✅ Updated!');
      } else {
        const ticketData: Partial<Ticket> = { ...getFormDataWithEngineerName() };
        // Engineers don't see the "Assign to Engineer" field (admin/WC only) —
        // default the call to themselves, mirroring HTML's auto-select.
        if (currentUserRole === 'engineer' && !ticketData.assigned_to) {
          ticketData.assigned_to = currentUserId;
          ticketData.assigned_name = (session?.user as any)?.name || '';
        }
        if (groupBanner) ticketData.group_id = groupBanner.groupId;
        console.log('Creating ticket with data:', { assigned_to: ticketData.assigned_to, assigned_name: ticketData.assigned_name, status: ticketData.status });
        const result = await createTicket(ticketData);
        if (!result.success) throw new Error(result.error);
        alert('✅ Created! ID: ' + result.id);
      }
      setModalOpen(false);
      resetForm();
      setGroupBanner(null);
      await fetchTickets();
    } catch (err) {
      alert('❌ Error');
    }
  };

  // index.html:4828-4838 — WC Type / Brand / Engineer / Problem filters.
  // Brand is a fixed 2-option dropdown (not free text/master-data driven) in
  // HTML — same as PendingListScreen's brand filter — matched via includes().
  const [wcTypeFilter, setWcTypeFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [engineerFilter, setEngineerFilter] = useState('');
  const [problemFilter, setProblemFilter] = useState('');
  // Problem autocomplete suggestions — union of Master Data's Problem Types
  // AND every distinct value actually typed into tickets' problem field
  // (index.html:4792-4802 ticketProblemFilterOptions()), since the New Call
  // form's Problem field is free-text with autocomplete, not a locked list.
  const [masterProblems, setMasterProblems] = useState<string[]>([]);
  useEffect(() => { fetchProblemTypes().then((rows) => setMasterProblems(rows.map((r) => r.problem).filter(Boolean))).catch(() => undefined); }, []);
  const problemOptions = useMemo(() => {
    const set = new Set<string>();
    masterProblems.forEach((p) => set.add(p.trim()));
    tickets.forEach((t) => { if (t.problem) set.add(t.problem.trim()); });
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [masterProblems, tickets]);

  const filteredTickets = useMemo(() => {
    const showAll = !!searchTerm || invoiceFilter !== 'all' || !!problemFilter;
    return tickets.filter((ticket) => {
      const matchesStatus = filterStatus === 'all' ? (showAll || isTicketActive(ticket.status)) : ticket.status === filterStatus;
      const matchesSearch = ticket.cname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.mobile.includes(searchTerm) ||
        ticket.serial.includes(searchTerm) ||
        ticket.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesInvoice = invoiceFilter === 'all'
        || (invoiceFilter === 'pending' && isInvoiceable(ticket) && !ticket.invoice_done)
        || (invoiceFilter === 'done' && isInvoiceable(ticket) && ticket.invoice_done);
      const matchesWc = !wcTypeFilter || ticket.wc_type === wcTypeFilter;
      const matchesBrand = !brandFilter || (ticket.brand_name || '').toLowerCase().includes(brandFilter.toLowerCase());
      const matchesEng = !engineerFilter || ticket.assigned_to === engineerFilter;
      const matchesProblem = !problemFilter || (ticket.problem || '').toLowerCase().includes(problemFilter.toLowerCase());
      return matchesStatus && matchesSearch && matchesInvoice && matchesWc && matchesBrand && matchesEng && matchesProblem;
    });
  }, [tickets, filterStatus, searchTerm, invoiceFilter, wcTypeFilter, brandFilter, engineerFilter, problemFilter]);

  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [filterStatus, searchTerm, invoiceFilter, wcTypeFilter, brandFilter, engineerFilter, problemFilter, pageSize]);
  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / pageSize));
  const pagedTickets = useMemo(() => filteredTickets.slice((page - 1) * pageSize, page * pageSize), [filteredTickets, page, pageSize]);

  const handleApproveWarrantyClaim = async (ticket: Ticket) => {
    if (!confirm('Approve warranty claim? This will convert the call to Warranty type and set charges to zero.')) return;
    const r = await approveWarrantyClaim(ticket, (session?.user as any)?.name || currentUserRole || '');
    if (r.success) { alert('✅ Warranty approved — call converted to Warranty.'); setModalOpen(false); await fetchTickets(); }
    else alert('Error: ' + r.error);
  };

  const handleRejectWarrantyClaim = async (ticket: Ticket) => {
    const reason = prompt('Reason for rejection (will be noted):');
    if (reason === null) return;
    const r = await rejectWarrantyClaim(ticket, reason, (session?.user as any)?.name || currentUserRole || '');
    if (r.success) { alert('Warranty claim rejected.'); setModalOpen(false); await fetchTickets(); }
    else alert('Error: ' + r.error);
  };

  const handleApproveReportEdit = async (t: Ticket) => {
    if (!confirm(`Approve report edit for ${t.id} — ${t.cname}?`)) return;
    const r = await approveReportEdit(t, (session?.user as any)?.name || 'Admin');
    if (r.success) { alert('✅ Edit approved! Report has been updated.'); setModalOpen(false); await fetchTickets(); }
    else alert('Error: ' + r.error);
  };

  const handleRejectReportEdit = async (t: Ticket) => {
    const reason = prompt('Reason for rejection (will be added to history):');
    if (reason === null) return;
    const r = await rejectReportEdit(t, (session?.user as any)?.name || 'Admin', reason);
    if (r.success) { alert('❌ Edit request rejected. Original report remains unchanged.'); setModalOpen(false); await fetchTickets(); }
    else alert('Error: ' + r.error);
  };

  const handleViewEditDiff = (t: Ticket) => {
    const pe = t.pending_edit;
    if (!pe) return;
    const fieldLabels: Record<string, string> = { cname: 'Customer Name', mobile: 'Mobile', alt_mobile: 'Alt Mobile', city: 'City', address: 'Address', area: 'Area', pin: 'Pin', call_type: 'Call Type', service_type: 'Service Type', problem: 'Problem', description: 'Description', model: 'Model', serial: 'Serial No', condition: 'Condition', se_call_id: 'SE Call ID', labor: 'Labor ₹', brand_name: 'Brand' };
    const rows = Object.entries(pe.changes || {}).map(([k, v]) => `<tr><td style="padding:6px 10px;font-weight:600;font-size:12px;color:#6b7280;white-space:nowrap;">${fieldLabels[k] || k}</td><td style="padding:6px 10px;font-size:13px;background:#fef2f2;color:#991b1b;">${String(v.old || '—')}</td><td style="padding:6px 10px;font-size:13px;background:#f0fdf4;color:#166534;">${String(v.new || '—')}</td></tr>`).join('');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Report Edit Diff — ${t.id}</title><style>body{font-family:Arial;padding:20px;font-size:13px;}table{border-collapse:collapse;width:100%;}th,td{border:1px solid #e5e7eb;padding:6px 10px;}th{background:#f8fafc;}h2{margin-bottom:4px;}p{color:#6b7280;font-size:12px;margin-top:4px;}</style></head><body>
      <h2>Report Edit Request — ${t.id} | ${t.cname}</h2>
      <p>Requested by: <b>${pe.requested_by}</b> at ${new Date(pe.requested_at).toLocaleString('en-IN')}<br/>Reason: <b>${pe.reason}</b></p>
      <table><thead><tr><th>Field</th><th style="background:#fef2f2;color:#991b1b;">Old Value</th><th style="background:#f0fdf4;color:#166534;">New Value</th></tr></thead><tbody>${rows}</tbody></table>
    </body></html>`);
    win.document.close();
  };

  // Engineer handles approval/rejection on their own assigned call's estimate
  // directly — same Approve/Reject Estimate modal admin/WC uses (matches
  // HTML's openApproval, reused here from customerApprovalService.ts).
  const openEstimateModal = (t: Ticket) => {
    setModalOpen(false);
    setEstimateTicket(t);
    setEstimateForm({ ...emptyEstimateForm, labourAmt: String(t.service_charges || t.labor || 0) });
    setInspCharges(String(t.service_charges || t.labor || 300));
  };

  const { partsAfterDisc: estPartsAfterDisc, labourAfterDisc: estLabourAfterDisc, final: estimateFinal, saved: estimateSaved } =
    calcEstimate(estimateForm, (estimateTicket?.spares || []) as ApprovalSpare[]);

  const handleApproveEstimate = async () => {
    if (!estimateTicket) return;
    if (!estimateForm.remark.trim()) { alert('Remark is required'); return; }
    setEstimateSaving(true);
    const r = await approveTicket(estimateTicket, estimateFinal, Number(estimateForm.labourAmt), estimateForm.remark, (session?.user as any)?.name || currentUserRole || '');
    setEstimateSaving(false);
    if (r.success) { setEstimateTicket(null); alert(`✅ Approved! Status → ${r.newStatus}`); await fetchTickets(); }
    else alert('Error: ' + r.error);
  };

  const handleRejectEstimate = async () => {
    if (!estimateTicket) return;
    if (!estimateForm.remark.trim()) { alert('Remark is required'); return; }
    const charges = Number(inspCharges);
    if (isNaN(charges) || charges < 0) { alert('Enter valid Inspection/Visit Charges'); return; }
    if (!confirm(`Customer Reject — Inspection/Visit Charges will be finalized at ₹${charges}. Continue?`)) return;
    setEstimateSaving(true);
    const r = await rejectTicket(estimateTicket, estimateForm.remark, charges, (session?.user as any)?.name || currentUserRole || '');
    setEstimateSaving(false);
    if (r.success) { setEstimateTicket(null); await fetchTickets(); }
    else alert('Error: ' + r.error);
  };

  const screenTitle = currentUserRole === 'engineer' && !cspMgr ? '🎫 My Tickets' : '🎫 All Tickets';

  const handlePrintLabel = () => {
    if (selectedTicket) printLabel(selectedTicket);
  };

  // "📥 Excel Export" (index.html:4842, exportFilteredTickets()) — dumps the
  // currently filtered ticket list, including per-call timeline-derived visit/
  // work/close timestamps and durations.
  const handleExcelExport = () => {
    const filtered = filteredTickets;
    if (!filtered.length) { alert('No records to export.'); return; }

    const durHrs = (from?: string | null, to?: string | null): string | null => {
      if (!from || !to) return null;
      const m = (new Date(to).getTime() - new Date(from).getTime()) / 60000;
      if (m < 0) return null;
      if (m < 60) return `${Math.round(m)}m`;
      const h = Math.floor(m / 60), mn = Math.round(m % 60);
      return `${h}h${mn ? ` ${mn}m` : ''}`;
    };
    const getTL = (t: Ticket): any[] => {
      let tl: any = (t as any).timeline || [];
      if (typeof tl === 'string') { try { tl = JSON.parse(tl); } catch { tl = []; } }
      return Array.isArray(tl) ? tl : [];
    };
    const getWorkStartAt = (t: Ticket) => { const e = [...getTL(t)].reverse().find((x) => x.action && String(x.action).includes('Work Start')); return e?.at || null; };
    const getClosedAt = (t: Ticket) => { const e = [...getTL(t)].reverse().find((x) => x.action && (String(x.action).toLowerCase().includes('closed') || String(x.action).toLowerCase().includes('close'))); return e?.at || null; };
    const getTotalRepairHrs = (t: Ticket): string | null => {
      const tl = getTL(t);
      const sessions = tl.filter((e) => e.action === 'Work Session End');
      const done = sessions.reduce((s, e) => s + (e.duration_min || 0), 0);
      const closedAt = getClosedAt(t);
      const lastWs = [...tl].reverse().find((e) => e.action && String(e.action).includes('Work Start'));
      const lastSessEnd = sessions.length ? sessions[sessions.length - 1] : null;
      let extra = 0;
      if (lastWs && closedAt) {
        const wsTime = new Date(lastWs.at).getTime();
        const clTime = new Date(closedAt).getTime();
        if (lastSessEnd) {
          const sessEndTime = new Date(lastSessEnd.at).getTime();
          if (wsTime > sessEndTime) { const m = Math.round((clTime - wsTime) / 60000); if (m > 0) extra = m; }
        } else {
          const m = Math.round((clTime - wsTime) / 60000); if (m > 0) extra = m;
        }
      }
      const total = done + extra;
      if (!total) return null;
      const h = Math.floor(total / 60), m = total % 60;
      return h > 0 ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`;
    };
    const getVisitStartAt = (t: Ticket) => { const e = getTL(t).find((x) => x.action === 'Visit Start'); return e?.at || null; };
    const getManualTimeRemark = (t: Ticket) => { const e = getTL(t).find((x) => x.action === 'Manual Time Update'); return e ? (e.note || 'Yes') : ''; };

    const engMap: Record<string, Ticket[]> = {};
    filtered.forEach((t) => { const e = t.assigned_name || 'UNASSIGNED'; (engMap[e] = engMap[e] || []).push(t); });
    Object.values(engMap).forEach((arr) => arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
    const visitGap: Record<string, string | null> = {};
    Object.values(engMap).forEach((arr) => {
      for (let i = 1; i < arr.length; i++) {
        const prevClosed = getClosedAt(arr[i - 1]);
        if (prevClosed && arr[i].created_at) visitGap[arr[i].id] = durHrs(prevClosed, arr[i].created_at);
      }
    });

    const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-');
    const fmtTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-');

    const headers = ['Ticket ID', 'Customer', 'Mobile', 'City', 'Brand', 'Model', 'Serial', 'Call Type', 'Service Type', 'WC Type', 'Engineer', 'Status',
      'Open Date', 'Open Time', 'Visit Start (Travel) Date', 'Visit Start Time', 'Work Start Date', 'Work Start Time', 'Close Date', 'Close Time',
      'Travel Time (Visit→Work Start)', 'Repair Time (Work Start→Close)', 'Resolution Time (Open→Close)', 'Visit Gap (from prev close)',
      'Manual Time?', 'Manual Time Remark', 'Remarks'];
    const data = filtered.map((t) => {
      const closedAt = getClosedAt(t);
      const workStartAt = getWorkStartAt(t);
      const visitStartAt = getVisitStartAt(t);
      const manualRemark = getManualTimeRemark(t);
      return [
        t.id, t.cname, t.mobile, t.city, t.brand_name, t.model, t.serial,
        t.call_type, t.service_type, t.wc_type || '-', t.assigned_name || '-', t.status,
        fmtDate(t.created_at), fmtTime(t.created_at),
        fmtDate(visitStartAt), fmtTime(visitStartAt),
        fmtDate(workStartAt), fmtTime(workStartAt),
        fmtDate(closedAt), fmtTime(closedAt),
        durHrs(visitStartAt, workStartAt) || '-',
        getTotalRepairHrs(t) || durHrs(workStartAt, closedAt) || '-',
        durHrs(t.created_at, closedAt) || '-',
        visitGap[t.id] || '-',
        manualRemark ? 'YES ⚠️' : '-',
        manualRemark || '-',
        t.remarks || '-',
      ];
    });
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    ws['!cols'] = [{ wch: 13 }, { wch: 18 }, { wch: 13 }, { wch: 13 }, { wch: 12 }, { wch: 13 }, { wch: 15 }, { wch: 14 }, { wch: 13 }, { wch: 10 }, { wch: 18 }, { wch: 20 }, { wch: 12 }, { wch: 11 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 11 }, { wch: 24 }, { wch: 24 }, { wch: 22 }, { wch: 22 }, { wch: 10 }, { wch: 35 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tickets');
    XLSX.writeFile(wb, `BhaviCRM_Tickets_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // "📷 View Call Photos" (index.html:4890, viewCallPhotos()) — Job Sheet +
  // extra attachment photos plus every KM/odometer photo logged for the call.
  const [callPhotosTicket, setCallPhotosTicket] = useState<Ticket | null>(null);
  const [callPhotosKm, setCallPhotosKm] = useState<any[]>([]);
  const [callPhotosLoading, setCallPhotosLoading] = useState(false);
  const openCallPhotos = async (t: Ticket) => {
    setCallPhotosTicket(t);
    setCallPhotosLoading(true);
    const { data } = await supabase.from('km_logs').select('*').eq('ticket_id', t.id).order('captured_at', { ascending: true });
    setCallPhotosKm(data || []);
    setCallPhotosLoading(false);
  };

  // View-mode charges breakdown — Customer Reject: parts were only
  // requested/estimated, never fitted, so they must not be billed; only the
  // final inspection/visit charge (already in labor/final_charges) applies.
  const isCustReject = selectedTicket?.status === 'Customer Reject';
  const fittedPartsTotal = isCustReject ? 0 : (selectedTicket?.spares || []).filter(s => !s.requested).reduce((a, s) => a + (s.qty || 0) * (s.price || 0), 0);
  const ticketLaborCharge = Number(selectedTicket?.labor) || Number(selectedTicket?.service_charges) || 0;
  const ticketFinalCharge = Number(selectedTicket?.final_charges) || 0;
  const ticketGrandTotal = ticketFinalCharge > 0 ? ticketFinalCharge : (ticketLaborCharge + fittedPartsTotal + (Number(selectedTicket?.other_charge) || 0));
  // index.html:6220-6222 — admin/WC/CSP manager get the "Approve / Reject
  // Estimate" button on ANY Pending Customer Approval ticket, in addition to
  // the engineer's own-assigned-call case.
  const canApproveEstimate = !!selectedTicket && selectedTicket.status === 'Pending Customer Approval' && (
    (currentUserRole === 'engineer' && selectedTicket.assigned_to === currentUserId)
    || currentUserRole === 'admin' || currentUserRole === 'work_controller' || cspMgr
  );

  return (
    <div style={{ padding: '20px' }}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>{screenTitle}</h2>
        <button style={{ ...styles.btn, ...styles.btnPrimary }} onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.btnPrimaryHover)} onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.btnPrimary)} onClick={handleAddClick}>
          ➕ New Call
        </button>
      </div>

      <div style={styles.filterBar}>
        <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ ...styles.filterInput, flex: 1 }} />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={styles.filterSelect}>
          <option value="all">All</option>
          {statusOptions.map((s) => (<option key={s} value={s}>{s}</option>))}
        </select>
        <select value={wcTypeFilter} onChange={(e) => setWcTypeFilter(e.target.value)} style={styles.filterSelect}>
          <option value="">All WC Type</option>
          <option value="ICP">ICP</option>
          <option value="CSP">CSP</option>
        </select>
        <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} style={styles.filterSelect}>
          <option value="">All Brands</option>
          <option value="Printer">Printer</option>
          <option value="Scanner">Scanner</option>
        </select>
        <select value={engineerFilter} onChange={(e) => setEngineerFilter(e.target.value)} style={styles.filterSelect}>
          <option value="">All Engineers</option>
          {engineers.map((e) => (<option key={e.user_id} value={e.user_id}>{e.name}</option>))}
        </select>
        <input
          type="text" list="ticket-problem-list" placeholder="All Problems" value={problemFilter}
          onChange={(e) => setProblemFilter(e.target.value)} style={{ ...styles.filterInput, minWidth: 160 }}
        />
        <datalist id="ticket-problem-list">
          {problemOptions.map((p) => (<option key={p} value={p} />))}
        </datalist>
        <select value={invoiceFilter} onChange={(e) => setInvoiceFilter(e.target.value as any)} style={styles.filterSelect}>
          <option value="all">All Invoice</option>
          <option value="pending">🧾 Invoice Pending</option>
          <option value="done">✅ Invoice Done</option>
        </select>
        <button style={{ ...styles.btn, ...styles.btnSm, ...styles.btnOutline }} onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.btnOutlineHover)} onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.btnOutline)} onClick={handleExcelExport}>
          📥 Excel Export
        </button>
        <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} style={styles.filterSelect}>
          <option value={30}>30 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
          <option value={200}>200 / page</option>
        </select>
      </div>

      {loading ? <div style={styles.loadingText}>Loading...</div> : filteredTickets.length === 0 ? <div style={styles.emptyMessage}>{tickets.length === 0 ? 'No tickets' : 'No matches'}</div> : (
        <div style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.tableHeader}>ID</th>
                <th style={styles.tableHeader}>Date</th>
                <th style={styles.tableHeader}>Customer</th>
                <th style={styles.tableHeader}>Mobile</th>
                <th style={styles.tableHeader}>Brand/Model</th>
                <th style={styles.tableHeader}>Serial</th>
                <th style={styles.tableHeader}>Type</th>
                <th style={styles.tableHeader}>Service</th>
                <th style={styles.tableHeader}>Problem</th>
                <th style={styles.tableHeader}>Status</th>
                <th style={styles.tableHeader}>Invoice</th>
                <th style={styles.tableHeader}>Engineer</th>
                <th style={styles.tableHeader}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pagedTickets.map((t) => {
                const isCarryIn = t.service_type === 'Carry In';
                return (
                  <tr key={t.id} style={{ ...styles.tableRow, ...(isCarryIn ? { backgroundColor: '#ffedd5' } : {}) }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isCarryIn ? '#ffedd5' : colors.card)}>
                    <td style={styles.tableCell}><strong>{t.id}</strong></td>
                    <td style={{ ...styles.tableCell, fontSize: '12px' }}>{new Date(t.created_at).toLocaleDateString()}</td>
                    <td style={styles.tableCell}><strong>{t.cname}</strong></td>
                    <td style={{ ...styles.tableCell, color: colors.primary, fontWeight: 600 }}>{t.mobile}</td>
                    <td style={styles.tableCell}>{t.brand_name} / {t.model}</td>
                    <td style={{ ...styles.tableCell, fontSize: '12px' }}>{t.serial}</td>
                    <td style={styles.tableCell}>
                      <span style={{ ...styles.badge, ...getBadgeStyle(callTypeBadges[t.call_type] || 'badge-open') }}>{t.call_type}</span>{' '}
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, ...(isCarryIn ? { background: '#fed7aa', color: '#9a3412' } : { background: '#bfdbfe', color: '#1e40af' }) }}>{isCarryIn ? '🏠 CARRY IN' : '📍 ON SITE'}</span>
                    </td>
                    <td style={styles.tableCell}>{t.service_type}</td>
                    <td style={{ ...styles.tableCell, fontSize: '12px' }}>{t.problem}</td>
                    <td style={styles.tableCell}>
                      <span style={{ ...styles.badge, ...getBadgeStyle(statusBadges[t.status] || 'badge-open') }}>{t.status}</span>
                      {t.pending_edit && <span style={{ marginLeft: 4, background: '#fbbf24', color: '#78350f', borderRadius: 4, padding: '1px 5px', fontSize: 10, fontWeight: 700 }}>✏️ Edit</span>}
                    </td>
                    <td style={styles.tableCell}>
                      {isInvoiceable(t) && (
                        t.invoice_done
                          ? <span style={{ ...styles.badge, backgroundColor: '#dcfce7', color: '#15803d' }}>✅ Inv</span>
                          : <span style={{ ...styles.badge, backgroundColor: '#fef3c7', color: '#92400e' }}>🧾 Pending</span>
                      )}
                    </td>
                    <td style={{ ...styles.tableCell, fontSize: '12px' }}>{t.assigned_name || <span style={{ color: colors.danger, fontSize: 12 }}>⚠️ Unassigned</span>}</td>
                    <td style={styles.tableCell}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                        <button style={{ ...styles.btn, ...styles.btnSm, ...styles.btnPrimary }} onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.btnPrimaryHover)} onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.btnPrimary)} onClick={() => handleViewTicket(t)}>
                          👁 View
                        </button>
                        {currentUserRole === 'engineer' && (
                          <button style={{ ...styles.btn, ...styles.btnSm, ...styles.btnOutline }} onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.btnOutlineHover)} onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.btnOutline)} onClick={() => handleAddProductSameCustomer(t)}>
                            ➕ Add Product
                          </button>
                        )}
                        <button title="View Call Photos" style={{ ...styles.btn, ...styles.btnSm, ...styles.btnOutline, padding: '6px 8px' }} onClick={() => openCallPhotos(t)}>📷</button>
                        <button title="Print Job Sheet" style={{ ...styles.btn, ...styles.btnSm, ...styles.btnOutline, padding: '6px 8px' }} onClick={() => printJobSheet(t)}>🖨️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 4px', fontSize: '13px', color: colors.textMuted }}>
            <span>{filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''} — page {page} of {totalPages}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} style={{ ...styles.btn, ...styles.btnSm, ...styles.btnOutline, opacity: page <= 1 ? 0.5 : 1 }}>← Prev</button>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} style={{ ...styles.btn, ...styles.btnSm, ...styles.btnOutline, opacity: page >= totalPages ? 0.5 : 1 }}>Next →</button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div style={styles.modalOverlay} onClick={() => { setModalOpen(false); setGroupBanner(null); }}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>{modalMode === 'add' ? '➕ New' : modalMode === 'edit' ? '✏️ Edit' : '👁 View'} Ticket</h2>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {modalMode === 'view' && (
                  <button style={{ ...styles.btn, ...styles.btnOutline, ...styles.btnSm }} onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.btnOutlineHover)} onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.btnOutline)} onClick={handlePrintTicket}>
                    🖨️ Print
                  </button>
                )}
                {modalMode === 'view' && (
                  <button style={{ ...styles.btn, ...styles.btnOutline, ...styles.btnSm }} onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.btnOutlineHover)} onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.btnOutline)} onClick={handlePrintLabel}>
                    🏷️ Label
                  </button>
                )}
                <button style={styles.closeBtn} onClick={() => { setModalOpen(false); setGroupBanner(null); }}>✕</button>
              </div>
            </div>

            <div style={styles.modalBody}>
              {modalMode === 'add' && groupBanner && (
                <div style={{ background: '#ecfdf5', border: '1.5px solid #6ee7b7', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#065f46' }}>
                  🔗 Linked to Call Group <b>{groupBanner.groupId}</b> — Customer/Address/Brand same as {groupBanner.anchor.id} used (no need to re-check). Just fill in Model No, Serial No, Call Type, Problem, Description &amp; Engineer — Save creates a new ticket ID under the same group.
                </div>
              )}
              {modalMode === 'view' && selectedTicket?.pending_edit && (currentUserRole === 'admin' || cspMgr) && (
                <div style={{ background: '#fef3c7', border: '1.5px solid #fbbf24', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
                  ⏳ <b>Edit Pending Approval</b> — Requested by <b>{selectedTicket.pending_edit.requested_by}</b><br />
                  <span style={{ fontSize: 12, color: '#92400e' }}>Reason: {selectedTicket.pending_edit.reason}</span>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                    <button style={{ ...styles.btn, ...styles.btnSm, background: '#16a34a', color: '#fff', border: 'none' }} onClick={() => handleApproveReportEdit(selectedTicket)}>✅ Approve</button>
                    <button style={{ ...styles.btn, ...styles.btnSm, background: '#dc2626', color: '#fff', border: 'none' }} onClick={() => handleRejectReportEdit(selectedTicket)}>❌ Reject</button>
                    <button style={{ ...styles.btn, ...styles.btnSm, ...styles.btnOutline }} onClick={() => handleViewEditDiff(selectedTicket)}>🔍 View Changes</button>
                  </div>
                </div>
              )}

              {modalMode === 'view' && selectedTicket?.warranty_claim_pending && (
                <div style={{ background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, color: '#b45309', fontSize: 14 }}>🛡️ Warranty Claim — Awaiting Approval</div>
                  <div style={{ fontSize: 12, color: '#78716c', marginTop: 4 }}>{selectedTicket.warranty_claim_note || ''} &nbsp;|&nbsp; Submitted by: <b>{selectedTicket.warranty_claim_by || ''}</b></div>
                  {(currentUserRole === 'admin' || currentUserRole === 'work_controller' || cspMgr) ? (
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button style={{ ...styles.btn, ...styles.btnSm, background: '#16a34a', color: '#fff', border: 'none' }} onClick={() => handleApproveWarrantyClaim(selectedTicket)}>✅ Approve — Convert to Warranty</button>
                      <button style={{ ...styles.btn, ...styles.btnSm, background: '#dc2626', color: '#fff', border: 'none' }} onClick={() => handleRejectWarrantyClaim(selectedTicket)}>❌ Reject</button>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#d97706', marginTop: 6 }}>⏳ Waiting for WC/Admin approval.</div>
                  )}
                </div>
              )}

              {modalMode === 'view' && selectedTicket && selectedTicket.warranty_coverage === 'Out of Coverage' && (
                <div style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, fontWeight: 600 }}>
                  ⛔ OUT OF COVERAGE {selectedTicket.coverage_remark ? `— ${selectedTicket.coverage_remark}` : ''}
                </div>
              )}
              {modalMode === 'view' && selectedTicket && selectedTicket.warranty_coverage !== 'Out of Coverage' && (selectedTicket.call_type === 'Warranty' || selectedTicket.call_type === 'Warranty Repeat' || selectedTicket.call_type === 'AMC') && (
                <div style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, fontWeight: 600 }}>
                  ✅ Under Warranty Coverage
                </div>
              )}

              <div style={styles.sectionDivider}>
                <h3 style={styles.sectionHeader2}>👤 Customer</h3>
                <div style={styles.formGrid}>
                  <FormInput label="Name *" name="cname" value={formData.cname} onChange={handleFormChange} disabled={modalMode === 'view'} />
                  <FormInput label="Mobile *" name="mobile" value={formData.mobile} onChange={handleFormChange} disabled={modalMode === 'view'} />
                  <FormInput label="City *" name="city" value={formData.city} onChange={handleFormChange} disabled={modalMode === 'view'} />
                  <FormInput label="Alt Mobile" name="alt_mobile" value={formData.alt_mobile} onChange={handleFormChange} disabled={modalMode === 'view'} />
                  <FormInput label="State" name="state" value={formData.state} onChange={handleFormChange} disabled={modalMode === 'view'} />
                  <FormInput label="PIN" name="pin" value={formData.pin} onChange={handleFormChange} disabled={modalMode === 'view'} />
                  <FormInput label="Area" name="area" value={formData.area} onChange={handleFormChange} disabled={modalMode === 'view'} />
                  <FormInput label="Address" name="address" value={formData.address} onChange={handleFormChange} disabled={modalMode === 'view'} />
                </div>
                {modalMode === 'view' && formData.mobile && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
                    <a href={`tel:${formData.mobile}`} style={{ fontSize: 12, color: colors.primary, fontWeight: 600, textDecoration: 'none' }}>📞 Call {formData.mobile}</a>
                    <a href={`https://wa.me/91${formData.mobile.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#25D366', fontWeight: 600, textDecoration: 'none' }}>💬 WhatsApp</a>
                    {formData.alt_mobile && (
                      <>
                        <a href={`tel:${formData.alt_mobile}`} style={{ fontSize: 12, color: colors.primary, fontWeight: 600, textDecoration: 'none' }}>📞 Alt {formData.alt_mobile}</a>
                        <a href={`https://wa.me/91${formData.alt_mobile.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#25D366', fontWeight: 600, textDecoration: 'none' }}>💬 WhatsApp</a>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div style={styles.sectionDivider}>
                <h3 style={styles.sectionHeader2}>🏭 Product</h3>
                <div style={styles.formGrid}>
                  <FormInput label="Brand" name="brand_name" value={formData.brand_name} onChange={handleFormChange} disabled={modalMode === 'view'} />
                  <FormInput label="Model" name="model" value={formData.model} onChange={handleFormChange} disabled={modalMode === 'view'} />
                  <FormInput label="Serial *" name="serial" value={formData.serial} onChange={handleFormChange} disabled={modalMode === 'view'} />
                </div>
              </div>

              <div style={styles.sectionDivider}>
                <h3 style={styles.sectionHeader2}>🔧 Problem</h3>
                <div style={styles.formGrid}>
                  <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                    <label style={styles.formLabel}>Problem *</label>
                    <textarea name="problem" value={formData.problem} onChange={handleFormChange} rows={2} disabled={modalMode === 'view'} style={{ ...styles.formInput, fontFamily: 'inherit', width: '100%', opacity: modalMode === 'view' ? 0.6 : 1 }} />
                  </div>
                  <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                    <label style={styles.formLabel}>Description</label>
                    <textarea name="description" value={formData.description} onChange={handleFormChange} rows={2} disabled={modalMode === 'view'} style={{ ...styles.formInput, fontFamily: 'inherit', width: '100%', opacity: modalMode === 'view' ? 0.6 : 1 }} />
                  </div>
                  {modalMode === 'view' && selectedTicket?.work_done && (
                    <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                      <label style={styles.formLabel}>Action Taken</label>
                      <div style={{ fontSize: 13, color: colors.text, background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>{selectedTicket.work_done}</div>
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.sectionDivider}>
                <h3 style={styles.sectionHeader2}>🔧 Service</h3>
                <div style={styles.formGrid}>
                  <FormSelect label="Call Type" name="call_type" value={formData.call_type} onChange={handleFormChange} options={['Warranty', 'Non-Warranty', 'AMC']} disabled={modalMode === 'view'} />
                  <FormSelect label="Status" name="status" value={formData.status} onChange={handleFormChange} options={allowedStatusOptions} disabled={false} />
                  <FormInput label="SE Call ID" name="se_call_id" value={formData.se_call_id} onChange={handleFormChange} disabled={modalMode === 'view'} />
                  {modalMode === 'add' && (
                    <div style={{ ...styles.formGroup, gridColumn: '1 / -1', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: 12 }}>
                      <label style={{ ...styles.formLabel, color: '#166534' }}>📅 Canon Portal — Call Received Date &amp; Time (optional)</label>
                      <input
                        type="datetime-local"
                        onChange={(e) => {
                          const v = e.target.value;
                          if (!v) { handleFormChange({ target: { name: 'tat_date', value: '' } } as any); setTatPreview(''); return; }
                          const d = new Date(v);
                          d.setTime(d.getTime() + 24 * 3600000);
                          handleFormChange({ target: { name: 'tat_date', value: d.toISOString() } } as any);
                          setTatPreview(`⏱ TAT Deadline: ${d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })} (Canon received + 24h)`);
                        }}
                        style={{ border: '1px solid #86efac', borderRadius: 8, padding: '7px 12px', fontSize: 13, width: '100%', boxSizing: 'border-box' }}
                      />
                      {tatPreview && <div style={{ fontSize: 11, color: '#166534', marginTop: 5, fontWeight: 600 }}>{tatPreview}</div>}
                    </div>
                  )}
                  {(currentUserRole === 'admin' || currentUserRole === 'work_controller') && (
                    <div style={{ ...styles.formGroup }}>
                      <label style={styles.formLabel}>
                        Assign to Engineer
                        {engineersLoading && ' (loading...)'}
                      </label>
                      {engineersError ? (
                        <div style={{ color: '#dc2626', fontSize: '12px', marginBottom: '8px' }}>
                          ❌ {engineersError}
                          <button
                            type="button"
                            onClick={refetchEngineers}
                            style={{
                              marginLeft: '8px',
                              padding: '4px 8px',
                              fontSize: '11px',
                              background: '#dc2626',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            Retry
                          </button>
                        </div>
                      ) : null}
                      <FormSelectWithData
                        label=""
                        name="assigned_to"
                        value={formData.assigned_to || ''}
                        onChange={(e: any) => handleEngineerChange(e.target.value)}
                        options={engineers}
                        optionLabelKey="name"
                        optionValueKey="user_id"
                        disabled={engineersLoading || engineersError !== null}
                      />
                    </div>
                  )}
                </div>
              </div>
              {selectedTicket?.status === 'Sent to MSC' && (currentUserRole === 'admin' || currentUserRole === 'work_controller' || cspMgr) && (
                <div style={styles.sectionDivider}>
                  <h3 style={styles.sectionHeader2}>📦 MSC Dispatch</h3>
                  <MSCDispatchPanel
                    ticketId={selectedTicket.id}
                    readOnly={false}
                    byUser={(session?.user as any)?.name || currentUserRole || ''}
                    onUpdated={async () => { setModalOpen(false); await fetchTickets(); }}
                  />
                </div>
              )}

              {modalMode === 'view' && selectedTicket && (selectedTicket.spares && selectedTicket.spares.length > 0) && (
                <div style={styles.sectionDivider}>
                  <h3 style={styles.sectionHeader2}>🔩 Parts</h3>
                  {selectedTicket.spares.map((s, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '1px solid #f3f4f6' }}>
                      <span>{s.code ? `${s.code} ` : ''}{s.name} × {s.qty}{s.requested ? ' (requested)' : ''}</span>
                      <span style={{ fontWeight: 600 }}>{isCustReject ? '—' : `₹${((s.qty || 0) * (s.price || 0)).toFixed(0)}`}</span>
                    </div>
                  ))}
                </div>
              )}

              {modalMode === 'view' && selectedTicket && (
                <div style={styles.sectionDivider}>
                  <h3 style={styles.sectionHeader2}>💰 Charges</h3>
                  <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Service / Labour</span><span>₹{ticketLaborCharge.toFixed(0)}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Parts{isCustReject ? ' (not billed — rejected)' : ''}</span><span>₹{fittedPartsTotal.toFixed(0)}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14, borderTop: '1px solid #e5e7eb', paddingTop: 6, marginTop: 2 }}><span>Total</span><span>₹{ticketGrandTotal.toFixed(0)}</span></div>
                  </div>
                </div>
              )}

              <div style={styles.sectionDivider}>
                <h3 style={styles.sectionHeader2}>📝 Remarks</h3>
                <textarea name="remarks" value={formData.remarks} onChange={handleFormChange} rows={3} disabled={modalMode === 'view'} style={{ ...styles.formInput, fontFamily: 'inherit', width: '100%', opacity: modalMode === 'view' ? 0.6 : 1 }} />
              </div>

              {modalMode === 'view' && selectedTicket && selectedTicket.timeline && selectedTicket.timeline.length > 0 && (
                <div style={styles.sectionDivider}>
                  <h3 style={styles.sectionHeader2}>🕘 Timeline</h3>
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                    {selectedTicket.timeline.slice().reverse().map((tl: any, i: number) => (
                      <div key={i} style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{tl.action || 'Update'}</div>
                        <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>By: {tl.by || 'System'} | {tl.at ? new Date(tl.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</div>
                        {tl.note && <div style={{ fontSize: 12, marginTop: 4, padding: '5px 8px', background: '#fff', borderRadius: 6 }}>{tl.note}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {modalMode === 'view' && selectedTicket && (
                <div style={styles.sectionDivider}>
                  <h3 style={styles.sectionHeader2}>✍️ Signature</h3>
                  {selectedTicket.customer_signature ? (
                    <img src={selectedTicket.customer_signature} alt="Signature" style={{ maxHeight: 60, border: '1px solid #e5e7eb', borderRadius: 8 }} />
                  ) : selectedTicket.status === 'Closed' && currentUserRole === 'engineer' ? (
                    <button style={{ ...styles.btn, ...styles.btnOutline, ...styles.btnSm }} onClick={() => setSigTicket(selectedTicket)}>
                      ✍️ Get Customer Signature
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>No signature captured</span>
                  )}
                </div>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button style={{ ...styles.btn, ...styles.btnOutline }} onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.btnOutlineHover)} onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.btnOutline)} onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              {modalMode === 'view' ? (
                <>
                  {canApproveEstimate && (
                    <button style={{ ...styles.btn, background: '#16a34a', color: 'white' }} onClick={() => openEstimateModal(selectedTicket!)}>
                      ✅ Approve / Reject Estimate
                    </button>
                  )}
                  {selectedTicket?.status !== 'Closed' && canEditTicket(selectedTicket!) && (
                    <button
                      style={{ ...styles.btn, background: '#dc2626', color: 'white' }}
                      onMouseEnter={(e) => Object.assign(e.currentTarget.style, { ...styles.btn, background: '#b91c1c', color: 'white' })}
                      onMouseLeave={(e) => Object.assign(e.currentTarget.style, { ...styles.btn, background: '#dc2626', color: 'white' })}
                      onClick={handleCloseTicket}
                    >
                      🔒 Close Ticket
                    </button>
                  )}
                  {selectedTicket?.status !== 'Closed' && (currentUserRole === 'admin' || cspMgr) && (
                    <button style={{ ...styles.btn, background: '#374151', color: 'white' }} onClick={() => setBackdateTicket(selectedTicket)}>
                      📅 Back-Date Close
                    </button>
                  )}
                  {selectedTicket?.wc_type === 'CSP' && !['Closed', 'Customer Reject', 'Call Cancel'].includes(selectedTicket?.status || '') && (
                    <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={() => setTatTicket(selectedTicket)}>
                      ⏱ Set TAT
                    </button>
                  )}
                  {isInvoiceable(selectedTicket!) && (
                    <button style={{ ...styles.btn, background: '#7c3aed', color: 'white' }} onClick={() => generateInvoice(selectedTicket!)}>
                      🧾 Invoice
                    </button>
                  )}
                  {isInvoiceable(selectedTicket!) && canSeeInvoiceStatus && (
                    selectedTicket!.invoice_done ? (
                      // Already invoiced — everyone with visibility may correct the number.
                      <button style={{ ...styles.btn, background: '#6b7280', color: 'white' }} onClick={() => setInvoiceModalTicket(selectedTicket)}>
                        ✏️ Edit Invoice #{selectedTicket!.invoice_no}
                      </button>
                    ) : canMarkInvoice ? (
                      <button style={{ ...styles.btn, background: '#f59e0b', color: 'white' }} onClick={() => setInvoiceModalTicket(selectedTicket)}>
                        🧾 Add Invoice No.
                      </button>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fef3c7', border: '1.5px solid #f59e0b', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600, color: '#92400e' }}>
                        ⚠️ Invoice Pending
                      </span>
                    )
                  )}
                  {selectedTicket?.status !== 'Closed' && currentUserRole === 'work_controller' && !selectedTicket?.pending_edit && (
                    <button style={{ ...styles.btn, background: '#0ea5e9', color: 'white' }} onClick={() => setReportEditTicket(selectedTicket)}>
                      ✏️ Edit Report
                    </button>
                  )}
                  {(currentUserRole === 'admin' || currentUserRole === 'work_controller' || cspMgr) && selectedTicket?.warranty_coverage !== 'Out of Coverage' && (
                    <button style={{ ...styles.btn, background: '#f59e0b', color: 'white' }} onClick={() => setVoidWarrantyTicket(selectedTicket)}>🚫 Void Warranty</button>
                  )}
                  <button style={{ ...styles.btn, ...styles.btnPrimary }} onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.btnPrimaryHover)} onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.btnPrimary)} onClick={handleSaveRemarks}>
                    💾 Save Changes
                  </button>
                </>
              ) : (
                <button style={{ ...styles.btn, ...styles.btnPrimary }} onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.btnPrimaryHover)} onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.btnPrimary)} onClick={handleAddTicket}>
                  💾 Save
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {callPhotosTicket && (
        <Modal isOpen onClose={() => setCallPhotosTicket(null)} title={`📷 Call Photos — ${callPhotosTicket.id}${callPhotosTicket.cname ? ' — ' + callPhotosTicket.cname : ''}`}>
          {(() => {
            const t: any = callPhotosTicket;
            let extras = t.attachments;
            if (typeof extras === 'string') { try { extras = JSON.parse(extras); } catch { extras = []; } }
            if (!Array.isArray(extras)) extras = [];
            const jsPhotos: string[] = [t.jobsheet_photo, ...extras].filter(Boolean);
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>📄 Job Sheet Photo</h3>
                  {jsPhotos.length === 0 ? (
                    <div style={{ color: '#b45309', fontSize: 13 }}>No job sheet photo attached yet</div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                      {jsPhotos.map((u, i) => (
                        <a key={i} href={u} target="_blank" rel="noreferrer">
                          <img src={u} style={{ maxWidth: 150, maxHeight: 150, borderRadius: 10, border: '1px solid #e2e8f0' }} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb' }} />
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>🛣️ KM / Odometer Photos</h3>
                  {callPhotosLoading ? (
                    <div style={{ color: colors.textMuted, fontSize: 13 }}>Loading...</div>
                  ) : callPhotosKm.length === 0 ? (
                    <div style={{ color: colors.textMuted, fontSize: 13 }}>No KM photos for this call</div>
                  ) : callPhotosKm.map((l: any) => {
                    const typeLabel: Record<string, string> = { opening: '🏢 Opening', arrival: '📍 Arrival at Customer', closing: '🏁 Closing' };
                    const tm = l.captured_at ? new Date(l.captured_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
                    return (
                      <div key={l.id} style={{ display: 'flex', gap: 10, alignItems: 'center', border: `1px solid ${colors.border}`, borderRadius: 10, padding: 8, marginBottom: 8 }}>
                        {l.photo_url ? (
                          <a href={l.photo_url} target="_blank" rel="noreferrer"><img src={l.photo_url} style={{ width: 70, height: 52, objectFit: 'cover', borderRadius: 8 }} /></a>
                        ) : (
                          <div style={{ width: 70, height: 52, background: '#f1f5f9', borderRadius: 8 }} />
                        )}
                        <div style={{ flex: 1, fontSize: 12 }}>
                          <b>{typeLabel[l.entry_type] || l.entry_type}</b><br />
                          🕐 {tm} &nbsp; 🛣️ {l.odometer_km != null ? `${l.odometer_km} km` : '—'}
                          {l.lat && l.lng && <> &nbsp; <a href={`https://maps.google.com/?q=${l.lat},${l.lng}`} target="_blank" rel="noreferrer">📍 Map</a></>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
      {invoiceModalTicket && (
        <InvoiceModal
          ticket={invoiceModalTicket}
          updatedBy={(session?.user as any)?.name || currentUserRole || ''}
          onClose={() => setInvoiceModalTicket(null)}
          onDone={async () => {
            setInvoiceModalTicket(null);
            await fetchTickets();
          }}
        />
      )}
      {voidWarrantyTicket && (
        <VoidWarrantyModal
          ticket={voidWarrantyTicket}
          byUser={(session?.user as any)?.name || currentUserRole || ''}
          onClose={() => setVoidWarrantyTicket(null)}
          onDone={async () => { setVoidWarrantyTicket(null); setModalOpen(false); await fetchTickets(); }}
        />
      )}
      {reportEditTicket && (
        <ReportEditRequestModal
          ticket={reportEditTicket}
          requestedBy={(session?.user as any)?.name || currentUserRole || ''}
          wcId={currentUserId || ''}
          onClose={() => setReportEditTicket(null)}
          onSubmitted={fetchTickets}
        />
      )}
      {backdateTicket && (
        <BackdateCloseModal
          ticket={backdateTicket}
          engineers={engineers}
          byUser={(session?.user as any)?.name || currentUserRole || ''}
          onClose={() => setBackdateTicket(null)}
          onDone={async () => {
            setBackdateTicket(null);
            setModalOpen(false);
            await fetchTickets();
          }}
        />
      )}
      {tatTicket && (
        <SetTATModal
          ticket={tatTicket}
          byUser={(session?.user as any)?.name || currentUserRole || ''}
          onClose={() => setTatTicket(null)}
          onDone={async () => { setTatTicket(null); await fetchTickets(); }}
        />
      )}
      {sigTicket && (
        <SignatureModal
          ticketId={sigTicket.id}
          isCarryIn={sigTicket.service_type === 'Carry In'}
          byUser={(session?.user as any)?.name || currentUserRole || ''}
          onClose={() => setSigTicket(null)}
          onDone={async () => { setSigTicket(null); await fetchTickets(); }}
        />
      )}
      {estimateTicket && (
        <div style={styles.modalOverlay} onClick={() => setEstimateTicket(null)}>
          <div style={{ ...styles.modal, maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Estimate — {estimateTicket.cname}</h2>
              <button style={styles.closeBtn} onClick={() => setEstimateTicket(null)}>✕</button>
            </div>
            <div style={styles.modalBody}>
              <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, fontSize: 13, marginBottom: 12 }}>
                <div><strong>{estimateTicket.brand_name} {estimateTicket.model}</strong> | {estimateTicket.serial}</div>
                <div style={{ color: colors.textMuted, marginTop: 2 }}>{estimateTicket.problem} | {estimateTicket.call_type}</div>
              </div>

              {(estimateTicket.spares || []).filter((s) => s.requested).length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Parts Required:</div>
                  {(estimateTicket.spares || []).map((s, i) => s.requested && (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid #f3f4f6' }}>
                      <span>{s.code ? `${s.code} ` : ''}{s.name} × {s.qty}</span>
                      <span style={{ fontWeight: 600 }}>₹{((s.qty || 0) * (s.price || 0)).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={styles.formLabel}>Labour / Service ₹</label>
                  <input type="number" value={estimateForm.labourAmt} onChange={(e) => setEstimateForm((f) => ({ ...f, labourAmt: e.target.value }))} style={styles.formInput} />
                </div>
                <div>
                  <label style={styles.formLabel}>Parts Discount %</label>
                  <input type="number" value={estimateForm.partsDisc} onChange={(e) => setEstimateForm((f) => ({ ...f, partsDisc: e.target.value }))} min="0" max="100" style={styles.formInput} />
                </div>
                <div>
                  <label style={styles.formLabel}>Labour Discount %</label>
                  <input type="number" value={estimateForm.labourDisc} onChange={(e) => setEstimateForm((f) => ({ ...f, labourDisc: e.target.value }))} min="0" max="100" style={styles.formInput} />
                </div>
              </div>

              <div style={{ background: '#d1fae5', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>Parts (after {estimateForm.partsDisc}% disc)</span><span>₹{estPartsAfterDisc.toFixed(0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 4 }}>
                  <span>Labour (after {estimateForm.labourDisc}% disc)</span><span>₹{estLabourAfterDisc.toFixed(0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15, marginTop: 8, borderTop: '1px solid #a7f3d0', paddingTop: 8 }}>
                  <span>Final Estimate</span><span style={{ color: '#065f46' }}>₹{estimateFinal.toFixed(0)}</span>
                </div>
                {estimateSaved > 0 && <div style={{ fontSize: 11, color: '#065f46', marginTop: 4 }}>Customer saves: ₹{estimateSaved.toFixed(0)}</div>}
              </div>

              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#991b1b', display: 'block', marginBottom: 4 }}>Inspection / Visit Charges ₹ <span style={{ fontWeight: 400 }}>(billed if customer rejects)</span></label>
                <input type="number" value={inspCharges} onChange={(e) => setInspCharges(e.target.value)} style={styles.formInput} />
              </div>

              <div>
                <label style={styles.formLabel}>Remark * <span style={{ color: '#dc2626' }}>(required)</span></label>
                <textarea value={estimateForm.remark} onChange={(e) => setEstimateForm((f) => ({ ...f, remark: e.target.value }))} rows={2} placeholder="Note about approval/rejection..." style={{ ...styles.formInput, fontFamily: 'inherit', width: '100%', resize: 'vertical' as const }} />
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={() => setEstimateTicket(null)}>Cancel</button>
              <button style={{ ...styles.btn, background: '#dc2626', color: '#fff' }} disabled={estimateSaving} onClick={handleRejectEstimate}>❌ Customer Reject</button>
              <button style={{ ...styles.btn, background: '#059669', color: '#fff' }} disabled={estimateSaving} onClick={handleApproveEstimate}>✅ Customer Approved</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormInput({ label, name, value, onChange, disabled }: any) {
  return (
    <div style={{ ...styles.formGroup }}>
      <label style={styles.formLabel}>{label}</label>
      <input type="text" name={name} value={value || ''} onChange={onChange} disabled={disabled} style={{ ...styles.formInput, opacity: disabled ? 0.6 : 1 }} />
    </div>
  );
}

function FormSelect({ label, name, value, onChange, options, disabled }: any) {
  return (
    <div style={{ ...styles.formGroup }}>
      <label style={styles.formLabel}>{label}</label>
      <select name={name} value={value || ''} onChange={onChange} disabled={disabled} style={{ ...styles.formInput, opacity: disabled ? 0.6 : 1 }}>
        <option value="">-- Select --</option>
        {options.map((o: string) => (<option key={o} value={o}>{o}</option>))}
      </select>
    </div>
  );
}

function FormSelectWithData({ label, name, value, onChange, options, optionLabelKey, optionValueKey, disabled }: any) {
  return (
    <div style={{ ...styles.formGroup }}>
      <label style={styles.formLabel}>{label}</label>
      <select name={name} value={value || ''} onChange={onChange} disabled={disabled} style={{ ...styles.formInput, opacity: disabled ? 0.6 : 1 }}>
        <option value="">-- Select Engineer --</option>
        {options.map((o: any) => (<option key={o[optionValueKey]} value={o[optionValueKey]}>{o[optionLabelKey]}</option>))}
      </select>
    </div>
  );
}