import { supabase } from '@/lib/supabase';

const CLOSED_TICKET_STATUSES = ['Closed', 'Customer Reject', 'Call Cancel', 'Delivered'];
const PAUSED_STATUS_SUBSTRINGS = ['Pending Parts', 'Pending Customer Approval', 'Pending Engineer Stock', 'Pending Spare', 'Hold'];
// Same list, but as exact status values (used by computeWorkPanel — matches
// HTML's pausedS array, checked with strict equality there, not substring).
const PAUSED_STATUSES = ['Pending Parts', 'Pending Customer Approval', 'Pending Engineer Stock', 'Pending Spare', 'Hold'];

interface VisitTicket {
    id: string;
    job_sheet?: string;
    cname?: string;
    model?: string;
    status?: string;
    timeline?: any[];
    service_type?: string;
    visit_in?: string;
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

// ─── Work Start / Reached Location / Work on Hold ───────────────────────────
// Mirrors HTML's Visit Start / Work Start panel inside openEngUpdate()
// (index.html:6897-6992). Carry In calls only track Work Start/Hold; On Site
// calls cycle through Visit Start → Reached Location → Work Start → Hold →
// Visit Start again, driven purely by the most recent matching timeline entry.

export type WorkPanelState =
    | { kind: 'carryin-start' }
    | { kind: 'carryin-paused'; sessions: number; totalMin: number; isHold: boolean; statusLabel: string }
    | { kind: 'carryin-started'; wsTime: string; sessionNo: number; totalMin: number }
    | { kind: 'onsite-start' }
    | { kind: 'onsite-paused'; sessions: number; totalMin: number; label: string }
    | { kind: 'onsite-started'; wsTime: string; sessionNo: number }
    | { kind: 'onsite-visiting'; vsTime: string; reachedToday: boolean };

const fmtIstTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });

export function computeWorkPanel(t: VisitTicket): WorkPanelState | null {
    if (t.service_type !== 'Carry In' && t.service_type !== 'On Site') return null;
    const tl = t.timeline || [];
    const isPaused = PAUSED_STATUSES.includes(t.status || '');
    const totalDone = (e: any[]) => e.filter(x => x.action === 'Work Session End').reduce((s, x) => s + (x.duration_min || 0), 0);

    if (t.service_type === 'Carry In') {
        const wsEntries = tl.filter(e => e.action && e.action.includes('Work Start'));
        const wsEntry = wsEntries.length ? wsEntries[wsEntries.length - 1] : null;
        const holdEntries = tl.filter(e => e.action === 'Work on Hold');
        const lastHold = holdEntries.length ? holdEntries[holdEntries.length - 1] : null;
        const isWorkHeld = !!(lastHold && (!wsEntry || new Date(lastHold.at) > new Date(wsEntry.at)));
        if (isPaused || isWorkHeld) {
            return { kind: 'carryin-paused', sessions: wsEntries.length, totalMin: totalDone(tl), isHold: isWorkHeld && !isPaused, statusLabel: t.status || '' };
        } else if (wsEntry || t.visit_in) {
            return { kind: 'carryin-started', wsTime: wsEntry ? fmtIstTime(wsEntry.at) : (t.visit_in || ''), sessionNo: wsEntries.length, totalMin: totalDone(tl) };
        }
        return { kind: 'carryin-start' };
    }

    // On Site — find the single most recent event across Visit Start/Stop,
    // Work Start and Hold to decide state (matches HTML's evAll approach so
    // every additional round trip is fully cyclable, not just the first one).
    const vsEntries = tl.filter(e => e.action === 'Visit Start');
    const vsEntry = vsEntries.length ? vsEntries[vsEntries.length - 1] : null;
    const vsStops = tl.filter(e => e.action === 'Visit Stop');
    const wsEntries = tl.filter(e => e.action && e.action.includes('Work Start'));
    const wsEntry = wsEntries.length ? wsEntries[wsEntries.length - 1] : null;
    const holdEntries = tl.filter(e => e.action === 'Work on Hold');
    const evAll: { t: number; kind: string }[] = [];
    vsEntries.forEach((e: any) => { if (e?.at) evAll.push({ t: new Date(e.at).getTime(), kind: 'visitstart' }); });
    vsStops.forEach((e: any) => { if (e?.at) evAll.push({ t: new Date(e.at).getTime(), kind: 'visitstop' }); });
    wsEntries.forEach((e: any) => { if (e?.at) evAll.push({ t: new Date(e.at).getTime(), kind: 'workstart' }); });
    holdEntries.forEach((e: any) => { if (e?.at) evAll.push({ t: new Date(e.at).getTime(), kind: 'hold' }); });
    evAll.sort((a, b) => a.t - b.t);
    const lastKind = evAll.length ? evAll[evAll.length - 1].kind : null;
    const isStoppedState = lastKind === 'visitstop' || lastKind === 'hold';

    if (isPaused || isStoppedState) {
        const label = lastKind === 'hold' && !isPaused ? '⏸️ Work on Hold — Ready to resume'
            : (lastKind === 'visitstop' && !isPaused ? '🛑 Travel Stopped — Ready to restart' : '⏸️ Call Paused — ' + t.status);
        return { kind: 'onsite-paused', sessions: wsEntries.length, totalMin: totalDone(tl), label };
    } else if (lastKind === 'workstart' || (!lastKind && t.visit_in)) {
        return { kind: 'onsite-started', wsTime: wsEntry ? fmtIstTime(wsEntry.at) : (t.visit_in || ''), sessionNo: wsEntries.length };
    } else if (lastKind === 'visitstart') {
        const todayIso = new Date().toLocaleDateString('en-CA');
        const reachedToday = tl.some((e: any) => e?.action === 'Reached Location' && e.at && new Date(e.at).toLocaleDateString('en-CA') === todayIso);
        return { kind: 'onsite-visiting', vsTime: vsEntry ? fmtIstTime(vsEntry.at) : '', reachedToday };
    }
    return { kind: 'onsite-start' };
}

