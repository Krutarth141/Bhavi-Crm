'use client';
import { useEffect } from 'react';

// HTML forces every text field's typed VALUE to uppercase as you type, not
// just its display — a single document-level 'input' listener
// (index.html:1348-1357), not per-field logic. Same exemptions ported
// verbatim: these input types stay as typed (forcing an email/url/number/etc.
// upper would just corrupt it), and any field explicitly opted out via the
// 'no-caps' class (HTML's walk-in PIN field is the one real example).
const SKIP_TYPES = new Set([
    'password', 'email', 'search', 'url', 'number',
    'date', 'time', 'month', 'week', 'color', 'range', 'file', 'hidden',
]);

export default function UppercaseInputWatcher() {
    useEffect(() => {
        // React controlled inputs re-render from their own state, which
        // still holds whatever the user actually typed — directly mutating
        // el.value (HTML's approach) would get silently overwritten on the
        // next render. Going through the native value setter + a real
        // 'input' event is the standard way to make a native DOM mutation
        // look like a genuine user edit, so React's onChange re-fires with
        // the corrected value and its state actually picks it up.
        const inputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        const textareaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
        if (!inputSetter || !textareaSetter) return;

        const handler = (e: Event) => {
            const el = e.target as HTMLInputElement | HTMLTextAreaElement | null;
            if (!el) return;
            const isTextarea = el.tagName === 'TEXTAREA';
            const isInput = el.tagName === 'INPUT';
            if (!isTextarea && !isInput) return;
            if (el.classList.contains('no-caps')) return;
            if (isInput && SKIP_TYPES.has(((el as HTMLInputElement).type || 'text').toLowerCase())) return;

            const upper = el.value.toUpperCase();
            // Already uppercase (or empty) — also the re-entrancy guard for
            // the synthetic 'input' event dispatched below, which would
            // otherwise fire this same listener again.
            if (upper === el.value) return;

            const start = el.selectionStart, end = el.selectionEnd;
            (isTextarea ? textareaSetter : inputSetter).call(el, upper);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            try { el.setSelectionRange(start, end); } catch { /* not all input types support it */ }
        };

        document.addEventListener('input', handler);
        return () => document.removeEventListener('input', handler);
    }, []);

    return null;
}
