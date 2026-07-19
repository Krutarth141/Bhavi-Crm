import { Ticket } from '@/types/tickets';
import { fetchCompanyInfo } from '@/services/settingsService';

const DEFAULT_TERMS = '• Warranty on repaired parts: 90 days\n• No warranty on physical/liquid damage\n• Uncollected products after 30 days attract storage charges';

export const generateInvoice = async (ticket: Ticket): Promise<void> => {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
        alert('Popup blocked — please allow popups in your browser');
        return;
    }

    const ci = await fetchCompanyInfo();
    const coName = ci?.company_name || 'Bhavi Electronics';
    const coPhone = ci?.phone || '';
    const coEmail = ci?.email || '';
    const coGst = ci?.gst_no || '';
    const coAddr = ci?.address || '';
    const coWeb = ci?.website || 'bhavi-crm.github.io/bhavi-crm';
    const coTerms = (ci?.terms || DEFAULT_TERMS).split('\n').join('<br>');
    const logo = ci?.logo_url || '';

    const spares = ticket.spares || [];
    const isWarranty = !!ticket.call_type && ['Warranty', 'Warranty Repeat', 'AMC'].includes(ticket.call_type);

    // service_charges/labor is GST-inclusive — back-calculate base + GST from it
    const laborInclGst = Number(ticket.labor) || Number(ticket.service_charges) || 0;
    const other = Number(ticket.other_charge) || 0;
    const defaultPartsGst = Number(ci?.gst_pct) || 18;
    const laborGstPct = Number(ci?.labor_gst_pct) || 18;

    // Part prices are MRP (GST-inclusive) — back-calculate base
    const partsMrpTotal = spares.reduce((a, s) => a + (s.qty || 1) * (s.price || 0), 0);
    const partsBase = isWarranty
        ? partsMrpTotal
        : spares.reduce((a, s) => {
            const r = s.gst_pct != null ? Number(s.gst_pct) : defaultPartsGst;
            const mrp = (s.qty || 1) * (s.price || 0);
            return a + Math.round((mrp / (1 + r / 100)) * 100) / 100;
        }, 0);
    const partsGstAmt = isWarranty ? 0 : Math.round((partsMrpTotal - partsBase) * 100) / 100;
    const partsTotal = partsBase;

    const labor = isWarranty ? laborInclGst : Math.round((laborInclGst / (1 + laborGstPct / 100)) * 100) / 100;
    const laborGstAmt = isWarranty ? 0 : Math.round((laborInclGst - labor) * 100) / 100;
    const totalGst = partsGstAmt + laborGstAmt;
    const grandTotal = partsMrpTotal + laborInclGst + other;

    const invoiceNo = ticket.invoice_no || `INV-${ticket.id}`;
    const invoiceDate = ticket.visit_date || new Date().toLocaleDateString('en-CA');

    const partsRows = spares.length
        ? spares
            .map((s, i) => {
                const partGstR = s.gst_pct != null ? Number(s.gst_pct) : defaultPartsGst;
                const mrpAmt = (s.qty || 1) * (s.price || 0);
                const baseAmt = isWarranty ? mrpAmt : Math.round((mrpAmt / (1 + partGstR / 100)) * 100) / 100;
                const partGstAmt = isWarranty ? 0 : Math.round((mrpAmt - baseAmt) * 100) / 100;
                return `<tr><td>${i + 1}</td><td>${s.name || s.code || '-'}</td><td>${s.code || '-'}</td><td style="text-align:center;">${s.qty || 1}</td><td style="text-align:right;">₹${(s.price || 0).toFixed(2)}</td><td style="text-align:center;">${isWarranty ? '—' : partGstR + '%'}</td><td style="text-align:right;">${isWarranty ? '—' : '₹' + partGstAmt.toFixed(2)}</td><td style="text-align:right;">₹${mrpAmt.toFixed(2)}</td></tr>`;
            })
            .join('')
        : '<tr><td colspan="8" style="text-align:center;color:#888;padding:12px;">No parts used</td></tr>';

    const invData = {
        cname: ticket.cname, mobile: ticket.mobile, model: ticket.model, brand: ticket.brand_name,
        labor, partsTotal, other, totalGst, grandTotal, invoiceNo, invoiceDate, isWarranty,
    };

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Invoice ${invoiceNo}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Segoe UI',Arial,sans-serif;color:#222;font-size:13px;background:#fff;}
.page{width:210mm;min-height:297mm;padding:14mm 16mm;margin:0 auto;}
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1d4ed8;padding-bottom:14px;margin-bottom:16px;}
.company h1{font-size:22px;color:#1d4ed8;font-weight:800;margin-bottom:2px;}
.company p{font-size:11px;color:#555;line-height:1.6;}
.logo img{max-height:70px;max-width:160px;object-fit:contain;}
.inv-meta{display:flex;justify-content:space-between;margin-bottom:16px;gap:20px;}
.meta-box{flex:1;background:#f8fafc;border-radius:8px;padding:10px 14px;border:1px solid #e5e7eb;}
.meta-box h4{font-size:10px;text-transform:uppercase;color:#888;letter-spacing:.5px;margin-bottom:6px;}
.meta-box p{font-size:12px;line-height:1.7;color:#222;}
.badge{display:inline-block;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:600;}
.badge-warranty{background:#d1fae5;color:#065f46;}
.badge-nonw{background:#fee2e2;color:#991b1b;}
table{width:100%;border-collapse:collapse;margin-bottom:14px;}
thead tr{background:#1d4ed8;color:#fff;}
thead th{padding:8px 10px;text-align:left;font-size:12px;}
tbody tr:nth-child(even){background:#f8fafc;}
tbody td{padding:7px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;}
.totals{width:260px;margin-left:auto;}
.totals td{padding:5px 10px;font-size:13px;}
.totals .grand{font-size:15px;font-weight:700;color:#1d4ed8;border-top:2px solid #1d4ed8;}
.footer{margin-top:28px;padding-top:14px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:flex-end;}
.sig{text-align:center;font-size:12px;color:#555;}
.sig div{margin-top:40px;border-top:1px solid #888;padding-top:4px;}
.terms{font-size:10px;color:#888;margin-top:14px;line-height:1.6;}
@media print{ body{padding:0;} .page{padding:10mm 12mm;} .no-print{display:none!important;} }
</style></head><body>
<div style="text-align:center;padding:10px;background:#1d4ed8;color:#fff;font-size:13px;font-weight:600;" class="no-print">
  <button onclick="window.print()" style="background:#fff;color:#1d4ed8;border:none;border-radius:6px;padding:6px 20px;font-weight:700;cursor:pointer;margin-right:10px;">🖨️ Print / Save PDF</button>
  <button onclick="shareInvoiceWA()" style="background:#25D366;color:#fff;border:none;border-radius:6px;padding:6px 20px;font-weight:700;cursor:pointer;">📲 Share on WhatsApp</button>
  <button onclick="window.close()" style="background:transparent;color:#fff;border:1px solid #fff;border-radius:6px;padding:6px 16px;cursor:pointer;margin-left:10px;">✕ Close</button>
</div>
<div class="page">
  <div class="header">
    <div class="company">
      <h1>${coName}</h1>
      <p>Service Center | Authorized Repair${coPhone ? '<br>📞 ' + coPhone : ''}${coEmail ? ' | ✉️ ' + coEmail : ''}${coAddr ? '<br>' + coAddr : ''}${coGst ? '<br>GST: ' + coGst : ''}${coWeb ? '<br>🌐 ' + coWeb : ''}</p>
    </div>
    <div style="text-align:right;">
      ${logo ? `<div class="logo"><img src="${logo}"></div>` : ''}
      <div style="margin-top:6px;">
        <div style="font-size:20px;font-weight:800;color:#1d4ed8;">TAX INVOICE</div>
        <div style="font-size:12px;color:#555;">No: <b>${invoiceNo}</b></div>
        <div style="font-size:12px;color:#555;">Date: <b>${invoiceDate}</b></div>
      </div>
    </div>
  </div>

  <div class="inv-meta">
    <div class="meta-box">
      <h4>Bill To</h4>
      <p><b>${ticket.cname || '-'}</b><br>
      📞 ${ticket.mobile || '-'}${ticket.alt_mobile ? ' | ' + ticket.alt_mobile : ''}<br>
      ${ticket.address || ''}${ticket.area ? ', ' + ticket.area : ''}<br>
      ${ticket.city || ''}${ticket.pin ? ' - ' + ticket.pin : ''}${ticket.state ? ', ' + ticket.state : ''}</p>
    </div>
    <div class="meta-box">
      <h4>Job Details</h4>
      <p>Ticket: <b>${ticket.id}</b><br>
      Type: <span class="badge ${isWarranty ? 'badge-warranty' : 'badge-nonw'}">${ticket.call_type || '-'}</span><br>
      Service: ${ticket.service_type || '-'}<br>
      Status: ${ticket.status || '-'}</p>
    </div>
    <div class="meta-box">
      <h4>Product</h4>
      <p>Brand: <b>${ticket.brand_name || '-'}</b><br>
      Model: <b>${ticket.model || '-'}</b><br>
      Serial: ${ticket.serial || '-'}<br>
      Problem: ${ticket.problem || '-'}</p>
    </div>
  </div>

  <table>
    <thead><tr><th>#</th><th>Part / Item</th><th>Part Code</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Rate</th><th style="text-align:center;">GST%</th><th style="text-align:right;">GST Amt</th><th style="text-align:right;">Amount</th></tr></thead>
    <tbody>${partsRows}</tbody>
  </table>

  <table class="totals">
    <tbody>
      ${partsMrpTotal > 0 ? `<tr><td>Parts Sub-Total${!isWarranty ? ' (excl. GST)' : ''}</td><td style="text-align:right;">₹${partsTotal.toFixed(2)}</td></tr>` : ''}
      ${partsGstAmt > 0 ? `<tr><td style="color:#7c3aed;">Parts GST</td><td style="text-align:right;color:#7c3aed;">₹${partsGstAmt.toFixed(2)}</td></tr>` : ''}
      ${labor > 0 ? `<tr><td>Labor / Service${!isWarranty ? ' (excl. GST)' : ''}</td><td style="text-align:right;">₹${labor.toFixed(2)}</td></tr>` : ''}
      ${laborGstAmt > 0 ? `<tr><td style="color:#7c3aed;">Labor GST (${laborGstPct}%)</td><td style="text-align:right;color:#7c3aed;">₹${laborGstAmt.toFixed(2)}</td></tr>` : ''}
      ${other > 0 ? `<tr><td>Other Charges</td><td style="text-align:right;">₹${other.toFixed(2)}</td></tr>` : ''}
      ${totalGst > 0 && !isWarranty ? `<tr style="background:#f5f3ff;"><td style="font-weight:700;">Total GST</td><td style="text-align:right;font-weight:700;">₹${totalGst.toFixed(2)}</td></tr>` : ''}
      ${isWarranty ? `<tr><td colspan="2" style="color:#065f46;font-weight:600;text-align:center;">✅ Under Warranty — No Charge</td></tr>` : ''}
      <tr class="grand"><td>GRAND TOTAL${totalGst > 0 && !isWarranty ? ' (incl. GST)' : ''}</td><td style="text-align:right;">₹${grandTotal.toFixed(2)}</td></tr>
    </tbody>
  </table>

  ${ticket.eng_remarks || ticket.work_done ? `<div style="background:#f8fafc;border-radius:8px;padding:10px 14px;margin-bottom:14px;border-left:3px solid #1d4ed8;font-size:12px;"><b>Work Done:</b> ${ticket.work_done || ticket.eng_remarks || ''}</div>` : ''}

  <div class="footer">
    <div class="terms"><b>Terms & Conditions:</b><br>${coTerms}</div>
    <div class="sig"><div>Authorized Signature</div><div style="margin-top:4px;font-size:11px;color:#888;">${coName}</div></div>
  </div>
</div>
<script>
var _invData = ${JSON.stringify(invData)};
function shareInvoiceWA(){
  var d = _invData;
  var txt = '━━━━━━━━━━━━━━━━━━━━━\\n'
    + '🧾 *INVOICE — ' + d.invoiceNo + '*\\n'
    + '━━━━━━━━━━━━━━━━━━━━━\\n'
    + '👤 *' + d.cname + '*\\n'
    + '📱 ' + d.mobile + '\\n'
    + '📅 Date: ' + d.invoiceDate + '\\n\\n'
    + '🔧 *Product: ' + d.brand + ' ' + d.model + '*\\n\\n'
    + '▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔\\n'
    + (d.partsTotal > 0 ? '  Parts        → ₹' + d.partsTotal.toFixed(2) + '\\n' : '')
    + (d.labor > 0 ? '  Labor/Service → ₹' + d.labor.toFixed(2) + '\\n' : '')
    + (d.other > 0 ? '  Other         → ₹' + d.other.toFixed(2) + '\\n' : '')
    + (d.totalGst > 0 ? '  GST           → ₹' + d.totalGst.toFixed(2) + '\\n' : '')
    + '▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔\\n'
    + '  💵 *Total: ₹' + d.grandTotal.toFixed(2) + '*\\n'
    + '━━━━━━━━━━━━━━━━━━━━━\\n'
    + (d.isWarranty ? '✅ Under Warranty — No Charge\\n' : '')
    + '_' + ${JSON.stringify(coName)} + ' — Service Center_';
  window.open('https://wa.me/91' + d.mobile.replace(/\\D/g,'') + '?text=' + encodeURIComponent(txt), '_blank');
}
</script>
</body></html>`;

    win.document.write(html);
    win.document.close();
};