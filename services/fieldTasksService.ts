import { supabase } from '@/lib/supabase';
import { FieldTask, FieldTaskFormData } from '@/types/fieldTasks';

export const fetchFieldTasks = async (userId: string, isAdminList: boolean): Promise<FieldTask[]> => {
    try {
        let q = supabase.from('field_tasks').select('*').order('created_at', { ascending: false });
        if (!isAdminList) q = q.or(`assigned_to.eq.${userId},created_by.eq.${userId}`);
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchFieldTasks:', err); return []; }
};

// Retries once without from_time/to_time if the columns don't exist yet on
// `field_tasks` (setup SQL not run) — mirrors HTML's _ftSave() wrapper.
async function ftSaveWithRetry(mode: 'insert' | 'update', payload: any, id?: number): Promise<void> {
    try {
        if (mode === 'update') {
            const { error } = await supabase.from('field_tasks').update(payload).eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('field_tasks').insert([payload]);
            if (error) throw error;
        }
    } catch (err: any) {
        const msg = String(err?.message || '');
        const touchesTime = payload.from_time !== undefined || payload.to_time !== undefined;
        if (touchesTime && (msg.indexOf('from_time') !== -1 || msg.indexOf('to_time') !== -1)) {
            const retry = { ...payload };
            delete retry.from_time;
            delete retry.to_time;
            if (mode === 'update') {
                const { error } = await supabase.from('field_tasks').update(retry).eq('id', id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('field_tasks').insert([retry]);
                if (error) throw error;
            }
        } else {
            throw err;
        }
    }
}

export const saveFieldTask = async (
    id: number | null, form: FieldTaskFormData, assignedName: string, createdBy: string, createdByName: string,
    creatorRole: 'WC' | 'Engineer' = 'Engineer'
): Promise<{ success: boolean; error?: string }> => {
    try {
        const now = new Date();
        const isOffice = form.task_type === 'Office Work';
        // Office Work is a simple real-time log, no travel/customer involved —
        // work type stands in for "customer_name" so card display needs no
        // special-casing.
        const payload: any = isOffice
            ? {
                task_type: form.task_type,
                customer_name: form.customer_name.trim(),
                notes: form.notes.trim() || null,
                from_time: form.from_time || null,
                to_time: form.to_time || null,
                assigned_to: form.assigned_to || null,
                assigned_name: form.assigned_to ? (assignedName || null) : null,
                updated_at: now.toISOString(),
            }
            : {
                task_type: form.task_type,
                customer_name: form.customer_name.trim(),
                mobile: form.mobile.trim() || null,
                amount: form.amount.trim() === '' ? null : parseFloat(form.amount),
                address: form.address.trim() || null,
                location: form.location.trim() || null,
                assigned_to: form.assigned_to || null,
                assigned_name: form.assigned_to ? (assignedName || null) : null,
                notes: form.notes.trim() || null,
                updated_at: now.toISOString(),
            };
        if (id) {
            await ftSaveWithRetry('update', payload, id);
        } else {
            payload.created_by = createdBy;
            payload.created_by_name = createdByName;
            payload.task_date = now.toLocaleDateString('en-CA');
            payload.created_at = now.toISOString();
            if (isOffice) {
                // Office Work has no travel lifecycle — submitting IS finishing it.
                payload.status = 'Done';
                payload.done_date = payload.task_date;
                payload.done_at = now.toISOString();
            } else {
                payload.status = 'Assigned';
            }
            await ftSaveWithRetry('insert', payload);
            // Time range given -> also drop it straight into Work Log, same as
            // any other time-tracked entry there.
            if (isOffice && payload.from_time && payload.to_time) {
                try {
                    await supabase.from('work_logs').insert({
                        eng_id: payload.assigned_to || createdBy,
                        eng_name: payload.assigned_name || createdByName,
                        member_role: creatorRole,
                        log_date: payload.task_date,
                        from_time: payload.from_time,
                        to_time: payload.to_time,
                        task_description: `🏢 Office Work — ${payload.customer_name}${payload.notes ? ` — ${payload.notes}` : ''}`,
                        ticket_id: null,
                        log_type: 'work',
                        created_at: now.toISOString(),
                    });
                } catch {
                    // best-effort — don't fail the task save if the work log insert fails
                }
            }
        }
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

// Mirrors HTML's _ftAutoWorkLog(): every Other Work lifecycle step (Travel
// Start / Reached / Done) also lands in Work Log with date/time and location,
// exactly like a call's Travel/Work Start does. Closes any still-open log for
// the day first, chaining travel -> work -> done. Best-effort — a failure
// here must never fail the lifecycle action itself.
async function ftAutoWorkLog(
    id: number, task: FieldTask | undefined, logType: 'travel' | 'work' | 'done', actionLabel: string,
    engId: string, engName: string, memberRole: string
): Promise<void> {
    try {
        const now = new Date();
        const dateNow = now.toLocaleDateString('en-CA');
        const timeNow = now.toTimeString().slice(0, 5);
        const loc = task?.address || task?.location;
        const label = `${task?.customer_name || 'Task'}${task?.task_type ? ' | ' + task.task_type : ''}${loc ? ' | 📍 ' + loc : ''}`;
        const { data: openLogs } = await supabase.from('work_logs').select('id').eq('eng_id', engId).eq('log_date', dateNow).eq('to_time', 'OPEN');
        for (const ol of (openLogs || [])) {
            await supabase.from('work_logs').update({ to_time: timeNow }).eq('id', ol.id);
        }
        await supabase.from('work_logs').insert({
            eng_id: engId, eng_name: engName, member_role: memberRole,
            log_date: dateNow, from_time: timeNow, to_time: logType === 'done' ? timeNow : 'OPEN',
            task_description: `${actionLabel} — ${label}`,
            ticket_id: `FT${id}`, log_type: logType === 'done' ? 'work' : logType, created_at: now.toISOString(),
        });
    } catch { /* best-effort */ }
}

export const ftTravelStart = async (
    id: number, engId: string, engName: string, memberRole: string, task?: FieldTask
): Promise<{ success: boolean; error?: string }> => {
    try {
        const now = new Date();
        const { error } = await supabase.from('field_tasks').update({ status: 'Traveling', travel_start_at: now.toISOString(), updated_at: now.toISOString() }).eq('id', id);
        if (error) throw error;
        await ftAutoWorkLog(id, task, 'travel', '🚗 Travel Start', engId, engName, memberRole);
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const ftReached = async (
    id: number, engId: string, engName: string, memberRole: string, task?: FieldTask
): Promise<{ success: boolean; error?: string }> => {
    try {
        const now = new Date();
        const { error } = await supabase.from('field_tasks').update({ status: 'Reached', reached_at: now.toISOString(), updated_at: now.toISOString() }).eq('id', id);
        if (error) throw error;
        await ftAutoWorkLog(id, task, 'work', '📍 Reached', engId, engName, memberRole);
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const ftDone = async (
    id: number, engId: string, engName: string, memberRole: string, task?: FieldTask
): Promise<{ success: boolean; error?: string }> => {
    try {
        const now = new Date();
        const { error } = await supabase.from('field_tasks').update({ status: 'Done', done_at: now.toISOString(), done_date: now.toLocaleDateString('en-CA'), updated_at: now.toISOString() }).eq('id', id);
        if (error) throw error;
        await ftAutoWorkLog(id, task, 'done', '✅ Task Done', engId, engName, memberRole);
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const ftCancel = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('field_tasks').update({ status: 'Cancelled', updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const ftDelete = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('field_tasks').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export interface FtReportRow { name: string; total: number; amount: number; types: Record<string, number>; }

export const fetchFtReport = async (from: string, to: string): Promise<FtReportRow[]> => {
    const { data, error } = await supabase.from('field_tasks').select('*').eq('status', 'Done').gte('done_date', from).lte('done_date', to);
    if (error) throw error;
    const byEng: Record<string, FtReportRow> = {};
    (data || []).forEach((t: any) => {
        const key = t.assigned_to || '—';
        if (!byEng[key]) byEng[key] = { name: t.assigned_name || key, total: 0, amount: 0, types: {} };
        byEng[key].total++;
        byEng[key].types[t.task_type || 'Other'] = (byEng[key].types[t.task_type || 'Other'] || 0) + 1;
        const a = parseFloat(t.amount);
        if (!isNaN(a)) byEng[key].amount += a;
    });
    return Object.values(byEng).sort((a, b) => b.total - a.total);
};