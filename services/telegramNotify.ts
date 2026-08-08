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

export const notifyNewTicket = async (t: { id: string; cname?: string; mobile?: string; model?: string; problem?: string; call_type?: string; assigned_name?: string }) => {
    try {
        const s = await fetchTelegramSettings();
        if (!s?.bot_token || !s?.chat_id || !s.notify_new_ticket) return;
        const text = `🆕 <b>New Ticket</b>\n🎫 ${t.id}\n👤 ${t.cname || '-'} (${t.mobile || '-'})\n📦 ${t.model || '-'}\n🔧 ${t.problem || '-'}\n🏷️ ${t.call_type || '-'}${t.assigned_name ? `\n👷 Assigned: ${t.assigned_name}` : ''}`;
        await sendTelegram(s.bot_token, s.chat_id, text);
    } catch { /* best-effort — notification failures must never block the main action */ }
};

export const notifyStatusChange = async (t: { id: string; cname?: string; model?: string }, newStatus: string, extra?: string) => {
    try {
        const s = await fetchTelegramSettings();
        if (!s?.bot_token || !s?.chat_id || !s.notify_status_change) return;
        const text = `🔄 <b>Status Update</b>\n🎫 ${t.id} — ${t.cname || '-'}\n📦 ${t.model || '-'}\n➡️ ${newStatus}${extra ? `\n${extra}` : ''}`;
        await sendTelegram(s.bot_token, s.chat_id, text);
    } catch { /* best-effort */ }
};

export const notifyPunchIn = async (engName: string, time: string) => {
    try {
        const s = await fetchTelegramSettings();
        if (!s?.bot_token || !s?.chat_id || !s.notify_punch_in) return;
        const text = `▶️ <b>Punch In</b>\n👷 ${engName}\n🕐 ${time}`;
        await sendTelegram(s.bot_token, s.chat_id, text);
    } catch { /* best-effort */ }
};