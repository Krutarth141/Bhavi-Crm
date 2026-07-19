import { supabase } from '@/lib/supabase';

export interface EngineerLiveStatusRow {
    name: string;
    statusLabel: string;
    statusColor: { bg: string; color: string };
    callInfo: string;
    area: string;
    since: string;
    locationUrl?: string;
    locationLabel?: string;
}

const CLOSED_TICKET_STATUSES = ['Closed', 'Customer Reject', 'Call Cancel', 'Delivered', 'Repaired', 'Pending for Delivery'];

export const fetchEngineerLiveStatus = async (): Promise<EngineerLiveStatusRow[]> => {
    const today = new Date().toLocaleDateString('en-CA');

    const [openLogsRes, engineersRes, allTodayLogsRes] = await Promise.all([
        supabase.from('work_logs').select('*').eq('log_date', today).eq('to_time', 'OPEN').order('from_time', { ascending: true }),
        supabase.from('users').select('*').eq('role', 'engineer').eq('is_active', true).order('name'),
        supabase.from('work_logs').select('*').eq('log_date', today).order('from_time', { ascending: false }).limit(500),
    ]);

    const openLogs = openLogsRes.data || [];
    const engineers = engineersRes.data || [];
    const allTodayLogs = allTodayLogsRes.data || [];

    const lastLogByEng: Record<string, any> = {};
    allTodayLogs.forEach((l: any) => { if (!lastLogByEng[l.eng_id]) lastLogByEng[l.eng_id] = l; });

    const ticketIds = [...new Set(openLogs.filter((l: any) => l.ticket_id).map((l: any) => l.ticket_id))];
    const ticketMap: Record<string, any> = {};
    if (ticketIds.length) {
        const { data: tks } = await supabase.from('tickets').select('id, cname, city, area, address, pin, model, problem, status').in('id', ticketIds);
        (tks || []).forEach((t: any) => { ticketMap[t.id] = t; });
    }

    const openByEng: Record<string, any> = {};
    for (const l of openLogs) {
        if (l.ticket_id && ticketMap[l.ticket_id] && CLOSED_TICKET_STATUSES.includes(ticketMap[l.ticket_id].status)) {
            // Stale log — ticket already closed, auto-close it silently.
            const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            supabase.from('work_logs').update({ to_time: nowTime }).eq('id', l.id).then(() => { });
        } else if (!openByEng[l.eng_id]) {
            openByEng[l.eng_id] = l;
        }
    }

    let latestLocByEng: Record<string, any> = {};
    try {
        const { data: locs } = await supabase.from('engineer_locations').select('*').eq('session_date', today).order('recorded_at', { ascending: false }).limit(500);
        (locs || []).forEach((l: any) => { if (l.eng_id && !latestLocByEng[l.eng_id]) latestLocByEng[l.eng_id] = l; });
    } catch {
        // engineer_locations may not exist / be reachable — non-fatal
    }

    return engineers.map((eng: any) => {
        const eid = eng.eng_id || eng.user_id;
        const ol = openByEng[eid];
        const ll = lastLogByEng[eid];
        const loc = latestLocByEng[eid];

        let statusLabel = '📴 Not Started';
        let statusColor = { bg: '#f3f4f6', color: '#9ca3af' };
        let callInfo = '-';
        let area = '-';

        if (ol) {
            if (ol.log_type === 'travel') { statusLabel = '🚗 Traveling'; statusColor = { bg: '#fef3c7', color: '#92400e' }; }
            else if (ol.log_type === 'work') { statusLabel = '🔧 On Site / Working'; statusColor = { bg: '#d1fae5', color: '#065f46' }; }
            else { statusLabel = '⚙️ Active'; statusColor = { bg: '#dbeafe', color: '#1e40af' }; }

            if (ol.ticket_id) {
                const tk = ticketMap[ol.ticket_id];
                callInfo = tk ? `${tk.id} — ${tk.cname || '-'} | ${tk.model || '-'}` : ol.ticket_id;
                area = tk ? [tk.area || tk.city, tk.pin].filter(Boolean).join(', ') || '-' : '-';
            } else {
                callInfo = ol.task_description || '-';
            }
        } else if (ll) {
            statusLabel = '💤 Free';
            statusColor = { bg: '#f3f4f6', color: '#6b7280' };
            callInfo = `Last: ${ll.task_description || '-'} (${ll.from_time || ''}${ll.to_time && ll.to_time !== 'OPEN' ? ' – ' + ll.to_time : ''})`;
        }

        let locationUrl: string | undefined;
        let locationLabel: string | undefined;
        if (loc) {
            const locTime = new Date(loc.recorded_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
            const minsAgo = Math.round((Date.now() - new Date(loc.recorded_at).getTime()) / 60000);
            const freshness = minsAgo <= 5 ? 'live' : `${minsAgo}m ago`;
            locationUrl = `https://maps.google.com/?q=${loc.lat},${loc.lng}`;
            locationLabel = `${locTime} (${freshness})${loc.accuracy ? ` ±${loc.accuracy}m` : ''}`;
        }

        return {
            name: eng.name, statusLabel, statusColor, callInfo, area,
            since: ol ? `Since ${ol.from_time}` : ll ? `Last: ${ll.from_time}` : '-',
            locationUrl, locationLabel,
        };
    });
};

export const fetchTodayInquiryFollowupCount = async (): Promise<{ count: number; names: string[] }> => {
    const today = new Date().toLocaleDateString('en-CA');
    try {
        const { data } = await supabase
            .from('auto_inquiries')
            .select('customer_name')
            .eq('followup_date', today)
            .neq('status', 'Converted')
            .neq('status', 'Lost');
        return { count: data?.length || 0, names: (data || []).map((i: any) => i.customer_name).filter(Boolean) };
    } catch {
        return { count: 0, names: [] };
    }
};