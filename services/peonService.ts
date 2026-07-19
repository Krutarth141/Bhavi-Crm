import { supabase } from '@/lib/supabase';
import { PeonTask, PeonTaskLog, PeonTaskConfig, PEON_TASKS } from '@/types/peon';

// ─── Peon's own dashboard ──────────────────────────────────────────────────────

export const fetchTodayPeonData = async (peonId: string, date: string) => {
    const [logsRes, cfgRes] = await Promise.all([
        supabase.from('peon_task_logs').select('*').eq('peon_id', peonId).eq('log_date', date).order('done_at', { ascending: true }),
        supabase.from('peon_task_config').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
    ]);
    return { logs: (logsRes.data || []) as PeonTaskLog[], config: (cfgRes.data || []) as PeonTaskConfig[] };
};

export const fetchActivePeonTaskConfig = async (): Promise<PeonTaskConfig[]> => {
    const { data } = await supabase.from('peon_task_config').select('*').eq('is_active', true).order('sort_order', { ascending: true });
    return data || [];
};

export const buildTaskList = (config: PeonTaskConfig[]): PeonTask[] => {
    const stdIds = PEON_TASKS.map(t => t.id);
    const customTasks: PeonTask[] = config
        .filter(c => c.is_custom && !stdIds.includes(c.task_id))
        .map(c => ({ id: c.task_id, label: c.task_label || '', glabel: c.task_glabel || '', icon: c.task_icon || '📋', customDbId: c.id }));

    const sortMap: Record<string, number> = {};
    config.forEach(c => { sortMap[c.task_id] = c.sort_order != null ? c.sort_order : 999; });

    return [...PEON_TASKS, ...customTasks].sort((a, b) => {
        const sa = sortMap[a.id] != null ? sortMap[a.id] : PEON_TASKS.findIndex(t => t.id === a.id);
        const sb = sortMap[b.id] != null ? sortMap[b.id] : PEON_TASKS.findIndex(t => t.id === b.id);
        return sa - sb;
    });
};

