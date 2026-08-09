import { useState, useEffect, useCallback } from 'react';
import { ApprovalTicket } from '@/types/customerApproval';
import { fetchPendingApprovals, approveTicket, rejectTicket, removeApprovalPart } from '@/services/customerApprovalService';

export const useCustomerApproval = () => {
    const [tickets, setTickets] = useState<ApprovalTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try { setTickets(await fetchPendingApprovals()); }
        catch (err) { setError((err as any).message); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const approve = async (
        ticket: ApprovalTicket,
        finalAmount: number,
        labour: number,
        remark: string,
        approvedBy: string
    ) => {
        const r = await approveTicket(ticket, finalAmount, labour, remark, approvedBy);
        if (r.success) await load();
        return r;
    };

    const reject = async (ticket: ApprovalTicket, remark: string, inspectionCharges: number, rejectedBy: string) => {
        const r = await rejectTicket(ticket, remark, inspectionCharges, rejectedBy);
        if (r.success) await load();
        return r;
    };

    const removePart = async (ticket: ApprovalTicket, idx: number, byUser: string) => {
        const r = await removeApprovalPart(ticket, idx, byUser);
        if (r.success) await load();
        return r;
    };

    return { tickets, loading, error, approve, reject, removePart, refetch: load };
};