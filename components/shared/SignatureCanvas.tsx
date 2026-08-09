'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export interface SignatureCanvasHandle {
    getDataUrl: () => string;
    clear: () => void;
    isEmpty: () => boolean;
}

interface Props {
    width?: number;
    height?: number;
}

const SignatureCanvas = forwardRef<SignatureCanvasHandle, Props>(({ width = 420, height = 160 }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawingRef = useRef(false);
    const hasDrawnRef = useRef(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const getPos = (e: MouseEvent | TouchEvent) => {
            const r = canvas.getBoundingClientRect();
            const sx = canvas.width / r.width;
            const sy = canvas.height / r.height;
            if ('touches' in e && e.touches.length) {
                return { x: (e.touches[0].clientX - r.left) * sx, y: (e.touches[0].clientY - r.top) * sy };
            }
            const me = e as MouseEvent;
            return { x: (me.clientX - r.left) * sx, y: (me.clientY - r.top) * sy };
        };
        const start = (e: MouseEvent | TouchEvent) => {
            e.preventDefault();
            drawingRef.current = true;
            hasDrawnRef.current = true;
            const p = getPos(e);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
        };
        const move = (e: MouseEvent | TouchEvent) => {
            e.preventDefault();
            if (!drawingRef.current) return;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#1d4ed8';
            const p = getPos(e);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
        };
        const stop = () => { drawingRef.current = false; };

        canvas.addEventListener('mousedown', start);
        canvas.addEventListener('mousemove', move);
        canvas.addEventListener('mouseup', stop);
        canvas.addEventListener('mouseleave', stop);
        canvas.addEventListener('touchstart', start, { passive: false });
        canvas.addEventListener('touchmove', move, { passive: false });
        canvas.addEventListener('touchend', stop);

        return () => {
            canvas.removeEventListener('mousedown', start);
            canvas.removeEventListener('mousemove', move);
            canvas.removeEventListener('mouseup', stop);
            canvas.removeEventListener('mouseleave', stop);
            canvas.removeEventListener('touchstart', start);
            canvas.removeEventListener('touchmove', move);
            canvas.removeEventListener('touchend', stop);
        };
    }, []);

    useImperativeHandle(ref, () => ({
        getDataUrl: () => canvasRef.current?.toDataURL('image/png') || '',
        clear: () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.fillStyle = '#fafafa';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            hasDrawnRef.current = false;
        },
        isEmpty: () => !hasDrawnRef.current,
    }));

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{ border: '1px solid #d1d5db', borderRadius: 6, background: '#fafafa', touchAction: 'none', width: '100%', display: 'block' }}
        />
    );
});
SignatureCanvas.displayName = 'SignatureCanvas';

export default SignatureCanvas;