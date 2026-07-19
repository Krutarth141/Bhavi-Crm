import { supabase } from '@/lib/supabase';
import { PunchLog, ATT_EXCLUDED_IDS } from '@/types/attendance';
import { EmployeeShift } from '@/types/settings';
import { computeAttExtras, computeWorkAndOvertime, fmtAttMin, to12h, PendingEdit } from '@/utils/attendanceCalc';
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

// Admin manual backfill — blocks if a row already exists for emp+date.
export const addAttendance = async (params: {
    empId: string; empName: string; date: string;
    inTime24: string; outTime24: string; remark: string;
    shift?: EmployeeShift;
}): Promise<{ success: boolean; error?: string }> => {
    try {
        const { data: existing } = await supabase.from('punch_logs').select('id')
            .eq('eng_id', params.empId).eq('punch_in_date', params.date).limit(1);
        if (existing && existing.length) {
            return { success: false, error: `A record already exists for ${params.empName} on ${params.date}. Use Edit instead.` };
        }
        const { working, overtime } = params.outTime24
            ? computeWorkAndOvertime(params.inTime24, params.outTime24, params.shift)
            : { working: 0, overtime: 0 };
        const { error } = await supabase.from('punch_logs').insert([{
            eng_id: params.empId,
            eng_name: params.empName,
            punch_in_time: to12h(params.inTime24),
            punch_in_date: params.date,
            punch_out_time: params.outTime24 ? to12h(params.outTime24) : null,
            punch_out_date: params.outTime24 ? params.date : null,
            status: params.outTime24 ? 'verified' : 'active',
            working_minutes: working, overtime_minutes: overtime,
            admin_remark: params.remark,
            punch_in_photo: null, punch_in_lat: null, punch_in_lng: null,
            punch_out_photo: null, punch_out_lat: null, punch_out_lng: null,
        }]);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: String(err) }; }
};

// Admin direct edit — recomputes minutes, marks verified, clears pending edit.
export const saveAttendanceEdit = async (log: PunchLog, inTime24: string, outTime24: string, remark: string, shift?: EmployeeShift): Promise<{ success: boolean; error?: string }> => {
    try {
        const newIn = inTime24 ? to12h(inTime24) : log.punch_in_time;
        const newOut = outTime24 ? to12h(outTime24) : log.punch_out_time;
        const { working, overtime } = computeWorkAndOvertime(newIn, newOut, shift);
        const { error } = await supabase.from('punch_logs').update({
            punch_in_time: newIn, punch_out_time: newOut,
            working_minutes: working, overtime_minutes: overtime,
            admin_remark: remark || 'Admin correction',
            status: 'verified', is_late: false,
            pending_edit: null, updated_at: new Date().toISOString(),
        }).eq('id', log.id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: String(err) }; }
};

// Employee edit request — stores the ask on the row for admin review.
export const submitAttEditRequest = async (logId: string, requestedBy: string, reason: string, inTime24: string, outTime24: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const pe: PendingEdit = {
            requested_by: requestedBy, reason, at: new Date().toISOString(),
            new_in: inTime24 ? to12h(inTime24) : '',
            new_out: outTime24 ? to12h(outTime24) : '',
        };
        const { error } = await supabase.from('punch_logs').update({ pending_edit: pe, updated_at: new Date().toISOString() }).eq('id', logId);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: String(err) }; }
};

export const approveAttEdit = async (log: PunchLog, pe: PendingEdit, shift?: EmployeeShift): Promise<{ success: boolean; error?: string }> => {
    try {
        const newIn = pe.new_in || log.punch_in_time;
        const newOut = pe.new_out || log.punch_out_time;
        const { working, overtime } = computeWorkAndOvertime(newIn, newOut, shift);
        const { error } = await supabase.from('punch_logs').update({
            punch_in_time: newIn, punch_out_time: newOut,
            working_minutes: working, overtime_minutes: overtime,
            status: 'verified', is_late: false, pending_edit: null,
            admin_remark: 'Approved: ' + pe.reason, updated_at: new Date().toISOString(),
        }).eq('id', log.id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: String(err) }; }
};

export const rejectAttEdit = async (logId: string, reason: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('punch_logs').update({
            pending_edit: null,
            admin_remark: 'Rejected: ' + (reason || 'No reason'),
            updated_at: new Date().toISOString(),
        }).eq('id', logId);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: String(err) }; }
};

// Full export — computed hour columns + GPS, matching downloadAttendanceExcel.
export const exportAttendanceExcel = (logs: PunchLog[], shiftMap: Record<string, EmployeeShift>): void => {
    if (!logs.length) { alert('Please search first'); return; }
    const fmtM = (m?: number) => (!m ? '-' : `${Math.floor(m / 60)}h ${m % 60}m`);
    const data = logs.map(l => {
        const extras = computeAttExtras(l, shiftMap);
        return {
            'Employee': l.eng_name, 'Date': l.punch_in_date,
            'Punch In': l.punch_in_time || '-', 'Punch Out': l.punch_out_time || '-',
            'Actual Work (incl. OT)': fmtM(l.working_minutes), 'Overtime': fmtM(l.overtime_minutes),
            'Office Hours': extras ? fmtAttMin(extras.officeMin) : '-',
            'Late/Early Punch': extras && extras.shortfall > 0 ? fmtAttMin(extras.shortfall) : '-',
            'Adjust Hours': extras && extras.adjustMin > 0 ? fmtAttMin(extras.adjustMin) : '-',
            'Start Meter': l.start_meter || '-', 'End Meter': l.end_meter || '-',
            'In Location': (l.punch_in_lat && l.punch_in_lng) ? `${l.punch_in_lat},${l.punch_in_lng}` : '-',
            'Out Location': (l.punch_out_lat && l.punch_out_lng) ? `${l.punch_out_lat},${l.punch_out_lng}` : '-',
            'Status': l.is_late ? 'Late' : l.status || '-',
        };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Attendance');
    XLSX.writeFile(wb, `attendance_report_${new Date().toLocaleDateString('en-CA')}.xlsx`);
};