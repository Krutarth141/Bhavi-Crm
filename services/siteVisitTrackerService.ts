import { supabase } from '@/lib/supabase';
import { AutoSite, AutoSiteVisit, VisitTimelineEvent } from '@/types/autoSites';

export const parseTimeline = (v: AutoSiteVisit): VisitTimelineEvent[] => {
    if (!v.timeline) return [];
    if (typeof v.timeline === 'string') {
        try { return JSON.parse(v.timeline); } catch { return []; }
    }
    return Array.isArray(v.timeline) ? (v.timeline as any) : [];
};

export type VisitLastKind = 'visitstart' | 'workstart' | 'visitstop' | 'hold' | null;

export interface VisitState {
    tl: VisitTimelineEvent[];
    lastKind: VisitLastKind;
    lastAt: string | null;
    wsCount: number;
}

export const deriveVisitState = (v: AutoSiteVisit): VisitState => {
    const tl = parseTimeline(v);
    const evAll: { t: number; kind: Exclude<VisitLastKind, null>; at: string }[] = [];
    tl.forEach(e => {
        if (!e || !e.at) return;
        const kind: VisitLastKind = e.action === 'Visit Start' ? 'visitstart'
            : e.action === 'Visit Stop' ? 'visitstop'
                : e.action.includes('Work Start') ? 'workstart'
                    : e.action === 'Work on Hold' ? 'hold' : null;
        if (kind) evAll.push({ t: new Date(e.at).getTime(), kind, at: e.at });
    });
    evAll.sort((a, b) => a.t - b.t);
    const last = evAll.length ? evAll[evAll.length - 1] : null;
    const wsCount = tl.filter(e => e.action && e.action.includes('Work Start')).length;
    return { tl, lastKind: last ? last.kind : null, lastAt: last ? last.at : null, wsCount };
};

export const visitLabel = async (v: { site_id?: number | null; adhoc_client_name?: string; adhoc_area?: string; adhoc_label?: string }): Promise<string> => {
    if (v.site_id) {
        const { data } = await supabase.from('auto_sites').select('site_name, client_name').eq('id', v.site_id).maybeSingle();
        if (data) return `${data.site_name} — ${data.client_name}`;
        return `Site #${v.site_id}`;
    }
    const who = v.adhoc_client_name ? `${v.adhoc_client_name}${v.adhoc_area ? ' — ' + v.adhoc_area : ''}` : (v.adhoc_label || 'One-off Visit');
    return `🔧 ${who}`;
};

export const fetchActiveVisit = async (memberId: string): Promise<AutoSiteVisit | null> => {
    try {
        const { data, error } = await supabase.from('auto_site_visits').select('*')
            .eq('created_by', memberId).eq('visit_status', 'active')
            .order('created_at', { ascending: false }).limit(1);
        if (error) throw error;
        return data?.[0] || null;
    } catch { return null; }
};

export const fetchVisit = async (id: number): Promise<AutoSiteVisit | null> => {
    const { data } = await supabase.from('auto_site_visits').select('*').eq('id', id).maybeSingle();
    return data || null;
};

export const fetchSitesForPicker = async (): Promise<AutoSite[]> => {
    const { data } = await supabase.from('auto_sites').select('*').order('site_name');
    return data || [];
};

const closeOpenWorkLog = async (visitId: number, timeNow: string) => {
    const { data: openLogs } = await supabase.from('work_logs').select('id').eq('site_visit_id', visitId).eq('to_time', 'OPEN');
    for (const log of openLogs || []) {
        await supabase.from('work_logs').update({ to_time: timeNow }).eq('id', log.id).then(() => { }, () => { });
    }
};

const openWorkLog = async (visitId: number, label: string, kind: 'visit' | 'work', timeNow: string, dateNow: string, memberId: string, memberName: string, memberRole: string) => {
    const desc = kind === 'visit' ? `🚗 Traveling — ${label}` : `🔧 Work Start — ${label}`;
    await supabase.from('work_logs').insert([{
        eng_id: memberId, eng_name: memberName, member_role: memberRole,
        log_date: dateNow, from_time: timeNow, to_time: 'OPEN',
        task_description: desc, site_visit_id: visitId,
        log_type: kind === 'visit' ? 'travel' : 'work',
    }]).then(() => { }, () => { });
};

// Any log open today for this member blocks starting a new visit — same guard as the ticket On-Site flow.
export const checkOpenLogBlock = async (memberId: string): Promise<string | null> => {
    const dateNow = new Date().toLocaleDateString('en-CA');
    const { data } = await supabase.from('work_logs').select('task_description')
        .eq('eng_id', memberId).eq('log_date', dateNow).eq('to_time', 'OPEN');
    return data && data.length ? data[0].task_description : null;
};

