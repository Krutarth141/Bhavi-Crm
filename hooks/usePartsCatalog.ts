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

    const inStock = parts.filter(p => p.stock > 0).length;
    const outStock = parts.filter(p => p.stock <= 0).length;

    return {
        parts,
        loading,
        error,
        inStock,
        outStock,
        refetch: loadParts,
    };
};