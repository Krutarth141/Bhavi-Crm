import { useState, useEffect } from 'react';
import { SalesOrder } from '@/types/sales';
import { fetchSalesOrders, updateSalesOrderStatus } from '@/services/salesService';

export const useSales = () => {
    const [orders, setOrders] = useState<SalesOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true); setError(null);
        try { setOrders(await fetchSalesOrders()); }
        catch (err) { setError((err as any).message); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const updateStatus = async (id: string, status: string) => {
        const r = await updateSalesOrderStatus(id, status);
        if (r.success) await load();
        return r;
    };

    const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total_amount || 0), 0);

    return { orders, loading, error, totalRevenue, updateStatus, refetch: load };
};