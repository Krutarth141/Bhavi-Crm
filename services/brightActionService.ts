const callBrightAction = async (body: Record<string, any>): Promise<void> => {
    try {
        await fetch('/api/bright-action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
    } catch { /* best-effort — notification failures must never block the main action */ }
};

export const notifyReportEditSubmitted = (ticketId: string, cname: string, model: string, wcName: string, pendingEdit: any) =>
    callBrightAction({ type: 'report_edit_notify', ticketId, cname, model, wc_name: wcName, pending_edit: pendingEdit });

export const notifyReportEditResult = (ticketId: string, result: 'approved' | 'rejected', cname: string, model: string, wcId: string, pendingEdit: any, rejectReason?: string) =>
    callBrightAction({ type: 'report_edit_result', ticketId, result, cname, model, wc_id: wcId, pe: pendingEdit, ...(rejectReason ? { rejectReason } : {}) });

export const notifyWarrantyClaim = (params: { ticketId: string; customer: string; model: string; engineer: string; invoice: string; note: string; callType: string }) =>
    callBrightAction({ type: 'warranty_claim', ticket_id: params.ticketId, ticket_no: params.ticketId, customer: params.customer, model: params.model, engineer: params.engineer, invoice: params.invoice, note: params.note, call_type: params.callType });

export const sendDailyReportEmail = async (): Promise<{ success: boolean; error?: string }> => {
    try {
        const res = await fetch('/api/bright-action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'daily' }) });
        if (!res.ok) return { success: false, error: await res.text() };
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
};

export const sendWeeklyReportEmail = async (from: string, to: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const res = await fetch('/api/bright-action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'weekly', from, to }) });
        if (!res.ok) return { success: false, error: await res.text() };
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
};