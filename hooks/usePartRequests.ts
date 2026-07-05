import { useState, useEffect, useCallback } from 'react';
import { PartRequest, PartRequestFilter } from '@/types/partRequest';
import { fetchPartRequests, approvePartRequest, rejectPartRequest } from '@/services/partRequestService';
import { useSession } from 'next-auth/react';

export const usePartRequests = (filter: PartRequestFilter = 'pending') => {
    const { data: session } = useSession();
    const userName = (session?.user as any)?.name ?? 'Admin';

    const [requests, setRequests] = useState<PartRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try { setRequests(await fetchPartRequests(filter)); }
        catch (err) { setError((err as any).message); }
        finally { setLoading(false); }
    }, [filter]);

    useEffect(() => { load(); }, [load]);

    const approve = async (req: PartRequest) => {
        const r = await approvePartRequest(req, userName);
        if (r.success) await load();
        return r;
    };

    const reject = async (id: string, reason?: string) => {
        const r = await rejectPartRequest(id, userName, reason);
        if (r.success) await load();
        return r;
    };

    const pending = requests.filter(r => r.status === 'pending').length;
    const approved = requests.filter(r => r.status === 'approved').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;

    return { requests, loading, error, pending, approved, rejected, approve, reject, refetch: load };
};