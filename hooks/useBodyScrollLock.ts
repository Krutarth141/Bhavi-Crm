import { useEffect } from 'react';

// Mobile sidebar drawers are position:fixed, but the page behind it was
// still a normal scrollable document — a touch-drag over the open drawer
// scrolled the page first (collapsing the browser's address bar) before the
// drawer's own overflow-y:auto content would scroll. HTML's body is always
// height:100vh + overflow:hidden (index.html:20) so this can never happen
// there; locking the body only while the drawer is open gets the same
// result without changing scroll behaviour on every other page.
export const useBodyScrollLock = (locked: boolean) => {
    useEffect(() => {
        if (!locked) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [locked]);
};