export const startNewVisit = async (params: {
    kind: 'visit' | 'work';
    siteId: number | null;
    adhoc: { client: string; address: string; area: string; label: string } | null;
    date: string;
    memberId: string;
    memberName: string;
    memberRole: string;
}): Promise<{ success: boolean; id?: number; error?: string }> => {
    try {
        const now = new Date();
        const timeNow = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const action = params.kind === 'visit' ? 'Visit Start' : 'Work Started';
        const note = params.kind === 'visit' ? `Travel started: ${timeNow}` : `Session 1: Time In: ${timeNow}`;

        const { data: created, error } = await supabase.from('auto_site_visits').insert([{
            site_id: params.siteId,
            adhoc_label: params.adhoc?.label || null,
            adhoc_client_name: params.adhoc?.client || null,
            adhoc_address: params.adhoc?.address || null,
            adhoc_area: params.adhoc?.area || null,
            visit_date: params.date, visit_status: 'active',
            timeline: JSON.stringify([{ action, by: params.memberName, at: now.toISOString(), note }]),
            created_by: params.memberId, created_by_name: params.memberName,
        }]).select().single();
        if (error) throw error;

        const label = await visitLabel({ site_id: params.siteId, adhoc_client_name: params.adhoc?.client, adhoc_area: params.adhoc?.area, adhoc_label: params.adhoc?.label });
        await openWorkLog(created.id, label, params.kind, timeNow, params.date, params.memberId, params.memberName, params.memberRole);

        return { success: true, id: created.id };
    } catch (err) {
        return { success: false, error: (err as any).message };
    }
};

export const visitAction = async (visitId: number, kind: 'visit' | 'work' | 'stop', memberName: string, memberId: string, memberRole: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const v = await fetchVisit(visitId);
        if (!v) throw new Error('Visit not found');
        const now = new Date();
        const timeNow = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const dateNow = now.toLocaleDateString('en-CA');
        const st = deriveVisitState(v);
        const action = kind === 'visit' ? 'Visit Start' : kind === 'work' ? 'Work Started' : 'Visit Stop';
        const note = kind === 'visit' ? `Travel started: ${timeNow}` : kind === 'work' ? `Session ${st.wsCount + 1}: Time In: ${timeNow}` : `Travel stopped: ${timeNow}`;
        const tl = [...parseTimeline(v), { action, by: memberName, at: now.toISOString(), note }];

        await supabase.from('auto_site_visits').update({ timeline: JSON.stringify(tl) }).eq('id', visitId);
        await closeOpenWorkLog(visitId, timeNow);
        if (kind === 'visit' || kind === 'work') {
            const label = await visitLabel(v);
            await openWorkLog(visitId, label, kind, timeNow, dateNow, memberId, memberName, memberRole);
        }
        return { success: true };
    } catch (err) {
        return { success: false, error: (err as any).message };
    }
};

export const confirmHold = async (visitId: number, remark: string, memberName: string, memberId: string, memberRole: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const v = await fetchVisit(visitId);
        if (!v) throw new Error('Visit not found');
        const now = new Date();
        const timeNow = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const dateNow = now.toLocaleDateString('en-CA');
        const tl = [...parseTimeline(v), { action: 'Work on Hold', by: memberName, at: now.toISOString(), note: remark }];
        await supabase.from('auto_site_visits').update({ timeline: JSON.stringify(tl) }).eq('id', visitId);
        await closeOpenWorkLog(visitId, timeNow);
        const label = await visitLabel(v);
        await supabase.from('work_logs').insert([{
            eng_id: memberId, eng_name: memberName, member_role: memberRole,
            log_date: dateNow, from_time: timeNow, to_time: timeNow,
            task_description: `⏸️ Work on Hold — ${label} (${remark})`,
            site_visit_id: visitId, log_type: 'work',
        }]).then(() => { }, () => { });
        return { success: true };
    } catch (err) {
        return { success: false, error: (err as any).message };
    }
};

export const finishVisit = async (visitId: number, workDone: string, materialDelivered: string, photos: string[], memberName: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const v = await fetchVisit(visitId);
        if (!v) throw new Error('Visit not found');
        const now = new Date();
        const timeNow = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const tl = [...parseTimeline(v), { action: 'Visit Finished', by: memberName, at: now.toISOString(), note: `Completed: ${timeNow}` }];
        const patch: any = { timeline: JSON.stringify(tl), visit_status: 'completed', work_done: workDone || null, material_delivered: materialDelivered || null };
        if (photos.length) patch.photos = photos;
        await supabase.from('auto_site_visits').update(patch).eq('id', visitId);
        await closeOpenWorkLog(visitId, timeNow);
        return { success: true };
    } catch (err) {
        return { success: false, error: (err as any).message };
    }
};