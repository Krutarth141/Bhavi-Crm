import { supabase } from '@/lib/supabase';
import { LiveLocation } from '@/types/liveMap';

export const fetchLiveLocations = async (): Promise<LiveLocation[]> => {
    try {
        const { data, error } = await supabase
            .from('engineer_locations')
            .select('id, eng_id, eng_name, lat, lng, accuracy, event_type, ticket_id, session_date, recorded_at')
            .order('recorded_at', { ascending: false })
            .limit(200);
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('fetchLiveLocations:', err);
        return [];
    }
};