import { useState, useEffect, useCallback } from 'react';
import { AutoInquiry, InquiryFormData } from '@/types/inquiries';
import { fetchInquiries, createInquiry, updateInquiry, deleteInquiry, updateInquiryProgress } from '@/services/inquiriesService';

export const useInquiries = (userId: string, isAdmin: boolean) => {
    const [inquiries, setInquiries] = useState<AutoInquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!userId) return;
        setLoading(true); setError(null);
        try { setInquiries(await fetchInquiries(userId, isAdmin)); }
        catch (err) { setError((err as any).message); }
        finally { setLoading(false); }
    }, [userId, isAdmin]);

    useEffect(() => { load(); }, [load]);

    const add = async (form: InquiryFormData, createdBy: string, createdByName: string, assignedName: string) => {
        const r = await createInquiry(form, createdBy, createdByName, assignedName);
        if (r.success) await load();
        return r;
    };

    const edit = async (id: number, form: InquiryFormData, assignedName: string) => {
        const r = await updateInquiry(id, form, assignedName);
        if (r.success) await load();
        return r;
    };

    const remove = async (id: number) => {
        const r = await deleteInquiry(id);
        if (r.success) await load();
        return r;
    };

    const progress = async (id: number, existingNotes: string, status: string, followupDate: string | null, remark: string, byName: string) => {
        const r = await updateInquiryProgress(id, existingNotes, status, followupDate, remark, byName);
        if (r.success) await load();
        return r;
    };

    return { inquiries, loading, error, add, edit, remove, progress, refetch: load };
};