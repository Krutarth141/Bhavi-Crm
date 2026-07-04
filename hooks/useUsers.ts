import { useState, useEffect, useCallback } from 'react';
import { AppUser, UserFormData } from '@/types/users';
import {
    fetchAllUsers,
    createUser,
    updateUser,
    toggleUserActive,
    deleteUser,
    changePassword,
} from '@/services/userService';

export const useUsers = () => {
    const [allUsers, setAllUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const users = await fetchAllUsers();
            setAllUsers(users);
        } catch (err: any) {
            setError(err.message || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadUsers(); }, [loadUsers]);

    // ── Derived ────────────────────────────────────────────────────────────────
    const engineers = allUsers.filter(u => u.role_type === 'engineer');
    const workControllers = allUsers.filter(u => u.role_type === 'work_controller');

    // ── Actions ────────────────────────────────────────────────────────────────

    const addUser = async (form: UserFormData): Promise<void> => {
        await createUser(form);
        await loadUsers();
    };

    const editUser = async (id: number, form: Partial<UserFormData>): Promise<void> => {
        await updateUser(id, form);
        await loadUsers();
    };

    const toggleActive = async (id: number, is_active: boolean): Promise<void> => {
        await toggleUserActive(id, is_active);
        await loadUsers();
    };

    const removeUser = async (id: number): Promise<void> => {
        await deleteUser(id);
        await loadUsers();
    };

    const updatePassword = async (id: number, password: string): Promise<void> => {
        await changePassword(id, password);
    };

    return {
        allUsers,
        engineers,
        workControllers,
        loading,
        error,
        loadUsers,
        addUser,
        editUser,
        toggleActive,
        removeUser,
        updatePassword,
    };
};