// Mirrors HTML's doWorkStart(): blocks on an already-OPEN work log (auto-closing
// it first if that log's own ticket has since closed/paused), stamps the ticket
// 'In Progress' with a new 'Work Started' timeline entry, closes any other OPEN
// log for today (e.g. the traveling log), and opens a new OPEN work log.
export const doWorkStart = async (
    ticket: VisitTicket, memberId: string, memberName: string, memberRole: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const now = new Date();
        const timeIn = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const dateIn = now.toLocaleDateString('en-CA');

        const { data: openLogs, error: olErr } = await supabase.from('work_logs').select('*')
            .eq('eng_id', memberId).eq('log_date', dateIn).eq('to_time', 'OPEN').eq('log_type', 'work');
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
                await supabase.from('work_logs').update({ to_time: timeIn }).eq('id', ol.id);
            } else {
                return { success: false, error: `A Work call is already in progress!\n\n"${ol.task_description}"\n\nPlease close that call first before starting this one.` };
            }
        }

        const sessionNo = (ticket.timeline || []).filter((e: any) => e.action && e.action.includes('Work Start')).length + 1;
        const tl = [...(ticket.timeline || []), { action: 'Work Started', by: memberName, at: now.toISOString(), note: `Session ${sessionNo}: Time In: ${timeIn}` }];
        const patch: any = { status: 'In Progress', timeline: tl, updated_at: now.toISOString() };
        if (!ticket.visit_in) { patch.visit_date = dateIn; patch.visit_in = timeIn; }
        await supabase.from('tickets').update(patch).eq('id', ticket.id);

        // Close any OPEN log (e.g. traveling) with the current time.
        const { data: prevLogs } = await supabase.from('work_logs').select('id')
            .eq('eng_id', memberId).eq('log_date', dateIn).eq('to_time', 'OPEN');
        if (prevLogs && prevLogs.length) {
            await supabase.from('work_logs').update({ to_time: timeIn }).eq('id', prevLogs[0].id);
        }

        const ticketLabel = (ticket.job_sheet || `#${ticket.id}`) + (ticket.cname ? ' — ' + ticket.cname : '') + (ticket.model ? ' | ' + ticket.model : '');
        await supabase.from('work_logs').insert([{
            eng_id: memberId, eng_name: memberName,
            member_role: memberRole === 'work_controller' ? 'WC' : 'Engineer',
            log_date: dateIn, from_time: timeIn, to_time: 'OPEN',
            task_description: `🔧 Work Start — ${ticketLabel}`,
            ticket_id: ticket.id, log_type: 'work', created_at: now.toISOString(),
        }]);

        // On Site: if Work Start happens without a same-day Reached Location for
        // this ticket, defer the arrival KM to the NEXT Visit Start (catch-up),
        // matching HTML's kmSkip_ localStorage flag — Work Start itself is never
        // blocked on it.
        if (ticket.service_type === 'On Site' && typeof window !== 'undefined') {
            try {
                const skipKey = `kmSkip_${memberId}_${dateIn}`;
                if (!window.localStorage.getItem(skipKey)) {
                    const { data: arrLogs } = await supabase.from('km_logs').select('id')
                        .eq('eng_id', memberId).eq('log_date', dateIn).eq('entry_type', 'arrival').eq('ticket_id', ticket.id);
                    if (!arrLogs || !arrLogs.length) window.localStorage.setItem(skipKey, ticket.id);
                }
            } catch { /* localStorage unavailable — non-fatal, matches HTML's own try/catch here */ }
        }

        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

