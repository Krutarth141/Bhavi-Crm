import { Ticket, statusBadges, callTypeBadges } from '@/types/tickets';

export const getBadgeStyle = (badgeClass: string): Record<string, any> => {
    const badgeStyles: Record<string, Record<string, any>> = {
        'badge-pending': { backgroundColor: '#ffe4e6', color: '#be123c' },
        'badge-open': { backgroundColor: '#dbeafe', color: '#1a56db' },
        'badge-progress': { backgroundColor: '#fef3c7', color: '#d97706' },
        'badge-closed': { backgroundColor: '#d1fae5', color: '#065f46' },
        'badge-hold': { backgroundColor: '#f3e8ff', color: '#7c3aed' },
        'badge-cancel': { backgroundColor: '#f1f5f9', color: '#475569' },
        'badge-reject': { backgroundColor: '#fef2f2', color: '#dc2626' },
        'badge-approve': { backgroundColor: '#d1fae5', color: '#065f46' },
        'badge-warranty': { backgroundColor: '#e0e7ff', color: '#4338ca' },
    };
    return badgeStyles[badgeClass] || badgeStyles['badge-open'];
};

export const printTicket = (ticket: Ticket): void => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const statusBadge = statusBadges[ticket.status] || 'badge-open';
    const callTypeBadge = callTypeBadges[ticket.call_type] || 'badge-open';
    const statusStyle = getBadgeStyle(statusBadge);
    const callTypeStyle = getBadgeStyle(callTypeBadge);

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Job Sheet - ${ticket.id}</title>
      <style>
        @page { size: A4; margin: 10mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a202c; line-height: 1.6; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 3px solid #1a56db; padding-bottom: 12px; }
        .company { font-size: 18px; font-weight: 900; color: #1a56db; }
        .tagline { font-size: 10px; color: #64748b; }
        .ticket-id { font-size: 14px; font-weight: 700; }
        .date { font-size: 12px; color: #64748b; }
        .section { margin-bottom: 16px; }
        .section-title { font-size: 13px; font-weight: 700; color: #fff; background: #1a56db; padding: 8px 10px; border-radius: 4px; margin-bottom: 10px; }
        .section-title.success { background: #0e9f6e; }
        .section-title.warning { background: #ff9800; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 10px; }
        .grid-3 { grid-template-columns: 1fr 1fr 1fr; }
        .field { }
        .field-label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
        .field-value { font-size: 13px; color: #1a202c; }
        .field-value.bold { font-weight: 700; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .badge-pending { background: #ffe4e6; color: #be123c; }
        .badge-open { background: #dbeafe; color: #1a56db; }
        .badge-progress { background: #fef3c7; color: #d97706; }
        .badge-closed { background: #d1fae5; color: #065f46; }
        .badge-warranty { background: #e0e7ff; color: #4338ca; }
        .divider { border: none; border-top: 1px solid #e2e8f0; margin: 12px 0; }
        .remarks-box { background: #f4f6fb; border-left: 4px solid #1a56db; padding: 10px; border-radius: 4px; margin-top: 12px; }
        .remarks-label { font-size: 12px; font-weight: 700; color: #1a56db; margin-bottom: 4px; }
        .remarks-text { font-size: 13px; color: #1a202c; line-height: 1.5; }
        .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center; }
        @media print { body { margin: 0; padding: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="company">🔧 BHAVI ELECTRONICS</div>
          <div class="tagline">& Automation — Service CRM</div>
        </div>
        <div style="text-align: right;">
          <div class="ticket-id">${ticket.id}</div>
          <div class="date">${new Date(ticket.created_at).toLocaleDateString('en-IN')}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">👤 CUSTOMER DETAILS</div>
        <div class="grid">
          <div class="field"><div class="field-label">Customer Name</div><div class="field-value bold">${ticket.cname || '—'}</div></div>
          <div class="field"><div class="field-label">Mobile</div><div class="field-value">${ticket.mobile || '—'}</div></div>
          <div class="field"><div class="field-label">Alternate</div><div class="field-value">${ticket.alt_mobile || '—'}</div></div>
          <div class="field"><div class="field-label">City / State</div><div class="field-value">${ticket.city || '—'} / ${ticket.state || '—'}</div></div>
          <div class="field" style="grid-column: 1/-1;"><div class="field-label">Address</div><div class="field-value">${ticket.address || '—'}</div></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title success">🏭 PRODUCT DETAILS</div>
        <div class="grid">
          <div class="field"><div class="field-label">Brand</div><div class="field-value bold">${ticket.brand_name || '—'}</div></div>
          <div class="field"><div class="field-label">Model</div><div class="field-value">${ticket.model || '—'}</div></div>
          <div class="field"><div class="field-label">Serial No</div><div class="field-value">${ticket.serial || '—'}</div></div>
          <div class="field"><div class="field-label">Condition</div><div class="field-value">${ticket.condition || '—'}</div></div>
          <div class="field" style="grid-column: 1/-1;"><div class="field-label">Problem / Issue</div><div class="field-value">${ticket.problem || '—'}</div></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title warning">🔧 SERVICE DETAILS</div>
        <div class="grid grid-3">
          <div class="field"><div class="field-label">Call Type</div><div style="margin-top: 2px;"><span class="badge badge-warranty" style="background: ${callTypeStyle.backgroundColor}; color: ${callTypeStyle.color};">${ticket.call_type || '—'}</span></div></div>
          <div class="field"><div class="field-label">Service Type</div><div class="field-value">${ticket.service_type || '—'}</div></div>
          <div class="field"><div class="field-label">Priority</div><div class="field-value">${ticket.priority || 'Normal'}</div></div>
        </div>
        <div class="grid">
          <div class="field"><div class="field-label">Warranty Coverage</div><div class="field-value">${ticket.warranty_coverage || '—'}</div></div>
          <div class="field"><div class="field-label">Warranty Coverage</div><div class="field-value">${ticket.warranty_coverage || '—'}</div></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">👷 STATUS & ASSIGNMENT</div>
        <div class="grid">
          <div class="field"><div class="field-label">Current Status</div><div style="margin-top: 2px;"><span class="badge badge-open" style="background: ${getBadgeStyle(statusBadges[ticket.status] || 'badge-open').backgroundColor}; color: ${getBadgeStyle(statusBadges[ticket.status] || 'badge-open').color};">${ticket.status || '—'}</span></div></div>
          <div class="field"><div class="field-label">Assigned To</div><div class="field-value bold">${ticket.assigned_name || 'Pending Allocation'}</div></div>
          <div class="field"><div class="field-label">Visit Date</div><div class="field-value">${ticket.visit_date || '—'}</div></div>
          <div class="field"><div class="field-label">SE Call ID</div><div class="field-value">${ticket.se_call_id || '—'}</div></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">💰 CHARGES</div>
        <div class="grid grid-3">
          <div class="field"><div class="field-label">Service Charges</div><div class="field-value bold">₹${ticket.service_charges || 0}</div></div>
          <div class="field"><div class="field-label">Labor Charges</div><div class="field-value bold">₹${ticket.labor || 0}</div></div>
          <div class="field"><div class="field-label">Final Charges</div><div class="field-value bold" style="color: #0e9f6e;">₹${ticket.final_charges || 0}</div></div>
        </div>
      </div>

      <div class="divider"></div>
      ${ticket.remarks ? `<div class="remarks-box"><div class="remarks-label">📝 Remarks & Notes</div><div class="remarks-text">${ticket.remarks}</div></div>` : ''}

      <div class="footer">
        <p>Generated: ${new Date().toLocaleString('en-IN')}</p>
        <p>Bhavi Electronics & Automation Service CRM</p>
      </div>
    </body>
    </html>
  `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
};
