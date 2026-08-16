import { WorkLog, WorkLogMember, WorkLogFilters, PeonTaskLog } from '@/types/workLogs';

export async function fetchWorkLogMembers(): Promise<WorkLogMember[]> {
    const res = await fetch('/api/admin/worklogs/members');
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch members');
    }
    const data = await res.json();
    return data.members as WorkLogMember[];
}

export async function fetchWorkLogs(filters: WorkLogFilters): Promise<WorkLog[]> {
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.engId) params.set('engId', filters.engId);

    const res = await fetch(`/api/admin/worklogs?${params.toString()}`);
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch work logs');
    }
    const data = await res.json();
    return data.logs as WorkLog[];
}

export async function fetchPeonTaskLogs(filters: WorkLogFilters): Promise<PeonTaskLog[]> {
    const params = new URLSearchParams();
    params.set('mode', 'peon');
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.engId) params.set('engId', filters.engId);

    const res = await fetch(`/api/admin/worklogs?${params.toString()}`);
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch peon task logs');
    }
    const data = await res.json();
    return data.logs as PeonTaskLog[];
}