import { useEffect } from 'react';
import { acquireScrollLock, releaseScrollLock } from '@/lib/scrollLock';

// Lets a component lock page scroll for as long as its own boolean state
// (e.g. an open drawer) says it should, without polling the DOM for it.
export const useScrollLock = (active: boolean) => {
    useEffect(() => {
        if (!active) return;
        acquireScrollLock();
        return () => releaseScrollLock();
    }, [active]);
};