export const toggleTaskDone = async (peonId: string, peonName: string, date: string, taskId: string, taskLabel: string, doneTime?: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { data: existing } = await supabase.from('peon_task_logs').select('id').eq('peon_id', peonId).eq('log_date', date).eq('task_name', taskId);
        if (existing && existing.length > 0) {
            const { error } = await supabase.from('peon_task_logs').delete().eq('id', existing[0].id);
            if (error) throw error;
        } else {
            const doneAt = new Date();
            if (doneTime) {
                const [h, m] = doneTime.split(':');
                doneAt.setHours(Number(h), Number(m), 0, 0);
            }
            const { error } = await supabase.from('peon_task_logs').insert([{ peon_id: peonId, peon_name: peonName, log_date: date, task_name: taskId, task_label: taskLabel, done_at: doneAt.toISOString() }]);
            if (error) throw error;
        }
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

export const saveExtraWork = async (peonId: string, peonName: string, date: string, note: string, from: string, to: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('peon_task_logs').insert([{
            peon_id: peonId, peon_name: peonName, log_date: date, task_name: `extra_${Date.now()}`,
            task_label: note, extra_from: from || null, extra_to: to || null, done_at: new Date().toISOString(),
        }]);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

export const deleteExtraWork = async (id: string): Promise<void> => {
    const { error } = await supabase.from('peon_task_logs').delete().eq('id', id);
    if (error) throw error;
};

// ─── Punch in/out (peon-specific — simple, no selfie/GPS) ─────────────────────

export const fetchPeonPunchStatus = async (peonId: string, date: string) => {
    const { data } = await supabase.from('punch_logs').select('*').eq('eng_id', peonId).eq('punch_in_date', date).eq('status', 'active').limit(1);
    return data && data.length > 0 ? data[0] : null;
};

export const peonPunchIn = async (peonId: string, peonName: string, date: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const punchInTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const { error } = await supabase.from('punch_logs').insert([{ eng_id: peonId, eng_name: peonName, punch_in_date: date, punch_in_time: punchInTime, status: 'active' }]);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

export const peonPunchOut = async (punchLogId: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const punchOutTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const { error } = await supabase.from('punch_logs').update({ status: 'completed', punch_out_time: punchOutTime }).eq('id', punchLogId);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

// ─── Admin: Peon Activity view ─────────────────────────────────────────────────

export const fetchPeonUsers = async () => {
    const { data } = await supabase.from('users').select('*').eq('role', 'peon').eq('is_active', true).order('name');
    return data || [];
};

export const fetchPeonActivityForDate = async (date: string) => {
    const peonUsers = await fetchPeonUsers();
    const peonIds = peonUsers.map((u: any) => u.user_id);
    if (!peonIds.length) return { peonUsers: [] as any[], logsByPeon: {} as Record<string, PeonTaskLog[]>, punchByPeon: {} as Record<string, any> };

    const [logsRes, punchesRes] = await Promise.all([
        supabase.from('peon_task_logs').select('*').eq('log_date', date).in('peon_id', peonIds).order('done_at', { ascending: true }),
        supabase.from('punch_logs').select('*').eq('punch_in_date', date).in('eng_id', peonIds).order('punch_in_time', { ascending: true }),
    ]);

    const logsByPeon: Record<string, PeonTaskLog[]> = {};
    peonIds.forEach((id: string) => { logsByPeon[id] = []; });
    (logsRes.data || []).forEach((l: any) => { if (logsByPeon[l.peon_id]) logsByPeon[l.peon_id].push(l); });

    const punchByPeon: Record<string, any> = {};
    (punchesRes.data || []).forEach((p: any) => { punchByPeon[p.eng_id] = p; });

    return { peonUsers, logsByPeon, punchByPeon };
};

export const savePeonTaskTime = async (taskId: string, taskLabel: string, icon: string, timeVal: string): Promise<void> => {
    const { data: existing } = await supabase.from('peon_task_config').select('id').eq('task_id', taskId);
    if (existing && existing.length > 0) {
        await supabase.from('peon_task_config').update({ scheduled_time: timeVal || null }).eq('task_id', taskId);
    } else {
        await supabase.from('peon_task_config').insert([{ task_id: taskId, task_label: taskLabel, task_icon: icon, scheduled_time: timeVal || null, is_custom: false, sort_order: 99, is_active: true }]);
    }
};

export const swapPeonTaskOrder = async (a: { id: string; label: string; icon: string }, b: { id: string; label: string; icon: string }, aNewSort: number, bNewSort: number): Promise<void> => {
    const upsert = async (t: { id: string; label: string; icon: string }, sort: number) => {
        const { data: existing } = await supabase.from('peon_task_config').select('id').eq('task_id', t.id);
        if (existing && existing.length > 0) {
            await supabase.from('peon_task_config').update({ sort_order: sort }).eq('task_id', t.id);
        } else {
            await supabase.from('peon_task_config').insert([{ task_id: t.id, task_label: t.label, task_icon: t.icon || '📋', sort_order: sort, is_custom: false, is_active: true }]);
        }
    };
    await upsert(a, aNewSort);
    await upsert(b, bNewSort);
};

export const saveTaskEdit = async (dbId: string | undefined, taskId: string, label: string, glabel: string, icon: string): Promise<void> => {
    if (dbId) {
        await supabase.from('peon_task_config').update({ task_label: label, task_glabel: glabel || null, task_icon: icon }).eq('id', dbId);
        return;
    }
    const { data: existing } = await supabase.from('peon_task_config').select('id').eq('task_id', taskId);
    if (existing && existing.length > 0) {
        await supabase.from('peon_task_config').update({ task_glabel: glabel || null, task_icon: icon }).eq('task_id', taskId);
    } else {
        await supabase.from('peon_task_config').insert([{ task_id: taskId, task_label: label, task_glabel: glabel || null, task_icon: icon, is_custom: false, is_active: true, sort_order: 99 }]);
    }
};

export const addCustomTask = async (label: string, glabel: string, icon: string, scheduledTime: string): Promise<void> => {
    const taskId = `custom_${Date.now()}`;
    const { error } = await supabase.from('peon_task_config').insert([{ task_id: taskId, task_label: label, task_glabel: glabel || null, task_icon: icon, scheduled_time: scheduledTime || null, is_custom: true, sort_order: 99, is_active: true }]);
    if (error) throw error;
};

export const deactivateCustomTask = async (dbId: string): Promise<void> => {
    const { error } = await supabase.from('peon_task_config').update({ is_active: false }).eq('id', dbId);
    if (error) throw error;
};