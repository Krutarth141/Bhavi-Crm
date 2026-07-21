import { fetchCompanyInfo } from '@/services/settingsService';

export const printDeliveryChallan = async (params: {
    siteName: string;
    dcNumber: string;
    dispatchDate: string;
    receiverName?: string;
    deliveryDetail?: string;
    engineerName: string;
    items: { item_name: string; qty: number; unit?: string; note?: string; model_no?: string; brand?: string; made_in?: string; category?: string; description?: string }[];
}): Promise<void> => {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { alert('Popup blocked — please allow popups in your browser'); return; }

    const ci = await fetchCompanyInfo();
    const coName = ci?.company_name || 'Bhavi Electronics & Automation';
    const logo = ci?.logo_url || '';
    const esc = (s?: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const today = new Date().toLocaleDateString('en-IN');

    const rows = params.items.map((it, i) => `<tr>
<td style="padding:6px;border:1px solid #e5e7eb;text-align:center;">${i + 1}</td>
<td style="padding:6px;border:1px solid #e5e7eb;"><b>${esc(it.item_name)}</b>${it.description ? `<br><span style="font-size:11px;color:#6b7280;">${esc(it.description)}</span>` : ''}</td>
<td style="padding:6px;border:1px solid #e5e7eb;font-size:12px;">${esc(it.model_no) || '—'}</td>
<td style="padding:6px;border:1px solid #e5e7eb;font-size:12px;">${esc(it.brand) || '—'}${it.made_in ? `<br><span style="font-size:10px;color:#6b7280;">🌐 ${esc(it.made_in)}</span>` : ''}</td>
<td style="padding:6px;border:1px solid #e5e7eb;font-size:12px;">${esc(it.category) || '—'}</td>
<td style="padding:6px;border:1px solid #e5e7eb;text-align:center;font-size:12px;">${esc(it.unit) || 'pcs'}</td>
<td style="padding:6px;border:1px solid #e5e7eb;text-align:center;font-weight:600;">${it.qty}</td>
<td style="padding:6px;border:1px solid #e5e7eb;color:#6b7280;">${esc(it.note) || '—'}</td>
</tr>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>DC-${params.dcNumber}</title>
<style>@page{size:A4 portrait;margin:12mm;}*{box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:12px;color:#000;margin:0;padding:0;}
table{width:100%;border-collapse:collapse;}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style></head><body>
${logo ? `<div style="display:flex;align-items:center;gap:12px;padding:6px 0;"><img src="${logo}" style="max-height:60px;object-fit:contain;"></div>` : `<div style="font-size:18px;font-weight:800;color:#1d4ed8;">${esc(coName)}</div>`}
<div style="display:flex;justify-content:space-between;align-items:center;border-top:3px solid #cc0000;border-bottom:3px solid #cc0000;padding:6px 0;margin-bottom:14px;">
<div style="font-size:17px;font-weight:800;color:#1d4ed8;letter-spacing:1px;">DELIVERY CHALLAN</div>
<div style="text-align:right;font-size:11px;"><div><b>DC No:</b> ${esc(params.dcNumber)}</div><div><b>Date:</b> ${params.dispatchDate ? new Date(params.dispatchDate).toLocaleDateString('en-IN') : today}</div></div>
</div>
<div style="background:#f0f4ff;border-radius:6px;padding:10px;margin-bottom:14px;font-size:12px;">
<b>Site:</b> ${esc(params.siteName)} &nbsp;&nbsp; <b>Engineer:</b> ${esc(params.engineerName)}
${params.deliveryDetail ? `<br><b>Delivery Mode:</b> ${esc(params.deliveryDetail)}` : ''}
</div>
<table style="margin-bottom:16px;">
<thead><tr style="background:#f9fafb;"><th style="padding:6px;border:1px solid #e5e7eb;">#</th><th style="padding:6px;border:1px solid #e5e7eb;">Item</th><th style="padding:6px;border:1px solid #e5e7eb;">Model No</th><th style="padding:6px;border:1px solid #e5e7eb;">Brand</th><th style="padding:6px;border:1px solid #e5e7eb;">Category</th><th style="padding:6px;border:1px solid #e5e7eb;">Unit</th><th style="padding:6px;border:1px solid #e5e7eb;">Qty</th><th style="padding:6px;border:1px solid #e5e7eb;">Note</th></tr></thead>
<tbody>${rows}</tbody>
</table>
<div style="margin-bottom:16px;font-size:12px;"><b>Receiver Name:</b> ${esc(params.receiverName) || '_______________________'}</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:40px;text-align:center;">
<div><div style="height:60px;border:1px dashed #ccc;border-radius:6px;margin-bottom:8px;"></div><div style="border-top:1.5px solid #000;padding-top:6px;font-size:11px;">Receiver Signature</div></div>
<div><div style="height:60px;border:1px dashed #ccc;border-radius:6px;margin-bottom:8px;"></div><div style="border-top:1.5px solid #000;padding-top:6px;font-size:11px;">Authorized Signatory<br><span style="font-size:10px;color:#555;">${esc(coName)}</span></div></div>
</div>
<div style="border-top:2px solid #cc0000;margin-top:16px;padding-top:8px;text-align:center;font-size:10px;color:#555;">${esc(coName)} | This is a computer generated delivery challan.</div>
<script>window.onload=function(){window.print();};</script>
</body></html>`;

    win.document.write(html);
    win.document.close();
};