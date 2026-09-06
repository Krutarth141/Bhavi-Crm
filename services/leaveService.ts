import { supabase } from '@/lib/supabase';
import { LeaveRequest, LeaveStatus } from '@/types/leave';

// No internal try/catch here — matches HTML's renderLeaveSection(), which lets
// any failure from these calls (e.g. leave_requests table missing) bubble up
// to its own outer try/catch so it can show a specific "table not created yet"
// message instead of a generic empty state.
export const fetchMyLeaves = async (engId: string): Promise<LeaveRequest[]> => {
    const { data, error } = await supabase.from('leave_requests').select('*')
        .eq('eng_id', engId).order('applied_at', { ascending: false }).limit(20);
    if (error) throw error;
    return data || [];
};

export const fetchPendingLeaves = async (): Promise<LeaveRequest[]> => {
    const { data, error } = await supabase.from('leave_requests').select('*')
        .eq('status', 'pending').order('applied_at', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const submitLeave = async (
    engId: string, engName: string, role: string, fromDate: string, toDate: string, reason: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        if (!fromDate || !toDate) return { success: false, error: 'From and To date are required.' };
        if (toDate < fromDate) return { success: false, error: 'To date cannot be before From date.' };
        if (!reason.trim()) return { success: false, error: 'Reason is required.' };
        const { error } = await supabase.from('leave_requests').insert([{
            eng_id: engId, eng_name: engName, role,
            from_date: fromDate, to_date: toDate, reason: reason.trim(),
            status: 'pending', applied_at: new Date().toISOString(),
        }]);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const reviewLeave = async (
    id: number, decision: LeaveStatus, reviewedBy: string, note: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('leave_requests').update({
            status: decision, review_note: note, reviewed_by: reviewedBy, reviewed_at: new Date().toISOString(),
        }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};