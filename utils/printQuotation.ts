import { fetchCompanyInfo } from '@/services/settingsService';
import { AutoSiteItem } from '@/types/autoSites';

export const printQuotation = async (params: {
    items: AutoSiteItem[];
    siteName: string;
    address?: string;
    mobile?: string;
    paid?: number;
    tcLines?: string[];
}): Promise<void> => {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { alert('Popup blocked — please allow popups in your browser'); return; }

    const ci = await fetchCompanyInfo();
    const coName = ci?.company_name || 'Bhavi Electronics & Automation';
    const logo = ci?.logo_url || '';
    const esc = (s?: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const quotNo = 'QT-' + Date.now().toString().slice(-6);
    const today = new Date().toLocaleDateString('en-IN');

    let grand = 0;
    const rows = params.items.map((it, i) => {
        const gst = it.gst_percent || 0;
        const sellRate = it.unit_price || 0;
        const total = Math.round(sellRate * (it.qty || 0) * (1 + gst / 100));
        grand += total;
        return `<tr>
<td style="padding:6px;border:1px solid #e5e7eb;text-align:center;">${i + 1}</td>
<td style="padding:6px;border:1px solid #e5e7eb;"><b>${esc(it.item_name)}</b></td>
<td style="padding:6px;border:1px solid #e5e7eb;text-align:center;font-size:12px;">${esc(it.unit) || 'pcs'}</td>
<td style="padding:6px;border:1px solid #e5e7eb;text-align:center;font-weight:600;">${it.qty}</td>
<td style="padding:6px;border:1px solid #e5e7eb;text-align:right;">₹${Number(sellRate).toLocaleString('en-IN')}</td>
<td style="padding:6px;border:1px solid #e5e7eb;text-align:center;">${gst ? gst + '%' : '—'}</td>
<td style="padding:6px;border:1px solid #e5e7eb;text-align:right;font-weight:700;">₹${Number(total).toLocaleString('en-IN')}</td>
</tr>`;
    }).join('') || '<tr><td colspan="7" style="padding:12px;text-align:center;color:#6b7280;">No items</td></tr>';

    const paid = params.paid || 0;
    const paySummary = paid
        ? `<b>Paid:</b> ₹${Number(paid).toLocaleString('en-IN')}&nbsp;&nbsp;<b style="color:#d97706;">Pending: ₹${Number(grand - paid).toLocaleString('en-IN')}</b>`
        : '';

    const tcRows = (params.tcLines || []).map((t, i) => `<tr>
<td style="padding:4px 8px;vertical-align:top;font-weight:700;font-size:12px;width:28px;">${i + 1}</td>
<td style="padding:4px 8px;font-size:12px;line-height:1.5;border:1px solid #e5e7eb;">${esc(t)}</td>
</tr>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Quotation-${quotNo}</title>
<style>@page{size:A4 portrait;margin:12mm;}*{box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:12px;color:#000;margin:0;padding:0;}
table{width:100%;border-collapse:collapse;}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style></head><body>
${logo ? `<div style="display:flex;align-items:center;gap:12px;padding:6px 0;"><img src="${logo}" style="max-height:60px;object-fit:contain;"></div>` : `<div style="font-size:18px;font-weight:800;color:#1d4ed8;">${esc(coName)}</div>`}
<div style="display:flex;justify-content:space-between;align-items:center;border-top:3px solid #cc0000;border-bottom:3px solid #cc0000;padding:6px 0;margin-bottom:14px;">
<div style="font-size:17px;font-weight:800;color:#1d4ed8;letter-spacing:1px;">QUOTATION</div>
<div style="text-align:right;font-size:11px;"><div><b>Quotation No:</b> ${quotNo}</div><div><b>Date:</b> ${today}</div></div>
</div>
<div style="background:#f0f4ff;border-radius:6px;padding:10px;margin-bottom:14px;font-size:12px;">
<b>Site / Client:</b> ${esc(params.siteName)}<br>
<b>Address:</b> ${esc(params.address) || '—'} &nbsp;&nbsp; <b>Mobile:</b> ${esc(params.mobile) || '—'}
</div>
<table style="margin-bottom:8px;">
<thead><tr style="background:#f9fafb;"><th style="padding:6px;border:1px solid #e5e7eb;">#</th><th style="padding:6px;border:1px solid #e5e7eb;">Item</th><th style="padding:6px;border:1px solid #e5e7eb;">Unit</th><th style="padding:6px;border:1px solid #e5e7eb;">Qty</th><th style="padding:6px;border:1px solid #e5e7eb;">Rate</th><th style="padding:6px;border:1px solid #e5e7eb;">GST</th><th style="padding:6px;border:1px solid #e5e7eb;">Total</th></tr></thead>
<tbody>${rows}</tbody>
</table>
<div style="display:flex;justify-content:flex-end;gap:20px;margin-bottom:14px;font-size:14px;">
<div><b>Grand Total: </b><span style="font-size:16px;font-weight:800;color:#059669;">₹${Number(grand).toLocaleString('en-IN')}</span></div>
</div>
${paySummary ? `<div style="margin-bottom:14px;font-size:13px;">${paySummary}</div>` : ''}
${(params.tcLines && params.tcLines.length) ? `<div style="margin-top:20px;"><div style="font-size:13px;font-weight:700;margin-bottom:6px;">Terms &amp; Conditions</div><table>${tcRows}</table></div>` : ''}
<div style="display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:40px;text-align:center;">
<div><div style="height:60px;border:1px dashed #ccc;border-radius:6px;margin-bottom:8px;"></div><div style="border-top:1.5px solid #000;padding-top:6px;font-size:11px;">Customer Signature &amp; Stamp</div></div>
<div><div style="height:60px;border:1px dashed #ccc;border-radius:6px;margin-bottom:8px;"></div><div style="border-top:1.5px solid #000;padding-top:6px;font-size:11px;">Authorized Signatory &amp; Stamp<br><span style="font-size:10px;color:#555;">${esc(coName)}</span></div></div>
</div>
<div style="border-top:2px solid #cc0000;margin-top:16px;padding-top:8px;text-align:center;font-size:10px;color:#555;">${esc(coName)} | This is a computer generated quotation.</div>
<script>window.onload=function(){window.print();};</script>
</body></html>`;

    win.document.write(html);
    win.document.close();
};