import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth.config';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            console.log('No session found');
            return NextResponse.json({ error: 'Unauthorized - No session' }, { status: 401 });
        }

        // Fetch all active engineers
        const { data: engineers, error } = await supabaseAdmin
            .from('users')
            .select('id, user_id, name, role_type')
            .eq('role_type', 'engineer')
            .eq('is_active', true)
            .order('name', { ascending: true });

        if (error) {
            console.error('Supabase error:', error);
            return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 400 });
        }

        return NextResponse.json({ engineers: engineers || [] }, { status: 200 });
    } catch (err) {
        console.error('Fetch engineers error:', err);
        return NextResponse.json({
            error: 'Internal server error',
            details: err instanceof Error ? err.message : String(err)
        }, { status: 500 });
    }
}
