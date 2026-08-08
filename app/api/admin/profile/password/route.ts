import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth.config';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { hashPassword, verifyPassword } from '@/lib/password';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { currentPassword, newPassword } = await request.json();
        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: 'Current and new password are required' }, { status: 400 });
        }
        if (newPassword.length < 4) {
            return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 });
        }

        const userId = (session.user as any).id;
        const { data: user, error: fetchError } = await supabaseAdmin
            .from('users').select('id, password').eq('id', userId).single();

        if (fetchError || !user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const matches = await verifyPassword(currentPassword, user.password);
        if (!matches) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });

        const hashed = await hashPassword(newPassword);
        const { error: updateError } = await supabaseAdmin.from('users').update({ password: hashed }).eq('id', userId);
        if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

        return NextResponse.json({ message: 'Password changed' }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}