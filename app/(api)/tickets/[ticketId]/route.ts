import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth.config';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function PUT(
    request: NextRequest,
    { params }: { params: { ticketId: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const ticketId = params.ticketId;
        const body = await request.json();
        const userRole = (session.user as any).roleType;
        const userId = (session.user as any).id;

        // Fetch the ticket to check authorization
        const { data: ticket, error: fetchError } = await supabaseAdmin
            .from('tickets')
            .select('assigned_to, status')
            .eq('id', ticketId)
            .single();

        if (fetchError || !ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        // Authorization check
        if (userRole === 'engineer') {
            // Engineers can only update tickets assigned to them
            if (ticket.assigned_to !== userId) {
                return NextResponse.json({ error: 'You can only update tickets assigned to you' }, { status: 403 });
            }

            // Engineers cannot change the assigned_to field or certain fields
            const restrictedFields = ['assigned_to', 'assigned_name', 'call_type'];
            for (const field of restrictedFields) {
                if (body[field] !== undefined) {
                    return NextResponse.json({ error: `Engineers cannot modify ${field}` }, { status: 403 });
                }
            }
        }

        // Update the ticket
        const { error: updateError } = await supabaseAdmin
            .from('tickets')
            .update({ ...body, updated_at: new Date().toISOString() })
            .eq('id', ticketId);

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: 'Ticket updated successfully' }, { status: 200 });
    } catch (err) {
        console.error('Update ticket error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
