import { supabase } from '@/lib/supabase';
import { WorkLog } from '@/types/myCalls';
import { notifyPunchIn } from './telegramNotify';

// Punch in for the day. Blocks a second punch-in while one is already active,
// regardless of date (handles the case of not having punched out yesterday).
export const punchIn = async (params: {
    eng_id: string;
    eng_name: string;
    punch_in_date: string;
    punch_in_time: string;
    start_meter?: number;
    photo?: string | null;
    lat?: number | null;
    lng?: number | null;
}): Promise<{ success: boolean; error?: string }> => {
    try {
        const { eng_id, eng_name, punch_in_date, punch_in_time, start_meter, photo, lat, lng } = params;

        const { data: existing, error: fetchError } = await supabase
            .from('punch_logs')
            .select('id')
            .eq('eng_id', eng_id)
            .eq('status', 'active')
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (existing) {
            return { success: false, error: 'Already punched in.' };
        }

        const { error } = await supabase
            .from('punch_logs')
            .insert([{
                eng_id, eng_name, punch_in_date, punch_in_time, start_meter,
                status: 'active',
                punch_in_photo: photo || null,
                punch_in_lat: lat ?? null,
                punch_in_lng: lng ?? null,
            }]);

        if (error) throw error;
        notifyPunchIn(eng_name, punch_in_time);
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

// Punch out. Detects late (after 10PM / before 6AM) or next-day punch-outs and
// requires a mandatory reason for those, mirroring the HTML app's compliance
// flow — such punches land in status 'late_pending' for admin approval
// (already fully implemented on the admin side in PunchLogsTab.tsx).
export const punchOut = async (params: {
    eng_id: string;
    punch_out_time: string;
    end_meter?: number;
    photo?: string | null;
    lat?: number | null;
    lng?: number | null;
    lateRemark?: string;
}): Promise<{ success: boolean; error?: string; needsRemark?: boolean }> => {
    try {
        const { eng_id, punch_out_time, end_meter, photo, lat, lng, lateRemark } = params;

        const { data: active, error: fetchError } = await supabase
            .from('punch_logs')
            .select('*')
            .eq('eng_id', eng_id)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!active) return { success: false, error: 'No active punch-in found. Please Punch In first.' };

        const now = new Date();
        const today = now.toLocaleDateString('en-CA');
        const isNextDay = !!active.punch_in_date && active.punch_in_date !== today;
        const hour = now.getHours();
        const isLatePunchOut = hour >= 22 || hour < 6 || isNextDay;

        if (isLatePunchOut && !lateRemark?.trim()) {
            return {
                success: false,
                needsRemark: true,
                error: isNextDay
                    ? 'Next-day punch out — a reason is required (admin approval needed).'
                    : 'Late punch out (after 10 PM) — a reason is required (admin approval needed).',
            };
        }

        let workMins = 0;
        let otMins = 0;
        try {
            const { data: ss } = await supabase.from('shift_settings').select('*').eq('emp_id', eng_id).limit(1).maybeSingle();
            if (active.punch_in_time && punch_out_time) {
                const toMins = (t: string) => {
                    const isPM = /pm/i.test(t);
                    const isAM = /am/i.test(t);
                    const clean = t.replace(/[^0-9:]/g, '');
                    const [h0, m0] = clean.split(':').map((x) => parseInt(x, 10) || 0);
                    let h = h0;
                    if (isPM && h !== 12) h += 12;
                    if (isAM && h === 12) h = 0;
                    return h * 60 + m0;
                };
                const inM = toMins(active.punch_in_time);
                const outM = toMins(punch_out_time);
                workMins = outM - inM;
                if (workMins < 0) workMins += 1440;
                const shiftMins = ss ? toMins(ss.shift_end) - toMins(ss.shift_start) : 480;
                otMins = Math.max(0, workMins - shiftMins);
            }
        } catch { /* best-effort — working hours are informational, not blocking */ }

        const { error } = await supabase
            .from('punch_logs')
            .update({
                punch_out_time,
                punch_out_date: today,
                end_meter,
                status: isLatePunchOut ? 'late_pending' : 'verified',
                is_late: isLatePunchOut,
                late_remark: lateRemark || '',
                is_next_day: isNextDay,
                punch_out_photo: photo || null,
                punch_out_lat: lat ?? null,
                punch_out_lng: lng ?? null,
                working_minutes: workMins,
                overtime_minutes: otMins,
                updated_at: new Date().toISOString(),
            })
            .eq('id', active.id);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

// Save a work log entry.
export const saveWorkLog = async (
    entry: Omit<WorkLog, 'id' | 'created_at'>
): Promise<{ success: boolean; error?: string; data?: any }> => {
    try {
        const { data, error } = await supabase
            .from('work_logs')
            .insert([entry])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

// Delete a work log by id.
export const deleteWorkLog = async (
    id: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('work_logs')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};