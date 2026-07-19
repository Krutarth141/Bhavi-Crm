import { useState, useEffect } from 'react';
import { AutoInventoryItem, AutoInventoryForm } from '@/types/autoInventory';
import { fetchAutoInventory, createAutoInventoryItem, updateAutoInventoryItem, deleteAutoInventoryItem, recordStockTransaction } from '@/services/autoInventoryService';

export const useAutoInventory = () => {
    const [items, setItems] = useState<AutoInventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true); setError(null);
        try { setItems(await fetchAutoInventory()); }
        catch (err) { setError((err as any).message); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const add = async (form: AutoInventoryForm, doneBy: string) => {
        const r = await createAutoInventoryItem(form, doneBy);
        if (r.success) await load();
        return r;
    };

    const update = async (id: number, form: AutoInventoryForm) => {
        const r = await updateAutoInventoryItem(id, form);
        if (r.success) await load();
        return r;
    };

    const remove = async (id: number) => {
        const r = await deleteAutoInventoryItem(id);
        if (r.success) await load();
        return r;
    };

    const stockTxn = async (params: Parameters<typeof recordStockTransaction>[0]) => {
        const r = await recordStockTransaction(params);
        if (r.success) await load();
        return r;
    };

    const brands = [...new Set(items.map(i => i.brand).filter(Boolean))].sort() as string[];
    const categories = [...new Set(items.map(i => i.category).filter(Boolean))].sort() as string[];
    const lowStock = items.filter(i => (i.stock_qty || 0) <= 2).length;
    const totalValue = items.reduce((s, i) => s + ((i.stock_qty || 0) * (i.purchase_price || 0)), 0);

    return { items, loading, error, brands, categories, lowStock, totalValue, add, update, remove, stockTxn, refetch: load };
};