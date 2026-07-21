import { fetchCompanyInfo } from '@/services/settingsService';

export const printPaymentReceipt = async (p: {
    id: number | string;
    site_name: string;
    quotation_total: number;
    paid_before: number;
    amount: number;
    payment_mode: string;
    payment_date: string;
    reference_no?: string;
    note?: string;
}): Promise<void> => {
    const win = window.open('', '_blank', 'width=700,height=800');
    if (!win) { alert('Popup blocked — please allow popups in your browser'); return; }

    const ci = await fetchCompanyInfo();
    const coName = ci?.company_name || 'Bhavi Electronics & Automation';
    const logo = ci?.logo_url || '';

    const rcpNo = `RCP-${new Date().getFullYear()}-${String(p.id).slice(-5).toUpperCase()}`;
    const rcpDate = p.payment_date ? p.payment_date.split('-').reverse().join('/') : new Date().toLocaleDateString('en-IN');
    const paidAfter = (p.paid_before || 0) + (p.amount || 0);
    const balance = (p.quotation_total || 0) - paidAfter;
    const modeIcon: Record<string, string> = { Cash: '💵', NEFT: '🏦', IMPS: '📱', Cheque: '📝', UPI: '📲' };
    const icon = modeIcon[p.payment_mode] || '💰';
    const esc = (s?: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Receipt-${rcpNo}</title>
<style>@page{size:A5 portrait;margin:8mm;}*{box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:12px;color:#000;margin:0;padding:0;}
table{width:100%;border-collapse:collapse;}td{padding:7px 10px;border:1px solid #ccc;font-size:12px;}
.label{background:#f0f4ff;font-weight:700;width:45%;}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style></head><body>
${logo ? `<div style="display:flex;align-items:center;gap:12px;padding:6px 0;"><img src="${logo}" style="max-height:60px;object-fit:contain;"></div>` : `<div style="font-size:18px;font-weight:800;color:#1d4ed8;">${esc(coName)}</div>`}
<div style="display:flex;justify-content:space-between;align-items:center;border-top:3px solid #cc0000;border-bottom:3px solid #cc0000;padding:6px 0;margin-bottom:14px;">
<div style="font-size:17px;font-weight:800;color:#1d4ed8;letter-spacing:1px;">PAYMENT RECEIPT</div>
<div style="text-align:right;font-size:11px;"><div><b>Receipt No:</b> ${rcpNo}</div><div><b>Date:</b> ${rcpDate}</div></div>
</div>
<div style="background:#f0f4ff;border-radius:6px;padding:10px;margin-bottom:14px;font-size:11px;">
<b>Site / Client:</b> ${esc(p.site_name)}</div>
<table style="margin-bottom:14px;">
<tr><td class="label">Amount Received</td><td style="font-size:15px;font-weight:800;color:#059669;">₹${Number(p.amount).toLocaleString('en-IN')}</td></tr>
<tr><td class="label">Payment Mode</td><td>${icon} ${esc(p.payment_mode)}</td></tr>
${p.reference_no ? `<tr><td class="label">Reference / UTR</td><td>${esc(p.reference_no)}</td></tr>` : ''}
${p.note ? `<tr><td class="label">Note</td><td>${esc(p.note)}</td></tr>` : ''}
</table>
${p.quotation_total ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px;margin-bottom:14px;font-size:12px;">
<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>Quotation Total:</span><span><b>₹${Number(p.quotation_total).toLocaleString('en-IN')}</b></span></div>
<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>Previously Paid:</span><span>₹${Number(p.paid_before).toLocaleString('en-IN')}</span></div>
<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>This Payment:</span><span style="color:#059669;font-weight:700;">₹${Number(p.amount).toLocaleString('en-IN')}</span></div>
<div style="display:flex;justify-content:space-between;border-top:1px solid #86efac;padding-top:6px;margin-top:4px;"><span><b>Balance Remaining:</b></span><span style="font-weight:800;color:${balance > 0 ? '#dc2626' : '#059669'};">₹${Number(Math.max(0, balance)).toLocaleString('en-IN')}${balance <= 0 ? ' (FULLY PAID)' : ''}</span></div>
</div>` : ''}
<div style="display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:40px;text-align:center;">
<div><div style="height:60px;border:1px dashed #ccc;border-radius:6px;margin-bottom:8px;"></div><div style="border-top:1.5px solid #000;padding-top:6px;font-size:11px;">Customer Signature &amp; Stamp</div></div>
<div><div style="height:60px;border:1px dashed #ccc;border-radius:6px;margin-bottom:8px;"></div><div style="border-top:1.5px solid #000;padding-top:6px;font-size:11px;">Authorized Signatory &amp; Stamp<br><span style="font-size:10px;color:#555;">${esc(coName)}</span></div></div>
</div>
<div style="border-top:2px solid #cc0000;margin-top:16px;padding-top:8px;text-align:center;font-size:10px;color:#555;">${esc(coName)} | This is a computer generated receipt.</div>
<script>window.onload=function(){window.print();};</script>
</body></html>`;

    win.document.write(html);
    win.document.close();
};