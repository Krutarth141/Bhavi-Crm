import { Ticket } from '@/types/tickets';

export const printLabel = (ticket: Ticket): void => {
    const printWindow = window.open('', '_blank', 'width=340,height=220');
    if (!printWindow) return;

    const jsNo = ticket.job_sheet || ticket.id || '';

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Label-${jsNo}</title><style>
    @page{size:3in 1.5in;margin:0;}
    @media print{@page{size:3in 1.5in;margin:0;}html,body{width:3in!important;height:1.5in!important;overflow:hidden!important;}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
    *{box-sizing:border-box;margin:0;padding:0;}
    html{width:3in;height:1.5in;}
    body{font-family:Arial,sans-serif;width:3in;height:1.5in;overflow:hidden;padding:5px 7px;background:#fff;}
    .hdr{font-size:7px;font-weight:900;color:#1a3fa8;text-transform:uppercase;letter-spacing:.4px;border-bottom:1.5px solid #1a3fa8;padding-bottom:2px;margin-bottom:3px;}
    .jno{font-size:15px;font-weight:900;color:#dc2626;letter-spacing:.5px;margin-bottom:4px;}
    .row{display:flex;align-items:baseline;gap:4px;margin-bottom:2px;line-height:1.25;}
    .lbl{font-size:7.5px;font-weight:700;color:#64748b;min-width:44px;text-transform:uppercase;}
    .val{font-size:9px;font-weight:700;color:#1e293b;}
  </style></head><body>
    <div class="hdr">Bhavi Electronics &amp; Automation</div>
    <div class="jno">${jsNo}</div>
    <div class="row"><span class="lbl">Customer</span><span class="val">${ticket.cname || '—'}</span></div>
    <div class="row"><span class="lbl">Mobile</span><span class="val">${ticket.mobile || '—'}</span></div>
    <div class="row"><span class="lbl">Model</span><span class="val">${ticket.model || '—'}</span></div>
    <div class="row"><span class="lbl">Serial</span><span class="val">${ticket.serial || '—'}</span></div>
    <script>window.onload=()=>setTimeout(()=>window.print(),300);<\/script>
  </body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
};