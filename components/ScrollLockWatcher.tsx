'use client';
import { useEffect, useRef } from 'react';

// Single source of truth for "something full-screen is open, so the page
// behind it must not scroll" — covers every modal (.modal-overlay, added
// across ~40 screens) and the mobile sidebar drawer (.dashboard-sidebar.open)
// without each one having to manage document.body itself.
//
// Plain `overflow:hidden` on body is not reliable enough on mobile — iOS
// Safari in particular can still rubber-band/touch-scroll the page behind a
// fixed overlay even with it set. The robust cross-browser fix is to pull
// body itself out of the document flow (position:fixed) while something is
// open, then restore its exact scroll position on close.
const LOCK_SELECTOR = '.modal-overlay, .dashboard-sidebar.open';

export default function ScrollLockWatcher() {
    const lockedRef = useRef(false);
    const scrollYRef = useRef(0);

    useEffect(() => {
        const lock = () => {
            if (lockedRef.current) return;
            lockedRef.current = true;
            scrollYRef.current = window.scrollY;
            const body = document.body;
            body.style.position = 'fixed';
            body.style.top = `-${scrollYRef.current}px`;
            body.style.left = '0';
            body.style.right = '0';
            body.style.width = '100%';
            body.style.overflow = 'hidden';
        };

        const unlock = () => {
            if (!lockedRef.current) return;
            lockedRef.current = false;
            const body = document.body;
            body.style.position = '';
            body.style.top = '';
            body.style.left = '';
            body.style.right = '';
            body.style.width = '';
            body.style.overflow = '';
            window.scrollTo(0, scrollYRef.current);
        };

        const sync = () => {
            const shouldLock = document.querySelector(LOCK_SELECTOR) !== null;
            if (shouldLock) lock(); else unlock();
        };

        sync();
        const observer = new MutationObserver(sync);
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
        return () => {
            observer.disconnect();
            unlock();
        };
    }, []);

    return null;
}
