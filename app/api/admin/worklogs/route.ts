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
        }

        return NextResponse.json({ logs }, { status: 200 });
    } catch (err) {
        console.error('work-logs route error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}