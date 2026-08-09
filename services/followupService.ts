import { supabase } from '@/lib/supabase';
import { FollowupTicket } from '@/types/followup';

export const fetchFollowups = async (): Promise<FollowupTicket[]> => {
    try {
        const { data, error } = await supabase
            .from('tickets')
            .select('id, cname, mobile, model, problem, assigned_name, follow_up_date, follow_up_note, status')
            .not('follow_up_date', 'is', null)
            .neq('status', 'Closed')
            .order('follow_up_date', { ascending: true });
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchFollowups:', err); return []; }
};

export const markFollowupDone = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('tickets').update({ follow_up_date: null, follow_up_note: null, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const snoozeFollowup = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
        const newDate = tomorrow.toLocaleDateString('en-CA');
        const { error } = await supabase.from('tickets').update({ follow_up_date: newDate, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const setFollowup = async (id: string, date: string, note: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('tickets').update({ follow_up_date: date, follow_up_note: note || null, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

// Ticket search for the "Set Follow-up" picker — HTML's own setFollowUp() was
// never wired to a button anywhere, so the port adds a real entry point
// instead of shipping a screen that can never have data in it.
export const searchTicketsForFollowup = async (query: string): Promise<{ id: string; cname?: string; mobile?: string }[]> => {
    if (!query || query.length < 2) return [];
    try {
        const { data, error } = await supabase.from('tickets')
            .select('id, cname, mobile')
            .neq('status', 'Closed')
            .or(`id.ilike.%${query}%,cname.ilike.%${query}%,mobile.ilike.%${query}%`)
            .limit(8);
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('searchTicketsForFollowup:', err); return []; }
};