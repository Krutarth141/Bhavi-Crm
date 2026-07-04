// ─── Exact Supabase schema ────────────────────────────────────────────────────
// users: id, user_id, name, role, role_type, initials, eng_id,
//        eng_type, require_meter_photo, is_active, created_at

export type RoleType = 'engineer' | 'work_controller' | 'admin';
export type EngType = 'carryin' | 'onsite';

export interface AppUser {
    id: number;
    user_id: string;
    name: string;
    role: string;
    role_type: RoleType;
    initials?: string;
    eng_id?: string;
    eng_type?: EngType;
    require_meter_photo?: boolean;
    is_active: boolean;
    created_at: string;
}

export interface UserFormData {
    user_id: string;
    name: string;
    initials: string;
    password: string;
    role_type: RoleType;
    eng_type: EngType;
    is_active: boolean;
}

export const emptyUserForm: UserFormData = {
    user_id: '',
    name: '',
    initials: '',
    password: '',
    role_type: 'engineer',
    eng_type: 'carryin',
    is_active: true,
};