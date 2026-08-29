'use client';
import { useEffect } from 'react';

interface ModalProps {
    isOpen: boolean;
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: 'sm' | 'lg';
}

export default function Modal({ isOpen, title, onClose, children, footer, size }: ModalProps) {
    // Mirrors HTML's global Escape-to-close (index.html:2069-2080) — it
    // closes every visible modal-overlay at once (not just the topmost), so
    // one listener per open Modal instance, each closing only itself, adds
    // up to the same "close everything open" behavior when several are
    // stacked.
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className={`modal${size ? ` modal-${size}` : ''}`} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
                {footer && <div className="modal-footer">{footer}</div>}
            </div>
        </div>
    );
}