'use client';
import { useEffect, useRef } from 'react';
import { acquireScrollLock, releaseScrollLock } from '@/lib/scrollLock';

// Covers the ~40 modals across the app (each carries .modal-overlay) without
// any of them having to manage scroll locking themselves — just watches for
// one being mounted/unmounted. Only observes childList/subtree (an element
// actually being added or removed), NOT attribute changes: watching class
// attributes across the whole page fires on every unrelated className toggle
// (hover states, active rows, filter chips, ...) and was making the page
// janky/unresponsive. The sidebar drawer locks separately via its own
// sidebarOpen state (see useScrollLock), since it only toggles a class on an
// element that's already mounted rather than mounting/unmounting.
export default function ScrollLockWatcher() {
    const lockedRef = useRef(false);

    useEffect(() => {
        const sync = () => {
            const hasModal = document.querySelector('.modal-overlay') !== null;
            if (hasModal && !lockedRef.current) {
                lockedRef.current = true;
                acquireScrollLock();
            } else if (!hasModal && lockedRef.current) {
                lockedRef.current = false;
                releaseScrollLock();
            }
        };

        sync();
        const observer = new MutationObserver(sync);
        observer.observe(document.body, { childList: true, subtree: true });
        return () => {
            observer.disconnect();
            if (lockedRef.current) {
                lockedRef.current = false;
                releaseScrollLock();
            }
        };
    }, []);

    return null;
}
