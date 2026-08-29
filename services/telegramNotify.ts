import { fetchTelegramSettings } from './settingsService';

const sendTelegram = async (botToken: string, chatId: string, text: string) => {
    try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
        });
    } catch (e) {
        console.log('Telegram notify error:', e);
    }
};

// Mirrors HTML's tgNotifyAll — admin chat only.
export const notifyAll = async (text: string) => {
    try {
        const s = await fetchTelegramSettings();
        if (!s.bot_token || !s.admin_chat) return;
        await sendTelegram(s.bot_token, s.admin_chat, text);
    } catch { /* best-effort */ }
};

// Mirrors HTML's tgNotifyEngineer — engineer's own chat + admin + owner (if different).
export const notifyEngineer = async (engUserId: string, text: string) => {
    try {
        const s = await fetchTelegramSettings();
        if (!s.bot_token) return;
        const chatId = s.eng_map[engUserId];
        const sends: Promise<void>[] = [];
        if (chatId) sends.push(sendTelegram(s.bot_token, chatId, text));
        if (s.admin_chat) sends.push(sendTelegram(s.bot_token, s.admin_chat, text));
        if (s.owner_chat && s.owner_chat !== s.admin_chat) sends.push(sendTelegram(s.bot_token, s.owner_chat, text));
        await Promise.all(sends);
    } catch { /* best-effort */ }
};

export const notifyNewTicket = async (t: { id: string; cname?: string; mobile?: string; model?: string; problem?: string; call_type?: string; assigned_name?: string }) => {
    try {
        const s = await fetchTelegramSettings();
        if (!s.notify_new_ticket) return;
        const text = `🆕 <b>New Ticket</b>\n🎫 ${t.id}\n👤 ${t.cname || '-'} (${t.mobile || '-'})\n📦 ${t.model || '-'}\n🔧 ${t.problem || '-'}\n🏷️ ${t.call_type || '-'}${t.assigned_name ? `\n👷 Assigned: ${t.assigned_name}` : ''}`;
        await notifyAll(text);
    } catch { /* best-effort */ }
};

export const notifyTicketClosed = async (
    t: { id: string; cname?: string; mobile?: string; area?: string; city?: string; problem?: string; call_type?: string },
    status: string,
    params: { engName: string; workDone?: string; remarks?: string; spareLines?: string; isChargeable: boolean; totalAmt: number }
) => {
    try {
        const s = await fetchTelegramSettings();
        if (!s.bot_token) return;
        const label = status === 'Repaired' ? 'Repaired ✔' : 'Closed ✔';
        const text = `✅ <b>Call ${label}</b>\n`
            + `🎫 <b>${t.id}</b>  |  👷 ${params.engName || 'Engineer'}\n`
            + `👤 ${t.cname || '—'}${t.mobile ? `  |  📱 ${t.mobile}` : ''}\n`
            + `📍 ${t.area || t.city || '—'}\n`
            + `❗ <b>Problem:</b> ${t.problem || '—'}\n`
            + (params.workDone ? `🔧 <b>Work Done:</b> ${params.workDone}\n` : '')
            + (params.remarks ? `💬 <b>Remarks:</b> ${params.remarks}\n` : '')
            + (params.spareLines ? `\n🔩 <b>Parts Changed:</b>\n${params.spareLines}\n` : '')
            + (params.isChargeable && params.totalAmt > 0
                ? `\n💰 <b>Total Bill: ₹${params.totalAmt.toLocaleString('en-IN')}</b>`
                : `\n🛡️ ${t.call_type || 'Warranty'} — No Charge`);
        const sends: Promise<void>[] = [];
        if (s.admin_chat) sends.push(sendTelegram(s.bot_token, s.admin_chat, text));
        if (s.owner_chat && s.owner_chat !== s.admin_chat) sends.push(sendTelegram(s.bot_token, s.owner_chat, text));
        await Promise.all(sends);
    } catch { /* best-effort */ }
};

export const notifyPunchIn = async (engName: string, time: string) => {
    try {
        const s = await fetchTelegramSettings();
        if (!s.notify_punch_in) return;
        const text = `▶️ <b>Punch In</b>\n👷 ${engName}\n🕐 ${time}`;
        await notifyAll(text);
    } catch { /* best-effort */ }
};