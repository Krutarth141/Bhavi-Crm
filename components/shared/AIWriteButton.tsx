'use client';

import { useState } from 'react';

type AIWriteType = 'update' | 'feedback' | 'worklog' | 'dailyreport' | 'visit' | 'inquiry';

interface Props {
    type: AIWriteType;
    onInsert: (text: string) => void;
    label?: string;
}

export default function AIWriteButton({ type, onInsert, label = '✨ AI Write' }: Props) {
    const [open, setOpen] = useState(false);
    const [rough, setRough] = useState('');
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const close = () => { setOpen(false); setRough(''); setResult(''); setError(''); };

    const generate = async () => {
        if (!rough.trim()) { setError('Please type a few rough notes first.'); return; }
        setLoading(true);
        setError('');
        try {
            const resp = await fetch('/api/ai-assist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roughText: rough, type }),
            });
            const data = await resp.json();
            if (data.error) throw new Error(data.error);
            setResult(data.text || '');
        } catch (e: any) {
            setError(e.message || 'Failed to generate.');
        } finally {
            setLoading(false);
        }
    };

    const insert = () => {
        if (!result.trim()) return;
        onInsert(result.trim());
        close();
    };

    return (
        <>
            <button type="button" onClick={() => setOpen(true)} style={btnStyle}>{label}</button>
            {open && (
                <div onClick={close} style={overlayStyle}>
                    <div onClick={(e) => e.stopPropagation()} style={boxStyle}>
                        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>✨ AI Assistant</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>Type rough notes — AI will turn it into a professional remark.</div>
                        <textarea
                            rows={3}
                            value={rough}
                            onChange={(e) => setRough(e.target.value)}
                            placeholder="Ex: camera repair done, cleaned dust, tested working..."
                            autoFocus
                            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #c7d2fe', borderRadius: 10, padding: 10, fontSize: 13, marginBottom: 8, resize: 'vertical' }}
                        />
                        <button type="button" onClick={generate} disabled={loading} style={{ width: '100%', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', border: 'none', borderRadius: 10, padding: 11, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 8, opacity: loading ? 0.5 : 1 }}>
                            {loading ? '⏳ Polishing...' : result ? '🔄 Re-polish' : '✨ Polish with AI'}
                        </button>
                        {result && (
                            <textarea
                                rows={3}
                                value={result}
                                onChange={(e) => setResult(e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #c7d2fe', background: '#f8faff', borderRadius: 10, padding: '10px 12px', fontSize: 13, lineHeight: 1.6, marginBottom: 10, resize: 'vertical' }}
                            />
                        )}
                        {error && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 10 }}>{error}</div>}
                        {result && (
                            <button type="button" onClick={insert} style={{ width: '100%', background: '#059669', color: '#fff', border: 'none', borderRadius: 10, padding: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', marginBottom: 6 }}>✅ Insert</button>
                        )}
                        <button type="button" onClick={close} style={{ width: '100%', background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 10, padding: 9, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                    </div>
                </div>
            )}
        </>
    );
}

const btnStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 11px', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 };
const boxStyle: React.CSSProperties = { background: '#fff', borderRadius: 16, padding: 22, width: 340, maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' };