// Mirrors HTML's doReachedLocation()'s post-KM-capture half: closes the open
// traveling log (travel ends at arrival, not at Work Start) and stamps a
// 'Reached Location' timeline entry, whether or not the KM photo was skipped.
export const recordReachedLocation = async (
    ticket: VisitTicket, memberId: string, memberName: string, skipped: boolean
): Promise<{ success: boolean; error?: string }> => {
    try {
        const now = new Date();
        const timeNow = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const dateNow = now.toLocaleDateString('en-CA');

        const { data: openLogs } = await supabase.from('work_logs').select('id')
            .eq('eng_id', memberId).eq('log_date', dateNow).eq('to_time', 'OPEN').eq('log_type', 'travel');
        for (const ol of (openLogs || [])) {
            await supabase.from('work_logs').update({ to_time: timeNow }).eq('id', ol.id);
        }

        const tl = [...(ticket.timeline || []), {
            action: 'Reached Location', by: memberName, at: now.toISOString(),
            note: skipped ? `Reached at ${timeNow} — KM skipped (next travel start ma karse)` : `Arrival KM recorded at ${timeNow}`,
        }];
        const { error } = await supabase.from('tickets').update({ timeline: tl, updated_at: now.toISOString() }).eq('id', ticket.id);
        if (error) throw error;

        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

// Mirrors HTML's doConfirmWorkHold(): closes any OPEN work log for this
// ticket (accumulating the session duration), logs a hold entry, and appends
// a 'Work on Hold' timeline entry (does NOT change ticket status).
export const doWorkHold = async (
    ticket: VisitTicket, memberId: string, memberName: string, remark: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const now = new Date();
        const nowTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const nowDate = now.toLocaleDateString('en-CA');

        const { data: openLogs } = await supabase.from('work_logs').select('*')
            .eq('eng_id', memberId).eq('log_date', nowDate).eq('to_time', 'OPEN').eq('ticket_id', ticket.id);
        let workDur = 0;
        for (const ol of (openLogs || [])) {
            if (ol.log_type === 'work' && ol.from_time) {
                const [fH, fM] = ol.from_time.split(':').map(Number);
                const [tH, tM] = nowTime.split(':').map(Number);
                const d = (tH * 60 + tM) - (fH * 60 + fM);
                if (d > 0) workDur += d;
            }
            await supabase.from('work_logs').update({ to_time: nowTime }).eq('id', ol.id);
        }

        const ticketLabel = (ticket.job_sheet || `#${ticket.id}`) + (ticket.cname ? ' — ' + ticket.cname : '');
        await supabase.from('work_logs').insert([{
            eng_id: memberId, eng_name: memberName, member_role: 'Engineer',
            log_date: nowDate, from_time: nowTime, to_time: nowTime,
            task_description: `⏸️ Work on Hold — ${ticketLabel} (${remark})`,
            ticket_id: ticket.id, log_type: 'work', created_at: now.toISOString(),
        }]);

        const tl = [...(ticket.timeline || []), {
            action: 'Work on Hold', by: memberName, at: now.toISOString(),
            note: remark + (workDur > 0 ? ` | Session: ${Math.floor(workDur / 60)}h ${workDur % 60}m` : ''),
        }];
        const { error } = await supabase.from('tickets').update({ timeline: tl, updated_at: now.toISOString() }).eq('id', ticket.id);
        if (error) throw error;

        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};