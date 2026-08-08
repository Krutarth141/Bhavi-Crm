'use client';

import { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Ticket, statusBadges, callTypeBadges, statusOptions } from '@/types/tickets';
import { getAllowedStatuses, validateStatusChangeReason } from '@/types/ticketStatus';
import { colors, styles } from '@/styles/ticketsStyles';
import { useTickets } from '@/hooks/useTickets';
import { useTicketForm } from '@/hooks/useTicketForm';
import { useEngineers } from '@/hooks/useEngineers';
import { createTicket, updateTicket, updateTicketRemarks, closeTicket } from '@/services/ticketService';
import { printTicket, getBadgeStyle } from '@/utils/printTicket';
import { generateInvoice } from '@/utils/printInvoice';
import InvoiceModal from '@/components/screens/tickets/InvoiceModal';
import { approveWarrantyClaim, rejectWarrantyClaim } from '@/services/warrantyClaimService';
import VoidWarrantyModal from '@/components/screens/tickets/VoidWarrantyModal';
import { buildFeedbackWhatsAppLink } from '@/services/feedbackService';
import { fetchCompanyInfo } from '@/services/settingsService';
import ReportEditRequestModal from '@/components/screens/tickets/ReportEditRequestModal';
import { approveReportEdit, rejectReportEdit } from '@/services/ticketService';
import { isCspManager } from '@/lib/permissions';

