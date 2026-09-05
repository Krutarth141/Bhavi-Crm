import { useState, useEffect, useCallback } from 'react';
import { PartRequest } from '@/types/partRequest';
import { fetchPartRequests, approvePartRequest, rejectPartRequest } from '@/services/partRequestService';
import { useSession } from 'next-auth/react';

// Mirrors HTML's renderEPPending(typeFilter) — always PENDING-only, so there
// is no status filter here (index.html:10148,10160,11255-11262).
export const usePartRequests = (typeFilter?: 'RETURN') => {
    const { data: session } = useSession();
    const userName = (session?.user as any)?.name ?? 'Admin';

    const [requests, setRequests] = useState<PartRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try { setRequests(await fetchPartRequests(typeFilter)); }
        catch (err) { setError((err as any).message); }
        finally { setLoading(false); }
    }, [typeFilter]);

    useEffect(() => { load(); }, [load]);

    const approve = async (req: PartRequest) => {
        const r = await approvePartRequest(req, userName);
        if (r.success) await load();
        return r;
    };

    const reject = async (id: string) => {
        const r = await rejectPartRequest(id, userName);
        if (r.success) await load();
        return r;
    };

    return { requests, loading, error, approve, reject, refetch: load };
};