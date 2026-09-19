import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth.config';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { hashPassword } from '@/lib/password';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if ((session.user as any).role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Fetch all users
        const { data: users, error } = await supabaseAdmin
            .from('users')
            .select('id, user_id, name, role, role_type, is_active, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ users: users || [] }, { status: 200 });
    } catch (err) {
        console.error('Fetch users error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await request.json();
        const { email, password, name, initials, role, role_type, eng_type, require_meter_photo } = body;
        const user_id = email;

        if (!user_id || !name || !password) {
            return NextResponse.json({ error: 'user_id, name and password are required' }, { status: 400 });
        }

        const { data: existing } = await supabaseAdmin
            .from('users').select('id').eq('user_id', user_id).maybeSingle();
        if (existing) return NextResponse.json({ error: 'A user with this ID already exists' }, { status: 409 });

        const hashedPassword = await hashPassword(password);
        const isEngineer = role_type === 'engineer';

        const { data, error } = await supabaseAdmin
            .from('users')
            .insert([{
                user_id,
                password: hashedPassword,
                name,
                initials: initials || name.split(' ').map((x: string) => x[0]).join('').toUpperCase(),
                eng_id: isEngineer ? user_id : null,
                role: role || (role_type === 'work_controller' ? 'admin' : 'engineer'),
                role_type,
                eng_type: isEngineer ? (eng_type || 'carryin') : null,
                require_meter_photo: isEngineer && eng_type === 'onsite' ? (require_meter_photo ?? true) : false,
                is_active: true,
            }])
            .select().single();

        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json({ message: 'User created', user: data }, { status: 201 });
    } catch (err) {
        console.error('Create user error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}