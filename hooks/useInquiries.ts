import { useState, useEffect } from 'react';
import { AutoInquiry, InquiryFormData } from '@/types/inquiries';
import { fetchInquiries, createInquiry, updateInquiryStatus } from '@/services/inquiriesService';

export const useInquiries = () => {
    const [inquiries, setInquiries] = useState<AutoInquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true); setError(null);
        try { setInquiries(await fetchInquiries()); }
        catch (err) { setError((err as any).message); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const add = async (form: InquiryFormData, createdBy: string, createdByName: string) => {
        const r = await createInquiry(form, createdBy, createdByName);
        if (r.success) await load();
        return r;
    };

    const updateStatus = async (id: number, status: string, notes?: string) => {
        const r = await updateInquiryStatus(id, status, notes);
        if (r.success) await load();
        return r;
    };

    const open = inquiries.filter(i => i.status === 'open').length;
    const followup = inquiries.filter(i => i.status === 'followup').length;
    const converted = inquiries.filter(i => i.status === 'converted').length;

    return { inquiries, loading, error, open, followup, converted, add, updateStatus, refetch: load };
};