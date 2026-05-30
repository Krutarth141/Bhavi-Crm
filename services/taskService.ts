import { supabase } from '@/lib/supabase';
import { Task, Engineer } from '@/types/tasks';

export const fetchAllTasks = async (): Promise<Task[]> => {
    try {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Failed to fetch tasks:', err);
        return [];
    }
};

export const fetchEngineers = async (): Promise<Engineer[]> => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('eng_id, name')
            .eq('role', 'engineer')
            .eq('is_active', true)
            .order('name', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Failed to fetch engineers:', err);
        return [];
    }
};

export const generateTaskNo = async (): Promise<string> => {
    try {
        const year = new Date().getFullYear();
        const { data, error } = await supabase
            .from('tasks')
            .select('task_no')
            .like('task_no', `TSK-${year}%`)
            .order('task_no', { ascending: false })
            .limit(1);

        if (error) throw error;

        let num = 1;
        if (data && data.length > 0) {
            const lastNum = parseInt(data[0].task_no.split('-').pop() || '0');
            num = lastNum + 1;
        }

        return `TSK-${year}-${String(num).padStart(3, '0')}`;
    } catch (err) {
        console.error('Failed to generate task number:', err);
        throw err;
    }
};

export const createTask = async (
    taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; data?: Task; error?: string }> => {
    try {
        const { data, error } = await supabase
            .from('tasks')
            .insert([taskData])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (err) {
        console.error('Failed to create task:', err);
        return { success: false, error: (err as any).message };
    }
};

export const updateTask = async (
    id: string,
    updates: Partial<Task>
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('tasks')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        console.error('Failed to update task:', err);
        return { success: false, error: (err as any).message };
    }
};

export const deleteTask = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('tasks').delete().eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        console.error('Failed to delete task:', err);
        return { success: false, error: (err as any).message };
    }
};

export const closeTaskQuick = async (
    id: string,
    userName: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const task = (await supabase.from('tasks').select('timeline').eq('id', id).single()).data;

        const newTimeline = [
            ...(task?.timeline || []),
            {
                action: 'Closed',
                by: userName,
                at: new Date().toISOString()
            }
        ];

        const { error } = await supabase
            .from('tasks')
            .update({
                status: 'Closed',
                timeline: newTimeline,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        console.error('Failed to close task:', err);
        return { success: false, error: (err as any).message };
    }
};

export const updateTaskWithRemark = async (
    id: string,
    status: string,
    remark: string,
    userName: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const task = (await supabase.from('tasks').select('timeline').eq('id', id).single()).data;

        const newTimeline = [
            ...(task?.timeline || []),
            {
                action: `Update — ${status}`,
                by: userName,
                at: new Date().toISOString(),
                note: remark
            }
        ];

        const { error } = await supabase
            .from('tasks')
            .update({
                status,
                eng_remark: remark,
                timeline: newTimeline,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        console.error('Failed to update task with remark:', err);
        return { success: false, error: (err as any).message };
    }
};
