import { useState, useEffect, useCallback } from 'react';
import { EngineerTicket } from '@/types/engineerUpdate';
import { isTicketActive } from '@/types/ticketStatus';
import { fetchEngineerTickets, updateTicketStatus } from '@/services/engineerUpdateService';

export const useEngineerUpdate = (engineerName: string, statusFilter: 'active' | 'closed' | 'all') => {
    const [tickets, setTickets] = useState<EngineerTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try { setTickets(await fetchEngineerTickets(engineerName, statusFilter)); }
        catch (err) { setError((err as any).message); }
        finally { setLoading(false); }
    }, [engineerName, statusFilter]);

    useEffect(() => { load(); }, [load]);

    const update = async (
        ticket: EngineerTicket,
        newStatus: string,
        note: string,
        labour: string,
        updatedBy: string
    ) => {
        const r = await updateTicketStatus(ticket, newStatus, note, labour, updatedBy);
        if (r.success) await load();
        return r;
    };

    // Derived — matches Dashboard's canonical active/closed bucketing.
    const active = tickets.filter(t => isTicketActive(t.status)).length;
    const closed = tickets.filter(t => !isTicketActive(t.status)).length;

    return { tickets, loading, error, active, closed, update, refetch: load };
};