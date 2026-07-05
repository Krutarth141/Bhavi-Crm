import { useState, useEffect } from 'react';
import { CatalogPart } from '@/types/partsCatalog';
import { fetchPartsCatalog } from '@/services/partsCatalogService';

export const usePartsCatalog = () => {
    const [parts, setParts] = useState<CatalogPart[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadParts = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchPartsCatalog();
            setParts(data);
        } catch (err) {
            setError((err as any).message || 'Failed to load parts catalog');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadParts(); }, []);

    // Derived
    const categories = [...new Set(parts.map(p => p.category).filter(Boolean))].sort() as string[];
    const lowStock = parts.filter(p => p.stock_qty !== undefined && p.stock_qty !== null && p.stock_qty <= 2).length;

    return {
        parts,
        loading,
        error,
        categories,
        lowStock,
        refetch: loadParts,
    };
};