export default function TicketsScreen() {
  const { data: session } = useSession();
  const currentUserRole = (session?.user as any)?.roleType;
  const currentUserId = (session?.user as any)?.id;
  const cspMgr = isCspManager(session);

  const { tickets, loading, fetchTickets } = useTickets({
    userRole: cspMgr ? undefined : currentUserRole,
    userId: currentUserId,
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

  const isInvoiceable = (t: Ticket) => (t.call_type === 'Non-Warranty' || t.call_type === 'Non-Warranty Repeat') && t.status === 'Closed';
  const canMarkInvoice = currentUserRole === 'admin' || currentUserRole === 'work_controller' || cspMgr;

  const allowedStatusOptions = useMemo(() => {
    if (modalMode !== 'edit' || !selectedTicket) return statusOptions;
    const next = getAllowedStatuses(selectedTicket.status, currentUserRole, formData.service_type, formData.call_type, formData.warranty_coverage);
    return Array.from(new Set([selectedTicket.status, ...next]));
  }, [modalMode, selectedTicket, currentUserRole, formData.service_type, formData.call_type, formData.warranty_coverage]);

  // Handle engineer assignment - update both ID and name
  const handleEngineerChange = (engineerId: string) => {
    const selectedEngineer = engineers.find((e) => e.id === engineerId);
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
      const engineer = engineers.find((e) => e.id === data.assigned_to);
      if (engineer) {
        data.assigned_name = engineer.name;
      }
    }

    return data;
  };

  const handleSendFeedbackRequest = async (t: Ticket) => {
    const ci = await fetchCompanyInfo();
    const link = buildFeedbackWhatsAppLink({
      ticketId: t.id, customerName: t.cname, mobile: t.mobile, engineerName: t.assigned_name,
      companyName: ci?.company_name, companyPhone: ci?.phone,
    });
    window.open(link, '_blank');
  };

  const handleAddClick = () => {
    setModalMode('add');
    setSelectedTicket(null);
    resetForm();
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

    try {
      const result = await updateTicketRemarks(selectedTicket.id, formData.remarks);
      if (result.success) {
        alert('✅ Remarks saved!');
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
      const result = await closeTicket(selectedTicket.id, formData.remarks);
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

    // Only admins and work controllers can assign tickets
    if (currentUserRole === 'engineer') {
      alert('❌ Engineers cannot create tickets');
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
        const ticketData = getFormDataWithEngineerName();
        console.log('Creating ticket with data:', { assigned_to: ticketData.assigned_to, assigned_name: ticketData.assigned_name, status: ticketData.status });
        const result = await createTicket(ticketData);
        if (!result.success) throw new Error(result.error);
        alert('✅ Created! ID: ' + result.id);
      }
      setModalOpen(false);
      resetForm();
      await fetchTickets();
    } catch (err) {
      alert('❌ Error');
    }
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
      const matchesSearch = ticket.cname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.mobile.includes(searchTerm) ||
        ticket.serial.includes(searchTerm) ||
        ticket.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesInvoice = invoiceFilter === 'all'
        || (invoiceFilter === 'pending' && isInvoiceable(ticket) && !ticket.invoice_done)
        || (invoiceFilter === 'done' && isInvoiceable(ticket) && ticket.invoice_done);
      return matchesStatus && matchesSearch && matchesInvoice;
    });
  }, [tickets, filterStatus, searchTerm, invoiceFilter]);

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

  const screenTitle = currentUserRole === 'engineer' && !cspMgr ? '🎫 My Tickets' : '🎫 All Tickets';

  return (
    <div style={{ padding: '20px' }}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>{screenTitle}</h2>
        {(currentUserRole !== 'engineer' || cspMgr) && (
          <button style={{ ...styles.btn, ...styles.btnPrimary }} onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.btnPrimaryHover)} onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.btnPrimary)} onClick={handleAddClick}>
            ➕ New Call
          </button>
        )}
      </div>

      <div style={styles.filterBar}>
        <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ ...styles.filterInput, flex: 1 }} />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={styles.filterSelect}>
          <option value="all">All</option>
          {statusOptions.map((s) => (<option key={s} value={s}>{s}</option>))}
        </select>
        <select value={invoiceFilter} onChange={(e) => setInvoiceFilter(e.target.value as any)} style={styles.filterSelect}>
          <option value="all">All Invoice</option>
          <option value="pending">🧾 Invoice Pending</option>
          <option value="done">✅ Invoice Done</option>
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
              {filteredTickets.map((t) => (
                <tr key={t.id} style={styles.tableRow} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.card)}>
                  <td style={styles.tableCell}><strong>{t.id}</strong></td>
                  <td style={{ ...styles.tableCell, fontSize: '12px' }}>{new Date(t.created_at).toLocaleDateString()}</td>
                  <td style={styles.tableCell}><strong>{t.cname}</strong></td>
                  <td style={{ ...styles.tableCell, color: colors.primary, fontWeight: 600 }}>{t.mobile}</td>
                  <td style={styles.tableCell}>{t.brand_name} / {t.model}</td>
                  <td style={{ ...styles.tableCell, fontSize: '12px' }}>{t.serial}</td>
                  <td style={styles.tableCell}><span style={{ ...styles.badge, ...getBadgeStyle(callTypeBadges[t.call_type] || 'badge-open') }}>{t.call_type}</span></td>
                  <td style={styles.tableCell}>{t.service_type}</td>
                  <td style={{ ...styles.tableCell, fontSize: '12px' }}>{t.problem}</td>
                  <td style={styles.tableCell}><span style={{ ...styles.badge, ...getBadgeStyle(statusBadges[t.status] || 'badge-open') }}>{t.status}</span></td>
                  <td style={styles.tableCell}>
                    {isInvoiceable(t) && (
                      t.invoice_done
                        ? <span style={{ ...styles.badge, backgroundColor: '#dcfce7', color: '#15803d' }}>✅ Inv</span>
                        : <span style={{ ...styles.badge, backgroundColor: '#fef3c7', color: '#92400e' }}>🧾 Pending</span>
                    )}
                  </td>
                  <td style={{ ...styles.tableCell, fontSize: '12px' }}>{t.assigned_name || '—'}</td>
                  <td style={styles.tableCell}>
                    <button style={{ ...styles.btn, ...styles.btnSm, ...styles.btnPrimary }} onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.btnPrimaryHover)} onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.btnPrimary)} onClick={() => handleViewTicket(t)}>
                      👁 View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div style={styles.modalOverlay} onClick={() => setModalOpen(false)}>
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
                <button style={styles.closeBtn} onClick={() => setModalOpen(false)}>✕</button>
              </div>
            </div>

            <div style={styles.modalBody}>
              {modalMode === 'view' && selectedTicket?.pending_edit && (
                <div style={{ background: '#fef3c7', border: '1.5px solid #fbbf24', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
                  ⏳ <b>Edit Pending Approval</b> — Requested by <b>{selectedTicket.pending_edit.requested_by}</b><br />
                  <span style={{ fontSize: 12, color: '#92400e' }}>Reason: {selectedTicket.pending_edit.reason}</span>
                  {(currentUserRole === 'admin' || cspMgr) && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                      <button style={{ ...styles.btn, ...styles.btnSm, background: '#16a34a', color: '#fff', border: 'none' }} onClick={() => handleApproveReportEdit(selectedTicket)}>✅ Approve</button>
                      <button style={{ ...styles.btn, ...styles.btnSm, background: '#dc2626', color: '#fff', border: 'none' }} onClick={() => handleRejectReportEdit(selectedTicket)}>❌ Reject</button>
                      <button style={{ ...styles.btn, ...styles.btnSm, ...styles.btnOutline }} onClick={() => handleViewEditDiff(selectedTicket)}>🔍 View Changes</button>
                    </div>
                  )}
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
                </div>
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
                <h3 style={styles.sectionHeader2}>🔧 Service</h3>
                <div style={styles.formGrid}>
                  <FormSelect label="Call Type" name="call_type" value={formData.call_type} onChange={handleFormChange} options={['Warranty', 'Non-Warranty', 'AMC']} disabled={modalMode === 'view'} />
                  <FormSelect label="Status" name="status" value={formData.status} onChange={handleFormChange} options={allowedStatusOptions} disabled={modalMode === 'view'} />
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
                        optionValueKey="id"
                        disabled={modalMode === 'view' || engineersLoading || engineersError !== null}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.sectionDivider}>
                <h3 style={styles.sectionHeader2}>📝 Remarks</h3>
                <textarea name="remarks" value={formData.remarks} onChange={handleFormChange} rows={3} disabled={modalMode === 'view'} style={{ ...styles.formInput, fontFamily: 'inherit', width: '100%', opacity: modalMode === 'view' ? 0.6 : 1 }} />
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button style={{ ...styles.btn, ...styles.btnOutline }} onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.btnOutlineHover)} onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.btnOutline)} onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              {modalMode === 'view' ? (
                <>
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
                  {isInvoiceable(selectedTicket!) && (
                    <button style={{ ...styles.btn, background: '#7c3aed', color: 'white' }} onClick={() => generateInvoice(selectedTicket!)}>
                      🧾 Invoice
                    </button>
                  )}
                  {isInvoiceable(selectedTicket!) && canMarkInvoice && (
                    <button style={{ ...styles.btn, background: selectedTicket!.invoice_done ? '#6b7280' : '#f59e0b', color: 'white' }} onClick={() => setInvoiceModalTicket(selectedTicket)}>
                      {selectedTicket!.invoice_done ? `✏️ Edit Invoice #${selectedTicket!.invoice_no}` : '🧾 Add Invoice No.'}
                    </button>
                  )}
                  {selectedTicket?.status === 'Closed' && (
                    <button style={{ ...styles.btn, background: '#f59e0b', color: 'white' }} onClick={() => handleSendFeedbackRequest(selectedTicket!)}>
                      ⭐ Feedback
                    </button>
                  )}
                  {selectedTicket?.status !== 'Closed' && currentUserRole === 'work_controller' && !selectedTicket?.pending_edit && (
                    <button style={{ ...styles.btn, background: '#0ea5e9', color: 'white' }} onClick={() => setReportEditTicket(selectedTicket)}>
                      ✏️ Edit Report
                    </button>
                  )}
                  {selectedTicket?.warranty_claim_pending && (currentUserRole === 'admin' || currentUserRole === 'work_controller') && (
                    <>
                      <button style={{ ...styles.btn, background: '#16a34a', color: 'white' }} onClick={() => handleApproveWarrantyClaim(selectedTicket!)}>✅ Approve Claim</button>
                      <button style={{ ...styles.btn, background: '#dc2626', color: 'white' }} onClick={() => handleRejectWarrantyClaim(selectedTicket!)}>❌ Reject Claim</button>
                    </>
                  )}
                  {(currentUserRole === 'admin' || currentUserRole === 'work_controller') && selectedTicket?.warranty_coverage !== 'Out of Coverage' && (
                    <button style={{ ...styles.btn, background: '#f59e0b', color: 'white' }} onClick={() => setVoidWarrantyTicket(selectedTicket)}>🚫 Void Warranty</button>
                  )}
                  <button style={{ ...styles.btn, ...styles.btnPrimary }} onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.btnPrimaryHover)} onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.btnPrimary)} onClick={handleSaveRemarks}>
                    💾 Save Remarks
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
