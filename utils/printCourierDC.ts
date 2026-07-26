import { CourierProduct } from '@/types/courier';

interface PrintCourierDCParams {
    dcNo: string;
    entryDate: string;
    awbNo: string;
    agency: string;
    wcName: string;
    products: CourierProduct[];
    receiver: { name: string; address: string; city: string; state: string; pin: string; phone: string };
    amount: string;
    description: string;
}

function fmtDate(d: string): string {
    const parts = (d || '').split('-');
    return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : d;
}

function safeAcc(acc?: string[]): string {
    return acc && acc.length ? acc.join(', ') : '—';
}

export function printCourierDC(params: PrintCourierDCParams): void {
    const { dcNo, entryDate, awbNo, agency, wcName, products, receiver, amount, description } = params;
    const dateStr = fmtDate(entryDate);
    const desc = (description || 'CAMERA AND LENS AFTER REPAIRING').toUpperCase();

    const prodRows = products.map(p => `
    <tr>
      <td>${p.call_id || '—'}</td>
      <td style="font-weight:600;">${p.model || '—'}</td>
      <td>${p.serial || 'NIL'}</td>
      <td>${p.warranty === 'In Warranty' ? 'IW' : 'OW'}</td>
      <td>${safeAcc(p.accessories)}</td>
    </tr>`).join('');

    const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>DC-${dcNo}</title>
    <style>
      @page { size: A4; margin: 8mm 10mm; }
      * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; font-size: 10px; color: #000; margin: 0; padding: 0; }
      .page { width: 100%; padding: 10px; }
      .hrow { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 8px; }
      .meta { text-align: right; font-size: 10px; }
      .to { margin-bottom: 10px; line-height: 1.8; font-size: 12px; word-break: break-word; background: #FFF9C4; border: 2px solid #F59E0B; border-radius: 6px; padding: 8px 12px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
      th { background: #1a1a1a; color: #fff; padding: 4px 6px; border: 1px solid #000; font-size: 9px; text-align: center; text-transform: uppercase; }
      td { padding: 4px 6px; border: 1px solid #000; font-size: 10px; vertical-align: middle; text-align: center; }
      .footer { margin-top: 10px; border-top: 2px solid #000; padding-top: 8px; display: flex; justify-content: space-between; align-items: flex-start; }
      .from-box { font-size: 13px; line-height: 2; background: #F0F4FF; border-radius: 8px; padding: 10px 14px; border: 2px solid #1d4ed8; }
      .sig { margin-top: 8px; border: 1px solid #000; padding: 6px 10px; text-align: right; font-size: 10px; border-radius: 4px; min-width: 140px; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="hrow">
        <div><b style="font-size:16px;">DELIVERY CHALLAN</b><br><span style="font-size:11px;color:#555;">Bhavi Electronics &amp; Automation</span></div>
        <div class="meta"><b style="font-size:14px;">DC NO:- ${dcNo}</b><br>DATE:- ${dateStr}<br><span style="font-size:10px;color:#777;">AWB: ${awbNo || '—'} | ${agency}</span></div>
      </div>
      <div class="to">
        <b style="font-size:11px;letter-spacing:1.5px;color:#555;">TO,</b><br>
        <b style="font-size:17px;font-weight:900;letter-spacing:0.5px;">${receiver.name.toUpperCase()}</b><br>
        ${receiver.address ? `<div style="font-size:13px;font-weight:700;background:#fff3cd;border-left:3px solid #f59e0b;padding:4px 8px;margin:4px 0;border-radius:0 4px 4px 0;">${receiver.address.replace(/\n/g, '<br>').toUpperCase()}</div>` : ''}
        <span style="font-size:13px;font-weight:700;">${(receiver.city || '').toUpperCase()}${receiver.state ? ' - ' + receiver.state.toUpperCase() : ''}${receiver.pin ? ' :- ' + receiver.pin : ''}</span><br>
        ${receiver.phone ? `<span style="font-size:12px;font-weight:600;">PH NO:- ${receiver.phone}</span>` : ''}
      </div>
      <div style="margin-bottom:12px;font-size:13px;line-height:1.7;">THIS IS TO CERTIFY THAT HERE WE ARE SENDING <b>(${products.length})</b> ${desc} TO THE ABOVE ADDRESS</div>
      <table>
        <thead><tr><th style="width:20%;">TICKET / CALL ID</th><th style="width:26%;">MODEL NAME</th><th style="width:20%;">SERIAL NUMBER</th><th style="width:10%;">SERVICE TYPE</th><th style="width:24%;">ACCESSORIES</th></tr></thead>
        <tbody>${prodRows}</tbody>
      </table>
      <div style="font-size:13px;margin:12px 0;line-height:1.8;">THE APPROXIMATE VALUE OF THE CONSIGNMENT IS OF<br><b style="font-size:15px;">RS. ${amount ? amount + '.00' : '_______________'}</b></div>
      <div style="font-size:12px;font-weight:600;margin-bottom:10px;">IT IS NOT FOR SALE BUT ONLY FOR SERVICE PURPOSE</div>
      <div style="font-size:10px;color:#888;margin-bottom:4px;">Prepared by: ${wcName} | Date: ${dateStr}</div>
      <div class="footer">
        <div class="from-box">
          <b style="font-size:11px;color:#555;letter-spacing:1px;">FROM,</b><br>
          <b style="font-size:14px;color:#1a1a6e;">BHAVI ELECTRONICS &amp; AUTOMATION</b><br>
          <b style="font-size:13px;color:#1a1a6e;">101/A, SHIVALIK - 10, OPP. SBI ZONAL OFFICE, S.M ROAD, AMBAWADI, AHMEDABAD - 380015</b><br>
          <b>PH NO :- 079-26306393 &nbsp;&nbsp; MO :- 9574004969</b><br>Email: cccahm@gmail.com
        </div>
        <div class="sig">Authorised Signatory</div>
      </div>
    </div>
    <script>window.onload=function(){window.print();};<\/script>
  </body>
  </html>`;

    const win = window.open('', '_blank', 'width=820,height=950');
    if (!win) return;
    win.document.write(html);
    win.document.close();
}