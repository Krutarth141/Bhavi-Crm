import { supabase } from '@/lib/supabase';
import { AutoInquiry, InquiryFormData } from '@/types/inquiries';

export const fetchInquiries = async (): Promise<AutoInquiry[]> => {
    try {
        const { data, error } = await supabase
            .from('auto_inquiries')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchInquiries:', err); return []; }
};

export const createInquiry = async (form: InquiryFormData, createdBy: string, createdByName: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('auto_inquiries').insert([{
            customer_name: form.customer_name.trim(),
            mobile: form.mobile.trim() || null,
            address: form.address.trim() || null,
            inquiry_type: form.inquiry_type || null,
            description: form.description.trim() || null,
            followup_date: form.followup_date || null,
            notes: form.notes.trim() || null,
            status: 'open',
            created_by: createdBy,
            created_by_name: createdByName,
            updated_at: new Date().toISOString(),
        }]);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const updateInquiryStatus = async (id: number, status: string, notes?: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('auto_inquiries').update({
            status,
            notes: notes || undefined,
            updated_at: new Date().toISOString(),
        }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};