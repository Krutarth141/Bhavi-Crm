import { supabase } from '@/lib/supabase';
import { PunchLog, ATT_EXCLUDED_IDS } from '@/types/attendance';
import * as XLSX from 'xlsx';

export const fetchPunchLogs = async (params: {
    from?: string;
    to?: string;
    empId?: string; // filters to one employee; for non-admins pass their own id
}): Promise<PunchLog[]> => {
    try {
        let query = supabase
            .from('punch_logs')
            .select('*')
            .order('punch_in_date', { ascending: false })
            .order('created_at', { ascending: false });
        if (params.from) query = query.gte('punch_in_date', params.from);
        if (params.to) query = query.lte('punch_in_date', params.to);
        if (params.empId) query = query.eq('eng_id', params.empId);
        const { data, error } = await query;
        if (error) throw error;
        // Office/reception logins never punch — drop historical rows too.
        return (data || []).filter((l: any) => !ATT_EXCLUDED_IDS.includes(l.eng_id));
    } catch (err) {
        console.error('Failed to fetch punch logs:', err);
        return [];
    }
};

// Active punchable employees — for the admin filter dropdown and roster mode.
// Pure admins (non-WC) don't punch; excluded like HTML does.
export const fetchAttendanceEmployees = async (): Promise<{ user_id: string; name: string; role: string; role_type?: string }[]> => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('user_id, name, role, role_type')
            .eq('is_active', true)
            .order('name');
        if (error) throw error;
        return (data || []).filter((u: any) =>
            !ATT_EXCLUDED_IDS.includes(u.user_id) &&
            !(u.role === 'admin' && u.role_type !== 'work_controller')
        );
    } catch (err) {
        console.error('Failed to fetch employees:', err);
        return [];
    }
};

export const verifyPunchLog = async (
    id: string,
    remark: string,
    verifiedBy: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('punch_logs')
            .update({
                status: 'verified',
                admin_remark: remark || 'OK',
                verified_by: verifiedBy,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        console.error('Failed to verify punch log:', err);
        return { success: false, error: (err as any).message };
    }
};

export const exportPunchLogsExcel = (logs: PunchLog[]): void => {
    const data = logs.map(l => ({
        'Engineer': l.eng_name,
        'Date': l.punch_in_date,
        'Punch In': l.punch_in_time || '—',
        'Punch Out': l.punch_out_time || '—',
        'Meter Start': l.start_meter || '—',
        'Meter End': l.end_meter || '—',
        'Status': l.status,
        'Remark': l.admin_remark || '',
        'Verified By': l.verified_by || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Punch Logs');
    XLSX.writeFile(wb, `punch_logs_${new Date().toLocaleDateString('en-CA')}.xlsx`);
};