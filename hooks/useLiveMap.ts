import { useState, useEffect, useCallback } from 'react';
import { LiveLocation, isOnline } from '@/types/liveMap';
import { fetchLiveLocations } from '@/services/liveMapService';

export const useLiveMap = () => {
    const [locations, setLocations] = useState<LiveLocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(new Date());

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setLocations(await fetchLiveLocations());
            setLastRefresh(new Date());
        } catch (err) { console.error('useLiveMap:', err); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        load();
        const interval = setInterval(load, 2 * 60 * 1000);
        return () => clearInterval(interval);
    }, [load]);

    // Latest location per engineer (using recorded_at)
    const latestByEng: Record<string, LiveLocation> = {};
    locations.forEach(l => {
        if (l.eng_name && (!latestByEng[l.eng_name] || (l.recorded_at || '') > (latestByEng[l.eng_name]?.recorded_at || ''))) {
            latestByEng[l.eng_name] = l;
        }
    });

    const engineers = Object.values(latestByEng).sort((a, b) => (a.eng_name || '').localeCompare(b.eng_name || ''));
    const onlineCount = engineers.filter(e => isOnline(e.recorded_at)).length;

    return { locations, engineers, latestByEng, loading, lastRefresh, onlineCount, refetch: load };
};