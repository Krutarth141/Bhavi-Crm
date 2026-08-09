import { supabase } from '@/lib/supabase';
import { AutoInquiry, InquiryFormData } from '@/types/inquiries';

export const fetchInquiries = async (userId: string, isAdmin: boolean): Promise<AutoInquiry[]> => {
    try {
        let q = supabase.from('auto_inquiries').select('*').order('created_at', { ascending: false });
        if (!isAdmin) q = q.or(`created_by.eq.${userId},assigned_to.eq.${userId}`);
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchInquiries:', err); return []; }
};

export const createInquiry = async (
    form: InquiryFormData, createdBy: string, createdByName: string, assignedName: string
): Promise<{ success: boolean; error?: string; inquiry?: AutoInquiry }> => {
    try {
        const { data, error } = await supabase.from('auto_inquiries').insert([{
            customer_name: form.customer_name.trim(),
            mobile: form.mobile.trim(),
            address: form.address.trim() || null,
            location: form.location.trim() || null,
            inquiry_type: form.inquiry_type || 'Other',
            description: form.description.trim() || null,
            followup_date: form.followup_date || null,
            status: 'Open',
            created_by: createdBy,
            created_by_name: createdByName,
            assigned_to: form.assigned_to || null,
            assigned_name: form.assigned_to ? (assignedName || null) : null,
            updated_at: new Date().toISOString(),
        }]).select().single();
        if (error) throw error;
        return { success: true, inquiry: data };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const updateInquiry = async (
    id: number, form: InquiryFormData, assignedName: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('auto_inquiries').update({
            customer_name: form.customer_name.trim(),
            mobile: form.mobile.trim(),
            address: form.address.trim() || null,
            inquiry_type: form.inquiry_type || 'Other',
            description: form.description.trim() || null,
            assigned_to: form.assigned_to || null,
            assigned_name: form.assigned_to ? (assignedName || null) : null,
            updated_at: new Date().toISOString(),
        }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const deleteInquiry = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('auto_inquiries').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

// Appends a timestamped history entry (matches HTML's notes format) rather
// than overwriting — status/followup are still overwritten (current state).
export const updateInquiryProgress = async (
    id: number, existingNotes: string, status: string, followupDate: string | null, remark: string, byName: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        let newNotes = existingNotes;
        if (remark.trim()) {
            const ts = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            const entry = `[${ts}] [${byName}]: ${remark.trim()}`;
            newNotes = existingNotes ? `${existingNotes}\n${entry}` : entry;
        }
        const { error } = await supabase.from('auto_inquiries').update({
            status, followup_date: followupDate || null, notes: newNotes || null, updated_at: new Date().toISOString(),
        }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};