import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth.config';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { hashPassword } from '@/lib/password';

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const isAdmin = (session.user as any).role === 'admin';

        let query = supabaseAdmin
            .from('users')
            .select('id, user_id, name, role, role_type, initials, eng_id, eng_type, require_meter_photo, is_active, created_at')
            .eq('role_type', 'engineer')
            .order('name', { ascending: true });

        if (!isAdmin) query = query.eq('is_active', true);

        const { data: engineers, error } = await query;
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });

        return NextResponse.json({ engineers: engineers || [] }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// ─── POST — create engineer ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await request.json();
        const { user_id, password, name, initials, eng_type, require_meter_photo, is_active } = body;

        if (!user_id || !name || !password) {
            return NextResponse.json({ error: 'user_id, name and password are required' }, { status: 400 });
        }

        // Check duplicate
        const { data: existing } = await supabaseAdmin
            .from('users').select('id').eq('user_id', user_id).maybeSingle();
        if (existing) return NextResponse.json({ error: 'Engineer with this ID already exists' }, { status: 409 });

        const hashedPassword = await hashPassword(password);

        const { data, error } = await supabaseAdmin
            .from('users')
            .insert([{
                user_id,
                password: hashedPassword,
                name,
                initials: initials || name.split(' ').map((x: string) => x[0]).join('').toUpperCase(),
                eng_id: user_id,
                role: 'engineer',
                role_type: 'engineer',
                eng_type: eng_type || 'carryin',           // carryin | onsite
                require_meter_photo: eng_type === 'onsite' ? (require_meter_photo ?? true) : false,
                is_active: is_active ?? true,
            }])
            .select().single();

        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json({ message: 'Engineer created', engineer: data }, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}