'use client';

import { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Ticket, statusBadges, callTypeBadges, statusOptions } from '@/types/tickets';
import { colors, styles } from '@/styles/ticketsStyles';
import { useTickets } from '@/hooks/useTickets';
import { useTicketForm } from '@/hooks/useTicketForm';
import { useEngineers } from '@/hooks/useEngineers';
import { createTicket, updateTicket, updateTicketRemarks, closeTicket } from '@/services/ticketService';
import { printTicket, getBadgeStyle } from '@/utils/printTicket';

export default function TicketsScreen() {
  const { data: session } = useSession();
  const currentUserRole = (session?.user as any)?.roleType;
  const currentUserId = (session?.user as any)?.id;

  const { tickets, loading, fetchTickets } = useTickets({
    userRole: currentUserRole,
    userId: currentUserId,
  });
  const { engineers, loading: engineersLoading, error: engineersError, loadEngineers: refetchEngineers } = useEngineers()
  const { formData, handleFormChange, setFormValues, resetForm } = useTicketForm();

  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Check if current user can edit this ticket
  const canEditTicket = (ticket: Ticket) => {
    if (currentUserRole === 'admin' || currentUserRole === 'work_controller') {
      return true;
    }
    if (currentUserRole === 'engineer') {
      return ticket.assigned_to === currentUserId;
    }
    return false;
  };

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
      return matchesStatus && matchesSearch;
    });
  }, [tickets, filterStatus, searchTerm]);

  const screenTitle = currentUserRole === 'engineer' ? '🎫 My Tickets' : '🎫 All Tickets';

  return (
    <div style={{ padding: '20px' }}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>{screenTitle}</h2>
        {currentUserRole !== 'engineer' && (
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
                  <FormSelect label="Status" name="status" value={formData.status} onChange={handleFormChange} options={statusOptions} disabled={modalMode === 'view'} />
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
