import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { EngStock, EngMovement } from '@/types/engParts';
import { InventoryItem } from '@/types/inventory';
import { PartRequest } from '@/types/partRequest';

// index.html:11226 — "My Requests" (self-service) is scoped server-side to
// the logged-in engineer via ?engineer_id=eq.<id>&limit=100, distinct from
// the admin view's unfiltered `requests`/`pendingRequests`. Pass the current
// user's engineer id (matches the `engineer_id` value used when a request is
// submitted, i.e. session email) ONLY for the self-service "My Requests" tab
// — omit it for admin/CSP-manager full-list views.
export function useEngParts(engineerId?: string) {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [engStock, setEngStock] = useState<EngStock[]>([]);
    const [movements, setMovements] = useState<EngMovement[]>([]);
    const [requests, setRequests] = useState<PartRequest[]>([]);
    const [myRequests, setMyRequests] = useState<PartRequest[]>([]);
    const [engineers, setEngineers] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            let inv: any[] = [];
            let invFrom = 0;
            const INV_PAGE = 1000;
            while (true) {
                const { data: page, error: inventoryError } = await supabase.from('inventory').select('*').order('item_name').range(invFrom, invFrom + INV_PAGE - 1);
                if (inventoryError) throw inventoryError;
                inv = inv.concat(page || []);
                if (!page || page.length < INV_PAGE) break;
                invFrom += INV_PAGE;
            }

            let stock: any[] = [];
            let stockFrom = 0;
            const STOCK_PAGE = 1000;
            while (true) {
                const { data: page, error: engStockError } = await supabase.from('eng_stock').select('*').order('owner').range(stockFrom, stockFrom + STOCK_PAGE - 1);
                if (engStockError) throw engStockError;
                stock = stock.concat(page || []);
                if (!page || page.length < STOCK_PAGE) break;
                stockFrom += STOCK_PAGE;
            }

            const [
                { data: movementsData, error: movementsError },
                { data: requestsData, error: requestsError },
                myRequestsResult,
            ] = await Promise.all([
                supabase.from('eng_movements').select('*').order('created_at', { ascending: false }).limit(500),
                supabase.from('eng_part_requests').select('*').order('created_at', { ascending: false }).limit(200),
                engineerId
                    ? supabase.from('eng_part_requests').select('*').eq('engineer_id', engineerId).order('created_at', { ascending: false }).limit(100)
                    : Promise.resolve({ data: [] as PartRequest[], error: null }),
            ]);

            if (movementsError) throw movementsError;
            if (requestsError) throw requestsError;
            if (myRequestsResult.error) throw myRequestsResult.error;

            setInventory(inv);
            setEngStock(stock);
            setMovements(movementsData ?? []);
            setRequests(requestsData ?? []);
            setMyRequests(myRequestsResult.data ?? []);

            // Derive unique sorted engineer names from eng_stock.owner
            const uniqueEngineers = [...new Set(stock.map((s) => s.owner))].sort();
            setEngineers(uniqueEngineers);
        } catch (err: any) {
            console.error('useEngParts fetch error:', err);
            setError(err?.message ?? String(err));
        } finally {
            setLoading(false);
        }
    }, [engineerId]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Pending requests = status 'PENDING'
    const pendingRequests = requests.filter(
        (r) => r.status === 'PENDING'
    );

    return {
        inventory,
        engStock,
        movements,
        requests,
        myRequests,
        engineers,
        pendingRequests,
        loading,
        error,
        refetch: fetchAll,
    };
}