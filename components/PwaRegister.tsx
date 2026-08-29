'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
    useEffect(() => {
        if (process.env.NODE_ENV !== 'production') {
            navigator.serviceWorker.getRegistrations().then((regs) => {
                regs.forEach((r) => r.unregister());
            });
            if ('caches' in window) {
                caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
            }
            return;
        }
        navigator.serviceWorker.register('/sw.js').catch(() => { });
    }, []);
    return null;
}