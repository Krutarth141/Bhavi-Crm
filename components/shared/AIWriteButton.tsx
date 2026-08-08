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
        setOpen(false);
        setRough('');
        setResult('');
    };

    return (
        <span style={{ position: 'relative', display: 'inline-block' }}>
            <button type="button" onClick={() => setOpen((o) => !o)} style={btnStyle}>{label}</button>
            {open && (
                <>
                    <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 998 }} />
                    <div style={popoverStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>✨ AI Assistant</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Type rough notes — AI will turn it into a professional remark.</div>
                        <textarea
                            rows={3}
                            value={rough}
                            onChange={(e) => setRough(e.target.value)}
                            placeholder="Ex: camera repair done, cleaned dust, tested working..."
                            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #c7d2fe', borderRadius: 8, padding: 8, fontSize: 13, marginBottom: 8, resize: 'vertical' }}
                        />
                        <button type="button" onClick={generate} disabled={loading} style={{ ...btnStyle, width: '100%', marginBottom: 8, opacity: loading ? 0.6 : 1 }}>
                            {loading ? '⏳ Polishing...' : result ? '🔄 Re-polish' : '✨ Polish with AI'}
                        </button>
                        {result && (
                            <textarea
                                rows={3}
                                value={result}
                                onChange={(e) => setResult(e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #bbf7d0', background: '#f0fdf4', borderRadius: 8, padding: 8, fontSize: 13, marginBottom: 8, resize: 'vertical' }}
                            />
                        )}
                        {error && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 8 }}>{error}</div>}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" onClick={() => setOpen(false)} style={{ ...btnStyle, flex: 1, background: '#64748b' }}>Cancel</button>
                            <button type="button" onClick={insert} disabled={!result.trim()} style={{ ...btnStyle, flex: 1, opacity: result.trim() ? 1 : 0.5 }}>✅ Insert</button>
                        </div>
                    </div>
                </>
            )}
        </span>
    );
}

const btnStyle: React.CSSProperties = { padding: '4px 10px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 };
const popoverStyle: React.CSSProperties = { position: 'absolute', top: '110%', left: 0, zIndex: 999, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, width: 300, boxShadow: '0 10px 30px rgba(0,0,0,0.15)' };