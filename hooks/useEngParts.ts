import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { EngStock, EngPartRequest } from '@/types/engParts';
import { InventoryItem } from '@/types/inventory';

export function useEngParts() {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [engStock, setEngStock] = useState<EngStock[]>([]);
    const [engPartRequests, setEngPartRequests] = useState<EngPartRequest[]>([]);
    const [engineers, setEngineers] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [
                { data: inventoryData, error: inventoryError },
                { data: engStockData, error: engStockError },
                { data: engRequestsData, error: engRequestsError },
            ] = await Promise.all([
                supabase.from('inventory').select('*').order('item_name'),
                supabase.from('eng_stock').select('*').order('owner'),
                supabase
                    .from('eng_part_requests')          // ← correct table name
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(200),
            ]);

            if (inventoryError) throw inventoryError;
            if (engStockError) throw engStockError;
            if (engRequestsError) throw engRequestsError;

            const inv = inventoryData ?? [];
            const stock = engStockData ?? [];
            const requests = engRequestsData ?? [];

            setInventory(inv);
            setEngStock(stock);
            setEngPartRequests(requests);

            // Derive unique sorted engineer names from eng_stock.owner
            const uniqueEngineers = [...new Set(stock.map((s) => s.owner))].sort();
            setEngineers(uniqueEngineers);
        } catch (err: any) {
            console.error('useEngParts fetch error:', err);
            setError(err?.message ?? String(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Pending requests = status 'pending'
    const pendingRequests = engPartRequests.filter(
        (r) => r.status === 'pending'
    );

    return {
        inventory,
        engStock,
        engPartRequests,
        engineers,
        pendingRequests,
        loading,
        error,
        refetch: fetchAll,
    };
}