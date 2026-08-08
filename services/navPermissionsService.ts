import { supabase } from '@/lib/supabase';
import { NavPermissions } from '@/types/navPermissions';

export const fetchNavPermissions = async (): Promise<NavPermissions> => {
    const { data } = await supabase.from('company_info').select('nav_permissions').eq('id', 1).single();
    const perms = (data?.nav_permissions as NavPermissions) || { users: {} };
    if (!perms.users) perms.users = {};
    return perms;
};

export const saveNavPermissionsForUser = async (uid: string, perms: Record<string, boolean>): Promise<void> => {
    const current = await fetchNavPermissions();
    current.users[uid] = perms;
    const { error } = await supabase.from('company_info').upsert({ id: 1, nav_permissions: current, updated_at: new Date().toISOString() });
    if (error) throw error;
};

export const resetNavPermissionsForUser = async (uid: string): Promise<void> => {
    const current = await fetchNavPermissions();
    delete current.users[uid];
    const { error } = await supabase.from('company_info').upsert({ id: 1, nav_permissions: current, updated_at: new Date().toISOString() });
    if (error) throw error;
};