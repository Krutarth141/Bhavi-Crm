import { SalesOrder, BHAVI_PAYMENT } from '@/types/sales';

const PORTAL_URL = 'https://bhavi-crm.github.io/bhavi-crm/complaint.html';

export const waOpen = (mobile: string, msg: string) => {
    let m = (mobile || '').replace(/\D/g, '');
    if (m.length === 10) m = '91' + m;
    window.open(`https://wa.me/${m}?text=${encodeURIComponent(msg)}`, '_blank');
};

const paymentBlock = (orderNo: string, total: number, upiQrUrl?: string | null) => {
    const bp = BHAVI_PAYMENT;
    return `━━━━━━━━━━━━━━━━━━━━\n💳 *PAYMENT DETAILS*\n━━━━━━━━━━━━━━━━━━━━\n`
        + (upiQrUrl ? `📱 *UPI QR Code — Scan & Pay instantly:*\n${upiQrUrl}\n_Tap the link above, screenshot and scan with GPay / PhonePe / Paytm / BHIM_\n\n` : '')
        + `*Bank:* ${bp.bank}\n*Account Name:* ${bp.name}\n*Account No:* \`${bp.account}\`\n*Account Type:* ${bp.type}\n*IFSC Code:* \`${bp.ifsc}\`\n*Branch:* ${bp.branch}\n\n`
        + `✅ UPI / GPay / PhonePe / Paytm / BHIM also accepted\n\n`
        + `*Order Ref:* ${orderNo}\n*Amount Due:* ₹${total.toLocaleString('en-IN')} *(100% Advance)*\n━━━━━━━━━━━━━━━━━━━━\n`
        + `After payment, please share the transaction screenshot or UTR number.`;
};

export const sendBrochure = (customerName: string, mobile: string) => {
    waOpen(mobile, `Dear ${customerName || 'Valued Customer'},\n\nThank you for your interest in Bhavi Electronics! 🙏\n\nPlease visit our customer portal to browse products, place your order, and track it anytime:\n\n🛍️ *Bhavi Electronics — Customer Portal*\n🔗 ${PORTAL_URL}\n\n✅ Services • Products • Order Tracking — all in one place!\n\nWarm regards,\n*Bhavi Electronics*\n_Where Customer Delight is First_`);
};

export const sendQuote = (order: SalesOrder, upiQrUrl?: string | null) => {
    const lines = (order.items || []).map(i => `  • ${i.name}${i.qty > 1 ? ` × ${i.qty}` : ''} — ₹${(i.price * i.qty).toLocaleString('en-IN')}`).join('\n');
    waOpen(order.customer_mobile || '', `Dear ${order.customer_name || 'Valued Customer'},\n\nPlease find your quotation from *Bhavi Electronics*.\n\n📋 *QUOTATION*\nOrder Ref: *${order.order_no}*\nDate: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}\n\n*Items:*\n${lines}\n\n💰 *Total: ₹${(order.total_amount || 0).toLocaleString('en-IN')}* _(All taxes included)_\n\n${paymentBlock(order.order_no || '', order.total_amount || 0, upiQrUrl)}\n\nWarm regards,\n*Bhavi Electronics*\n_Where Customer Delight is First_`);
};

export const sendPaymentDetails = (order: SalesOrder, upiQrUrl?: string | null) => {
    waOpen(order.customer_mobile || '', `Dear ${order.customer_name || 'Valued Customer'},\n\nKindly find the payment details below to proceed with your order.\n\n${paymentBlock(order.order_no || '', order.total_amount || 0, upiQrUrl)}\n\nOnce payment is received, we will confirm your order immediately.\n\nThank you for choosing Bhavi Electronics! 🙏\n_Where Customer Delight is First_`);
};

export const sendPaymentConfirm = (order: SalesOrder, method: string, ref: string, companyPhone?: string) => {
    waOpen(order.customer_mobile || '', `Dear ${order.customer_name || 'Valued Customer'},\n\n✅ *Payment Received — Order Confirmed*\n\nWe are pleased to confirm receipt of your payment.\n\n📦 *Order No:* ${order.order_no}\n💰 *Amount Paid:* ₹${(order.total_amount || 0).toLocaleString('en-IN')}\n💳 *Payment Method:* ${method}${ref ? `\n🔢 *Reference No:* ${ref}` : ''}\n📅 *Date:* ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}\n\nYour order is confirmed and will be dispatched soon. Tracking details will follow.\n\nFor queries, contact us: 📞 *Bhavi Electronics*${companyPhone ? ` — ${companyPhone}` : ''}\n\nThank you for choosing Bhavi Electronics! 🙏\n_Where Customer Delight is First_`);
};

export const sendDispatch = (order: SalesOrder, courier: string, awb: string, date: string, trackUrl: string, companyPhone?: string) => {
    waOpen(order.customer_mobile || '', `Dear ${order.customer_name || 'Valued Customer'},\n\n🚚 *Your Order Has Been Dispatched!*\n\n📦 *Order No:* ${order.order_no}\n🏢 *Courier:* ${courier}\n🔢 *AWB / Tracking No:* *${awb}*\n📅 *Dispatch Date:* ${date}\n${trackUrl ? `🔗 *Track:* ${trackUrl}\n` : ''}\nEstimated delivery: *1–2 working days*.\n\nFor queries, contact us: 📞 *Bhavi Electronics*${companyPhone ? ` — ${companyPhone}` : ''}\n\nThank you for shopping with Bhavi Electronics! 🙏\n_Where Customer Delight is First_`);
};

export const sendDelivered = (order: SalesOrder, note: string, companyPhone?: string) => {
    const itemList = (order.items || []).map(i => `  ✅ ${i.name}${i.qty > 1 ? ` × ${i.qty}` : ''}`).join('\n');
    waOpen(order.customer_mobile || '', `Dear ${order.customer_name || 'Valued Customer'},\n\n🎉 *Your Order Has Been Delivered!*\n\n📦 *Order No:* ${order.order_no}\n\n*Items Delivered:*\n${itemList}\n${note ? `\n📝 Note: ${note}\n` : ''}\nWe hope you are happy with your purchase! 😊\n\nIf you have any questions or need support:\n📞 *Bhavi Electronics* ${companyPhone || '+91 9574004969'}\n\n⭐ We would love your feedback!\n\nThank you for choosing Bhavi Electronics! 🙏\n_Where Customer Delight is First_`);
};