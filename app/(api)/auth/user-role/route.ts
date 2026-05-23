import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth.config';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('role, role_type')
      .eq('email', session.user.email)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      role: data.role,
      roleType: data.role_type,
      email: session.user.email,
    });
  } catch (err) {
    console.error('user-role error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}