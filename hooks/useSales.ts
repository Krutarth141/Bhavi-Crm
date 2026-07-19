import { useState, useEffect } from 'react';
import { SalesOrder, SalesProduct } from '@/types/sales';
import { fetchSalesOrders, fetchActiveSalesProducts, createSalesOrder, markSalesStatus, recordSalesPayment, recordSalesDispatch, recordSalesDelivery } from '@/services/salesService';
import { fetchCompanyInfo } from '@/services/settingsService';

export const useSales = () => {
    const [orders, setOrders] = useState<SalesOrder[]>([]);
    const [products, setProducts] = useState<SalesProduct[]>([]);
    const [upiQrUrl, setUpiQrUrl] = useState<string | null>(null);
    const [companyPhone, setCompanyPhone] = useState<string | undefined>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true); setError(null);
        try {
            const [ordersData, productsData, ci] = await Promise.all([
                fetchSalesOrders(),
                fetchActiveSalesProducts(),
                fetchCompanyInfo(),
            ]);
            setOrders(ordersData);
            setProducts(productsData);
            setUpiQrUrl(ci?.upi_qr_url || null);
            setCompanyPhone(ci?.phone);
        } catch (err) {
            setError((err as any).message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const addOrder = async (form: Parameters<typeof createSalesOrder>[0]) => {
        const r = await createSalesOrder(form);
        if (r.success) await load();
        return r;
    };

    const markStatus = async (id: string, status: string) => {
        const r = await markSalesStatus(id, status);
        if (r.success) await load();
        return r;
    };

    const recordPayment = async (id: string, method: string, reference: string, date: string) => {
        const r = await recordSalesPayment(id, method, reference, date);
        if (r.success) await load();
        return r;
    };

    const recordDispatch = async (id: string, courier: string, awb: string, date: string, trackUrl: string, notes: string) => {
        const r = await recordSalesDispatch(id, courier, awb, date, trackUrl, notes);
        if (r.success) await load();
        return r;
    };

    const recordDelivery = async (id: string, note: string) => {
        const r = await recordSalesDelivery(id, note);
        if (r.success) await load();
        return r;
    };

    const totalRevenue = orders.filter(o => o.status !== 'inquiry').reduce((s, o) => s + (o.total_amount || 0), 0);

    return { orders, products, upiQrUrl, companyPhone, loading, error, totalRevenue, addOrder, markStatus, recordPayment, recordDispatch, recordDelivery, refetch: load };
};