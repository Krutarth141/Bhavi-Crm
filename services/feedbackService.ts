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