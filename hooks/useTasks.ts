import { useState, useEffect } from 'react';
import { Task, Engineer } from '@/types/tasks';
import { fetchAllTasks, fetchEngineers } from '@/services/taskService';

interface UseTasksProps {
    userRole?: string;
    userId?: string;
}

export const useTasks = ({ userRole, userId }: UseTasksProps = {}) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [engineers, setEngineers] = useState<Engineer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadTasks = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchAllTasks();
            setTasks(data);
        } catch (err) {
            const message = (err as any).message || 'Failed to load tasks';
            setError(message);
            console.error('Error loading tasks:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadEngineers = async () => {
        try {
            const data = await fetchEngineers();
            setEngineers(data);
        } catch (err) {
            console.error('Error loading engineers:', err);
        }
    };

    useEffect(() => {
        loadTasks();
        loadEngineers();
    }, [userRole, userId]);

    return {
        tasks,
        setTasks,
        engineers,
        loading,
        error,
        refetch: loadTasks,
        refreshEngineers: loadEngineers
    };
};
