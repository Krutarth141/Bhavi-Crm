'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchHolidays, addHoliday, deleteHoliday, Holiday } from '@/services/holidaysService';

export default function HolidaysTab() {
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newDate, setNewDate] = useState('');
    const [newName, setNewName] = useState('');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setHolidays(await fetchHolidays());
        } catch (err: any) {
            const msg = String(err?.message || err);
            setError(
                msg.includes('holidays') || msg.includes('relation') || msg.includes('404') || msg.includes('does not exist')
                    ? 'Setup needed: create a "holidays" table in Supabase with columns holiday_date (date, primary key) and name (text), then reload this tab.\n\ncreate table holidays (holiday_date date primary key, name text);'
                    : 'Error: ' + msg
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleAdd = async () => {
        if (!newDate) { alert('⚠️ Select a date.'); return; }
        if (!newName.trim()) { alert('⚠️ Enter a holiday name.'); return; }
        setSaving(true);
        try {
            await addHoliday(newDate, newName.trim());
            setNewDate(''); setNewName('');
            await load();
        } catch (e: any) {
            alert('Error: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (date: string) => {
        if (!confirm(`Remove holiday on ${date}?`)) return;
        try {
            await deleteHoliday(date);
            await load();
        } catch (e: any) {
            alert('Error: ' + e.message);
        }
    };

    const today = new Date().toLocaleDateString('en-CA');

    if (loading) return <div className="card"><p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>Loading...</p></div>;
    if (error) return <div className="card"><div style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', borderRadius: 8, padding: 12, fontSize: 13, whiteSpace: 'pre-wrap' }}>⚠️ {error}</div></div>;

    return (
        <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 6 }}>🎉 Holidays (for TAT +48h auto-calc)</h3>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                Sunday, 15-Aug, 26-Jan &amp; 2-Oct are always recognized automatically — add movable holidays here (Diwali, Eid, etc.) so a call received the day before also gets +48h TAT.
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}>
                <div>
                    <label style={{ display: 'block', fontSize: 12, marginBottom: 3 }}>Date</label>
                    <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13 }} />
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                    <label style={{ display: 'block', fontSize: 12, marginBottom: 3 }}>Name</label>
                    <input type="text" placeholder="e.g. Diwali" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, width: '100%', boxSizing: 'border-box' }} />
                </div>
                <button onClick={handleAdd} disabled={saving} style={{ padding: '8px 14px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
                    ➕ Add Holiday
                </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                    <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                        <th style={{ padding: '6px 8px' }}>Date</th>
                        <th style={{ padding: '6px 8px' }}>Name</th>
                        <th style={{ padding: '6px 8px' }}></th>
                    </tr>
                </thead>
                <tbody>
                    {holidays.length ? holidays.map((h) => {
                        const isPast = h.holiday_date < today;
                        return (
                            <tr key={h.holiday_date} style={{ borderBottom: '1px solid #f1f5f9', opacity: isPast ? 0.5 : 1 }}>
                                <td style={{ padding: '6px 8px', fontWeight: 600 }}>{new Date(`${h.holiday_date}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                <td style={{ padding: '6px 8px' }}>{h.name || '-'}</td>
                                <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                                    <button onClick={() => handleDelete(h.holiday_date)} style={{ padding: '4px 10px', border: '1px solid var(--border)', background: 'transparent', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>🗑️ Remove</button>
                                </td>
                            </tr>
                        );
                    }) : (
                        <tr><td colSpan={3} style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)' }}>No holidays added yet.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}