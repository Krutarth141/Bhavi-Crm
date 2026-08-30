import { useState, useEffect } from 'react';
import { fetchNavPermissions } from '@/services/navPermissionsService';

export function useNavVisibility(uid: string | undefined) {
    const [overrides, setOverrides] = useState<Record<string, boolean> | null>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!uid) { setLoaded(true); return; }
        fetchNavPermissions().then((perms) => {
            setOverrides(perms.users[uid] || null);
            setLoaded(true);
        }).catch(() => setLoaded(true));
    }, [uid]);

    const isVisible = (navId: string, defaultVisible: boolean = true): boolean => {
        if (!overrides) return defaultVisible;
        if (overrides[navId] === undefined) return defaultVisible;
        return overrides[navId];
    };

    return { isVisible, loaded };
}