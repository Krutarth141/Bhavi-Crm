import { supabase } from '@/lib/supabase';
import { CustomerFeedback } from '@/types/feedback';

export const fetchFeedback = async (): Promise<CustomerFeedback[]> => {
    try {
        const { data, error } = await supabase
            .from('customer_feedback')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Failed to fetch feedback:', err);
        return [];
    }
};

export const fetchFeedbackFiltered = async (params: { month?: string; engId?: string }): Promise<CustomerFeedback[]> => {
    try {
        let query = supabase.from('customer_feedback').select('*').order('created_at', { ascending: false });
        if (params.month) {
            const [y, m] = params.month.split('-').map(Number);
            const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
            query = query.gte('created_at', `${params.month}-01`).lt('created_at', `${nextMonth}-01`);
        }
        if (params.engId) query = query.eq('eng_id', params.engId);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Failed to fetch feedback:', err);
        return [];
    }
};

export interface FeedbackEngineerOption { user_id: string; name: string }

export const fetchFeedbackEngineers = async (): Promise<FeedbackEngineerOption[]> => {
    try {
        const { data, error } = await supabase.from('users').select('user_id, name').eq('role', 'engineer').eq('is_active', true).order('name');
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Failed to fetch engineers:', err);
        return [];
    }
};

export const fetchFeedbackByTicket = async (ticketId: string): Promise<CustomerFeedback | null> => {
    try {
        const { data, error } = await supabase.from('customer_feedback').select('*').eq('ticket_id', ticketId).limit(1);
        if (error) throw error;
        return data && data.length ? data[0] : null;
    } catch (err) {
        console.error('Failed to fetch feedback by ticket:', err);
        return null;
    }
};

export const submitFeedback = async (params: {
    ticketId: string; customerName: string; rating: number; comment: string;
}): Promise<{ success: boolean; error?: string }> => {
    try {
        const existing = await fetchFeedbackByTicket(params.ticketId);
        if (existing) {
            const { error } = await supabase.from('customer_feedback').update({
                customer_name: params.customerName, rating: params.rating, comment: params.comment,
            }).eq('ticket_id', params.ticketId);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('customer_feedback').insert([{
                ticket_id: params.ticketId, customer_name: params.customerName,
                rating: params.rating, comment: params.comment, created_at: new Date().toISOString(),
            }]);
            if (error) throw error;
        }
        return { success: true };
    } catch (err) {
        return { success: false, error: (err as any).message };
    }
};

export const buildFeedbackWhatsAppLink = (params: {
    ticketId: string; customerName: string; mobile: string; engineerName: string; companyName?: string; companyPhone?: string;
}): string => {
    const fbUrl = `${window.location.origin}/feedback/${params.ticketId}`;
    const msg = `Dear ${params.customerName},\n\n`
        + `Thank you for choosing *${params.companyName || 'Bhavi Electronics'}*! 🙏\n\n`
        + `Your service request has been completed by ${params.engineerName}.\n\n`
        + `We value your feedback! Please rate our service (1-5 stars):\n`
        + `${fbUrl}\n\n`
        + `Your feedback helps us serve you better.\n\n`
        + (params.companyPhone ? `📞 ${params.companyPhone}` : '');
    let mob = params.mobile.replace(/\D/g, '');
    if (mob.length === 10) mob = '91' + mob;
    return `https://wa.me/${mob}?text=${encodeURIComponent(msg)}`;
};