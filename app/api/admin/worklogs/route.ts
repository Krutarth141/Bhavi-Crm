import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth.config';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const engId = searchParams.get('engId');
        const mode = searchParams.get('mode');

        // Peon task logs are a completely different table/shape — matches
        // HTML's isPeonSel branch in loadWorkLogReport().
        if (mode === 'peon') {
            let pq = supabaseAdmin
                .from('peon_task_logs')
                .select('*')
                .order('log_date', { ascending: false })
                .order('done_at', { ascending: true });
            if (from) pq = pq.gte('log_date', from);
            if (to) pq = pq.lte('log_date', to);
            if (engId) pq = pq.eq('peon_id', engId);
            const { data: peonLogs, error: peonError } = await pq;
            if (peonError) {
                console.error('peon-task-logs query error:', peonError);
                return NextResponse.json({ error: peonError.message }, { status: 400 });
            }
            return NextResponse.json({ logs: peonLogs ?? [] }, { status: 200 });
        }

        let query = supabaseAdmin
            .from('work_logs')
            .select('*')
            .order('log_date', { ascending: false })
            .order('from_time', { ascending: true });

        if (from) query = query.gte('log_date', from);
        if (to) query = query.lte('log_date', to);
        if (engId) query = query.eq('eng_id', engId);

        const { data, error } = await query;

        if (error) {
            console.error('work-logs query error:', error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        const logs = data ?? [];

        // Enrich with area/service_type per ticket_id (matches HTML's per-entry
        // 📍 area badge / 📦 Carry In badge) — skips FT/SV-prefixed ids since
        // those aren't real tickets.
        const ticketIds = Array.from(new Set(
            logs.map((l: any) => l.ticket_id).filter((x: any) => x && !String(x).startsWith('FT') && !String(x).startsWith('SV'))
        ));
        if (ticketIds.length) {
            const { data: tix } = await supabaseAdmin.from('tickets').select('id, area, service_type').in('id', ticketIds);
            const tixMap: Record<string, { area?: string; service_type?: string }> = {};
            (tix ?? []).forEach((t: any) => { tixMap[t.id] = { area: t.area, service_type: t.service_type }; });
            logs.forEach((l: any) => {
                const info = l.ticket_id ? tixMap[l.ticket_id] : undefined;
                if (info) { l.area = info.area; l.service_type = info.service_type; }
            });

            // GPS at the moment the engineer closed the call (engineer_locations,
            // event_type='ticket_close') — link straight to the exact spot instead
            // of just the customer's area name.
            const { data: closeLoc } = await supabaseAdmin
                .from('engineer_locations')
                .select('ticket_id, lat, lng, accuracy, recorded_at')
                .eq('event_type', 'ticket_close')
                .in('ticket_id', ticketIds)
                .order('recorded_at', { ascending: false });
            const closeMap: Record<string, { lat: number; lng: number; accuracy?: number }> = {};
            (closeLoc ?? []).forEach((r: any) => {
                if (r.ticket_id && !closeMap[r.ticket_id] && r.lat && r.lng) {
                    closeMap[r.ticket_id] = { lat: r.lat, lng: r.lng, accuracy: r.accuracy };
                }
            });

            // GPS at arrival (km_logs, entry_type='arrival') — same spot as where
            // the Traveling entry for that call ends.
            const { data: arrivalLoc } = await supabaseAdmin
                .from('km_logs')
                .select('ticket_id, lat, lng, gps_accuracy, captured_at')
                .eq('entry_type', 'arrival')
                .in('ticket_id', ticketIds)
                .order('captured_at', { ascending: false });
            const arrivalMap: Record<string, { lat: number; lng: number; accuracy?: number }> = {};
            (arrivalLoc ?? []).forEach((r: any) => {
                if (r.ticket_id && !arrivalMap[r.ticket_id] && r.lat && r.lng) {
                    arrivalMap[r.ticket_id] = { lat: r.lat, lng: r.lng, accuracy: r.gps_accuracy };
                }
            });

            logs.forEach((l: any) => {
                const close = l.ticket_id ? closeMap[l.ticket_id] : undefined;
                if (close) { l.close_lat = close.lat; l.close_lng = close.lng; l.close_accuracy = close.accuracy; }
                const arrival = l.ticket_id ? arrivalMap[l.ticket_id] : undefined;
                if (arrival) { l.arrival_lat = arrival.lat; l.arrival_lng = arrival.lng; l.arrival_accuracy = arrival.accuracy; }
            });
        }

        return NextResponse.json({ logs }, { status: 200 });
    } catch (err) {
        console.error('work-logs route error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}