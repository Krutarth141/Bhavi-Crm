'use client';
import { useEffect } from 'react';

// Single source of truth for "something full-screen is open, so the page
// behind it must not scroll" — covers every modal (.modal-overlay, added
// across ~40 screens) and the mobile sidebar drawer (.dashboard-sidebar.open)
// without each one having to manage document.body itself. Previously each
// open overlay still let the page behind it scroll too, so a drag over it
// scrolled the page first (collapsing the mobile browser's address bar, or
// moving the background content) before the overlay's own content would
// scroll — needing two separate gestures instead of one smooth one.
const LOCK_SELECTOR = '.modal-overlay, .dashboard-sidebar.open';

export default function ScrollLockWatcher() {
    useEffect(() => {
        const sync = () => {
            const locked = document.querySelector(LOCK_SELECTOR) !== null;
            document.body.style.overflow = locked ? 'hidden' : '';
        };
        sync();
        const observer = new MutationObserver(sync);
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
        return () => {
            observer.disconnect();
            document.body.style.overflow = '';
        };
    }, []);

    return null;
}
