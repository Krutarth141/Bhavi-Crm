import { supabase } from '@/lib/supabase';
import { Ticket } from '@/types/reports';

export async function fetchAllTickets(): Promise<Ticket[]> {
    const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}