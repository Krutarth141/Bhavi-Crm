import { AppUser, UserFormData } from '@/types/users';

// ─── Fetch all users (admin only) ─────────────────────────────────────────────

export const fetchAllUsers = async (): Promise<AppUser[]> => {
    const res = await fetch('/api/admin/users', { credentials: 'include' });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch users');
    }
    const data = await res.json();
    return data.users || [];
};

// ─── Create user ──────────────────────────────────────────────────────────────

export const createUser = async (form: UserFormData): Promise<void> => {
    const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
            email: form.user_id,
            password: form.password,
            name: form.name,
            initials: form.initials || null,
            role: form.role_type === 'work_controller' ? 'admin' : 'engineer',
            role_type: form.role_type,
            eng_type: form.eng_type,
        }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create user');
    }
};

// ─── Update user ──────────────────────────────────────────────────────────────

export const updateUser = async (id: string, form: Partial<UserFormData>): Promise<void> => {
    const res = await fetch(`/api/admin/engineers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update user');
    }
};

// ─── Toggle active ────────────────────────────────────────────────────────────

export const toggleUserActive = async (id: string, is_active: boolean): Promise<void> => {
    await updateUser(id, { is_active });
};

// ─── Delete user ──────────────────────────────────────────────────────────────

export const deleteUser = async (id: string): Promise<void> => {
    const res = await fetch(`/api/admin/engineers/${id}`, {
        method: 'DELETE',
        credentials: 'include',
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete user');
    }
};

// ─── Change own password ──────────────────────────────────────────────────────

export const changePassword = async (id: string, password: string): Promise<void> => {
    await updateUser(id, { password } as any);
};