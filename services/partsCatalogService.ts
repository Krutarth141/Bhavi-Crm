import { supabase } from '@/lib/supabase';
import { CatalogPart } from '@/types/partsCatalog';

export const fetchPartsCatalog = async (): Promise<CatalogPart[]> => {
    try {
        const { data, error } = await supabase
            .from('parts_catalog')
            .select('*')
            .order('part_name');
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Failed to fetch parts catalog:', err);
        return [];
    }
};