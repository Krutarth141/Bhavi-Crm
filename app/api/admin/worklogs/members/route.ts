import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth.config';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { WorkLogMember } from '@/types/workLogs';

export async function GET(_request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: engineers, error: engErr } = await supabaseAdmin
            .from('users')
            .select('user_id, name, role_type')
            .eq('role_type', 'engineer')
            .eq('is_active', true)
            .order('name', { ascending: true });

        if (engErr) {
            return NextResponse.json({ error: engErr.message }, { status: 400 });
        }

        const { data: wcs, error: wcErr } = await supabaseAdmin
            .from('users')
            .select('user_id, name, role_type')
            .eq('role_type', 'work_controller')
            .eq('is_active', true)
            .order('name', { ascending: true });

        if (wcErr) {
            return NextResponse.json({ error: wcErr.message }, { status: 400 });
        }

        const members: WorkLogMember[] = [
            ...(engineers ?? []).map((e) => ({
                id: e.user_id,
                name: e.name,
                role: 'Engineer' as const,
            })),
            ...(wcs ?? []).map((w) => ({
                id: w.user_id,
                name: w.name,
                role: 'WC' as const,
            })),
        ];

        return NextResponse.json({ members }, { status: 200 });
    } catch (err) {
        console.error('work-logs/members error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}