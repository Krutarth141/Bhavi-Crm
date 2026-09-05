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

// "🖨️ Print Job Sheet" — a compact A4 job sheet the way HTML's printJobSheet()
// renders it (index.html:12804-12930): customer/product/problem panels, an
// itemized spares table with a grand total, and signature boxes. Scoped to
// the core sections; skips the ICP/CSP terms-and-conditions block and
// physical-job-sheet-number cross-reference, which are print-formatting
// details rather than data this app is missing elsewhere.
export const printJobSheet = (ticket: Ticket): void => {
  const printWindow = window.open('', '_blank', 'width=820,height=1000');
  if (!printWindow) return;

  const t: any = ticket;
  const spares: any[] = (t.spares || []).filter((s: any) => !s.requested);
  const partsTotal = spares.reduce((a: number, s: any) => a + (s.qty || 0) * (s.price || 0), 0);
  const svc = parseFloat(t.service_charges) || parseFloat(t.labor) || 0;
  const other = parseFloat(t.other_charge) || 0;
  const grand = partsTotal + svc + other;
  const isW = t.call_type && ['Warranty', 'Warranty Repeat', 'AMC'].includes(t.call_type);
  const isOOC = t.warranty_coverage === 'Out of Coverage';

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>JS-${t.id}</title><style>
    *{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;font-size:10.5px;color:#000;padding:8px;}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #333;padding-bottom:6px;margin-bottom:6px;}
    .co-name{font-size:14px;font-weight:900;}.co-info{font-size:8.5px;color:#333;margin-top:1px;line-height:1.4;}
    .js-right{text-align:right;}.js-title{font-size:12px;font-weight:700;}
    .section{border:1px solid #999;border-radius:3px;margin-bottom:4px;}
    .sec-title{background:#e8e8e8;padding:3px 8px;font-weight:700;font-size:9px;text-transform:uppercase;}
    .sec-body{padding:4px 8px;}.row2{display:grid;grid-template-columns:1fr 1fr;gap:5px;}.row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;}
    .field{margin-bottom:2px;}.field label{font-size:7.5px;color:#555;text-transform:uppercase;display:block;}.field .val{font-size:10px;font-weight:700;border-bottom:1px solid #ccc;min-height:12px;padding-bottom:1px;}
    table.sp{width:100%;border-collapse:collapse;font-size:9.5px;}table.sp th,table.sp td{border:1px solid #999;padding:2px 5px;}table.sp th{background:#e8e8e8;}
    .sig-row-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:8px;}
    .sig-box{border:1px solid #999;border-radius:3px;padding:5px;text-align:center;min-height:62px;}
    .sig-line{border-top:1px solid #333;margin-top:36px;font-size:7.5px;color:#555;padding-top:2px;}
    .void{background:#fee2e2;border:2px solid #f05252;padding:4px;font-weight:700;color:#dc2626;text-align:center;margin-bottom:4px;border-radius:3px;font-size:9px;}
    @media print{body{padding:4px;}@page{size:A4;margin:6mm;}}
  </style></head><body>
    <div class="header">
      <div><div class="co-name">BHAVI ELECTRONICS &amp; AUTOMATION</div>
        <div class="co-info">101, Shivalik-10, Opp. SBI Zonal Office, S.M. Road, Ambawadi, Ahmedabad-380015<br>079-26306293/94 | +91 9574004969</div></div>
      <div class="js-right"><div class="js-title">SERVICE JOB SHEET</div>
        <div style="font-size:9.5px;margin-top:2px;">Ticket: <b>${t.id}</b>${t.job_sheet ? ` &nbsp;|&nbsp; JS: <b>${t.job_sheet}</b>` : ''}</div>
        <div style="font-size:9.5px;">Date: <b>${t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN') : '-'}</b></div>
        ${t.se_call_id ? `<div style="font-size:9.5px;">SE: <b>${t.se_call_id}</b></div>` : ''}
      </div>
    </div>
    ${isOOC ? `<div class="void">⚠️ WARRANTY VOID — ${t.coverage_remark || ''}</div>` : ''}
    <div class="section"><div class="sec-title">Customer</div><div class="sec-body row2">
      <div>
        <div class="field"><label>Name</label><div class="val">${t.cname || ''}</div></div>
        <div class="field"><label>Mobile</label><div class="val">${t.mobile || ''}${t.alt_mobile ? ' / ' + t.alt_mobile : ''}</div></div>
      </div>
      <div>
        <div class="field"><label>Address</label><div class="val">${t.address || ''}${t.area ? ', ' + t.area : ''}</div></div>
        <div class="field"><label>City / Pin</label><div class="val">${t.city || ''} — ${t.pin || ''}</div></div>
      </div>
    </div></div>
    <div class="section"><div class="sec-title">Product</div><div class="sec-body row3">
      <div class="field"><label>Model</label><div class="val">${t.model || ''}</div></div>
      <div class="field"><label>Serial</label><div class="val">${t.serial || ''}</div></div>
      <div class="field"><label>Brand</label><div class="val">${t.brand_name || ''}</div></div>
      <div class="field"><label>Call Type</label><div class="val">${t.call_type || ''}</div></div>
      <div class="field"><label>Service Type</label><div class="val">${t.service_type || ''}</div></div>
      <div class="field"><label>Coverage</label><div class="val" style="${isOOC ? 'color:#dc2626;' : 'color:#065f46;'}">${t.warranty_coverage || 'NA'}</div></div>
      <div class="field"><label>Condition</label><div class="val">${t.condition || ''}</div></div>
      <div class="field"><label>Accessories</label><div class="val">${t.accessories || ''}</div></div>
      <div class="field"><label>Re-Repair</label><div class="val">${t.rerepair ? 'Yes' : 'No'}</div></div>
    </div></div>
    <div class="section"><div class="sec-title">Problem &amp; Work Done</div><div class="sec-body">
      <div class="row2">
        <div class="field"><label>Problem</label><div class="val">${t.problem || ''}</div></div>
        <div class="field"><label>Fault Code</label><div class="val">${t.fault_code || ''}</div></div>
      </div>
      ${t.description ? `<div class="field"><label>Description</label><div class="val">${t.description}</div></div>` : ''}
      <div class="field" style="margin-top:3px;"><label>Action Taken</label><div class="val" style="min-height:22px;">${t.work_done || ''}</div></div>
    </div></div>
    <div class="section"><div class="sec-title">Engineer</div><div class="sec-body row2">
      <div class="field"><label>Engineer</label><div class="val">${t.assigned_name || ''}</div></div>
      <div class="field"><label>Status</label><div class="val">${t.status || ''}</div></div>
    </div></div>
    <div class="section"><div class="sec-title">Spares / Parts</div><div class="sec-body">
      <table class="sp"><thead><tr><th>Code</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead>
      <tbody>
        ${spares.length ? spares.map((s: any) => `<tr><td>${s.code || '-'}</td><td>${s.name || ''}</td><td style="text-align:center;">${s.qty}</td><td style="text-align:right;">₹${s.price || 0}</td><td style="text-align:right;">₹${((s.qty || 0) * (s.price || 0)).toFixed(2)}</td></tr>`).join('') : '<tr><td colspan="5" style="text-align:center;color:#999;padding:4px;">No spares used</td></tr>'}
        ${isOOC || !isW ? `<tr style="background:#f5f5f5;font-weight:700;"><td colspan="4" style="text-align:right;">Parts</td><td style="text-align:right;">₹${partsTotal.toFixed(2)}</td></tr>
        <tr><td colspan="4" style="text-align:right;">Service Charges</td><td style="text-align:right;">₹${svc.toFixed(2)}</td></tr>
        <tr><td colspan="4" style="text-align:right;">Other</td><td style="text-align:right;">₹${other.toFixed(2)}</td></tr>
        <tr style="background:#e8e8e8;font-weight:700;font-size:11px;"><td colspan="4" style="text-align:right;">Grand Total</td><td style="text-align:right;">₹${grand.toFixed(2)}</td></tr>` : ''}
      </tbody></table>
    </div></div>
    <div class="sig-row-3">
      <div class="sig-box"><div style="font-weight:700;font-size:9px;margin-bottom:2px;">ENGINEER</div><div style="font-size:8px;color:#555;margin-bottom:1px;">${t.assigned_name || ''}</div><div class="sig-line">Signature &amp; Date</div></div>
      <div class="sig-box"><div style="font-weight:700;font-size:9px;margin-bottom:2px;">CUSTOMER INWARD</div><div style="font-size:8px;color:#555;margin-bottom:1px;">At time of product submission</div><div style="height:36px;"></div><div class="sig-line">Signature &amp; Date</div></div>
      <div class="sig-box"><div style="font-weight:700;font-size:9px;margin-bottom:2px;">CUSTOMER OUTWARD</div><div style="font-size:8px;color:#555;margin-bottom:1px;">At time of product delivery</div>${t.customer_signature ? `<img src="${t.customer_signature}" style="max-height:36px;margin-top:2px;">` : '<div style="height:36px;"></div>'}<div class="sig-line">I confirm satisfactory completion</div></div>
    </div>
    <script>window.onload=()=>setTimeout(()=>window.print(),300);<\/script>
  </body></html>`;

  printWindow.document.write(html);
  printWindow.document.close();
};