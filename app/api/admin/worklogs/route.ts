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

        return NextResponse.json({ logs: data ?? [] }, { status: 200 });
    } catch (err) {
        console.error('work-logs route error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}