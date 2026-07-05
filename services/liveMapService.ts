import { supabase } from '@/lib/supabase';
import { LiveLocation } from '@/types/liveMap';

export const fetchLiveLocations = async (): Promise<LiveLocation[]> => {
    try {
        const { data, error } = await supabase
            .from('engineer_locations')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(200);
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('fetchLiveLocations:', err);
        return [];
    }
};