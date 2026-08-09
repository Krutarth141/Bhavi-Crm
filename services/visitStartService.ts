import { supabase } from '@/lib/supabase';

const CLOSED_TICKET_STATUSES = ['Closed', 'Customer Reject', 'Call Cancel', 'Delivered'];
const PAUSED_STATUS_SUBSTRINGS = ['Pending Parts', 'Pending Customer Approval', 'Pending Engineer Stock', 'Pending Spare', 'Hold'];

interface VisitTicket {
    id: string;
    job_sheet?: string;
    cname?: string;
    model?: string;
    status?: string;
    timeline?: any[];
}

// Mirrors HTML's doVisitStart(): blocks on an already-OPEN work log (auto-closing
// it first if the log's own ticket has since moved to a closed/paused status),
// then opens a new 'travel' work_logs row and appends a Visit Start timeline entry.
export const startVisit = async (
    ticket: VisitTicket, memberId: string, memberName: string, memberRole: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const now = new Date();
        const timeNow = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const dateNow = now.toLocaleDateString('en-CA');

        const { data: openLogs, error: olErr } = await supabase.from('work_logs').select('*')
            .eq('eng_id', memberId).eq('log_date', dateNow).eq('to_time', 'OPEN');
        if (olErr) throw olErr;
        if (openLogs && openLogs.length) {
            const ol = openLogs[0];
            let closedOrPaused = false;
            if (ol.ticket_id) {
                const { data: olT } = await supabase.from('tickets').select('status').eq('id', ol.ticket_id).maybeSingle();
                const olStatus = olT?.status || '';
                if (CLOSED_TICKET_STATUSES.includes(olStatus) || PAUSED_STATUS_SUBSTRINGS.some(s => olStatus.toLowerCase().includes(s.toLowerCase()))) {
                    closedOrPaused = true;
                }
            }
            if (closedOrPaused) {
                await supabase.from('work_logs').update({ to_time: timeNow }).eq('id', ol.id);
            } else {
                const isWork = ol.log_type === 'work';
                return { success: false, error: `A ${isWork ? 'Work' : 'Traveling'} log is already OPEN!\n\n"${ol.task_description}"\n\nPlease close that call first before starting a new Visit.` };
            }
        }

        const ticketLabel = (ticket.job_sheet || `#${ticket.id}`) + (ticket.cname ? ' — ' + ticket.cname : '') + (ticket.model ? ' | ' + ticket.model : '');

        const { error: insErr } = await supabase.from('work_logs').insert([{
            eng_id: memberId, eng_name: memberName,
            member_role: memberRole === 'work_controller' ? 'WC' : 'Engineer',
            log_date: dateNow, from_time: timeNow, to_time: 'OPEN',
            task_description: `🚗 Traveling — ${ticketLabel}`,
            ticket_id: ticket.id, log_type: 'travel', created_at: now.toISOString(),
        }]);
        if (insErr) throw insErr;

        const tl = [...(ticket.timeline || []), { action: 'Visit Start', by: memberName, at: now.toISOString(), note: `Travel started: ${timeNow}` }];
        await supabase.from('tickets').update({ timeline: tl, updated_at: now.toISOString() }).eq('id', ticket.id);

        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

// Mirrors HTML's doVisitStop(): closes any OPEN work_logs row for this ticket
// and appends a Visit Stop timeline entry. Ticket status is left unchanged.
export const stopVisit = async (
    ticket: VisitTicket, memberId: string, memberName: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const now = new Date();
        const timeNow = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

        const { data: openLogs, error: olErr } = await supabase.from('work_logs').select('id')
            .eq('eng_id', memberId).eq('to_time', 'OPEN').eq('ticket_id', ticket.id);
        if (olErr) throw olErr;
        for (const ol of (openLogs || [])) {
            await supabase.from('work_logs').update({ to_time: timeNow }).eq('id', ol.id);
        }

        const tl = [...(ticket.timeline || []), { action: 'Visit Stop', by: memberName, at: now.toISOString(), note: `Travel stopped: ${timeNow}` }];
        const { error } = await supabase.from('tickets').update({ timeline: tl, updated_at: now.toISOString() }).eq('id', ticket.id);
        if (error) throw error;

        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};