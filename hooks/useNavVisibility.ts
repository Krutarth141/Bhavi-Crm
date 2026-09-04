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
        // HTML stores/reads these overrides with a "nav-" prefix (e.g.
        // "nav-auto-sites") in company_info.nav_permissions — match that key
        // format so legacy overrides set through the HTML app still apply.
        const key = `nav-${navId}`;
        if (overrides[key] === undefined) return defaultVisible;
        return overrides[key];
    };

    return { isVisible, loaded };
}