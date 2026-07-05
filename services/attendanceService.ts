import { supabase } from '@/lib/supabase';
import { PunchLog } from '@/types/attendance';
import * as XLSX from 'xlsx';

export const fetchPunchLogs = async (): Promise<PunchLog[]> => {
    try {
        const { data, error } = await supabase
            .from('punch_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(500);
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Failed to fetch punch logs:', err);
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