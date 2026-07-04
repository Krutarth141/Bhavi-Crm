import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth.config';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { hashPassword } from '@/lib/password';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { id } = await params;
        if (!id) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

        const body = await request.json();
        const { password, eng_type, require_meter_photo, ...rest } = body;

        const updatePayload: any = { ...rest };
        if (password && password.trim()) updatePayload.password = await hashPassword(password);

        // Map visit_type → eng_type if frontend sends old field name
        if (eng_type !== undefined) {
            updatePayload.eng_type = eng_type;
            updatePayload.require_meter_photo = eng_type === 'onsite' ? (require_meter_photo ?? true) : false;
        }
        if (body.visit_type !== undefined) {
            updatePayload.eng_type = body.visit_type === 'on_site' ? 'onsite' : 'carryin';
        }

        const { error } = await supabaseAdmin
            .from('users').update(updatePayload).eq('id', id).eq('role_type', 'engineer');

        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json({ message: 'Engineer updated' }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { id } = await params;
        if (!id) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

        const { error } = await supabaseAdmin
            .from('users').delete().eq('id', id).eq('role_type', 'engineer');

        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json({ message: 'Engineer deleted' }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}   