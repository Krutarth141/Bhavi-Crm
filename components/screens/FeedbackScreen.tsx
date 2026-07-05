'use client';

import { useState } from 'react';
import { useFeedback } from '@/hooks/useFeedback';
import { CustomerFeedback } from '@/types/feedback';

const StarRating = ({ rating }: { rating?: number }) => {
    if (!rating) return <span style={{ color: '#9ca3af' }}>—</span>;
    return (
        <span style={{ color: '#f59e0b', fontSize: 14 }}>
            {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
            <span style={{ marginLeft: 4, fontSize: 12, color: '#6b7280' }}>({rating}/5)</span>
        </span>
    );
};

export default function FeedbackScreen() {
    const { feedback, loading, error, avgRating, googleReviews, fiveStars } = useFeedback();
    const [search, setSearch] = useState('');
    const [ratingFilter, setRatingFilter] = useState('');
    const [googleFilter, setGoogleFilter] = useState('');

    const filtered: CustomerFeedback[] = feedback.filter(f => {
        const q = search.toLowerCase();
        const matchSearch = !search.trim() || f.customer_name?.toLowerCase().includes(q) || f.comment?.toLowerCase().includes(q) || f.ticket_id?.toLowerCase().includes(q);
        const matchRating = !ratingFilter || f.rating === Number(ratingFilter);
        const matchGoogle = !googleFilter || (googleFilter === 'yes' ? f.google_review : !f.google_review);
        return matchSearch && matchRating && matchGoogle;
    });

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>⭐ Customer Feedback ({feedback.length})</h1>
            </div>

            {error && <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#dc2626', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>Error: {error}</div>}

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
                {[
                    { label: 'Total Feedback', value: feedback.length, color: '#185FA5' },
                    { label: '⭐ Avg Rating', value: feedback.length ? avgRating.toFixed(1) : '—', color: '#f59e0b' },
                    { label: '5⭐ Reviews', value: fiveStars, color: '#059669' },
                    { label: '🌐 Google Reviews', value: googleReviews, color: '#7c3aed' },
                ].map(s => (
                    <div key={s.label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input type="text" placeholder="Search customer, comment, ticket..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14, fontFamily: 'inherit' }} />
                <select value={ratingFilter} onChange={e => setRatingFilter(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14 }}>
                    <option value="">All Ratings</option>
                    {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} ⭐</option>)}
                </select>
                <select value={googleFilter} onChange={e => setGoogleFilter(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14 }}>
                    <option value="">All</option>
                    <option value="yes">🌐 Google Review</option>
                    <option value="no">No Google Review</option>
                </select>
            </div>

            {/* Table */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                {loading ? (
                    <p style={{ textAlign: 'center', color: '#6b7280', padding: 32 }}>Loading...</p>
                ) : filtered.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#6b7280', padding: 32 }}>No feedback found</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                            <thead>
                                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                    {['Date', 'Customer', 'Ticket', 'Engineer', 'Rating', 'Comment', 'Google'].map(h => (
                                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#374151' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(f => (
                                    <tr key={f.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: '10px 12px', fontSize: 12, whiteSpace: 'nowrap' }}>{f.created_at ? new Date(f.created_at).toLocaleDateString('en-IN') : '—'}</td>
                                        <td style={{ padding: '10px 12px' }}>
                                            <div style={{ fontWeight: 600 }}>{f.customer_name || '—'}</div>
                                            {f.mobile && <div style={{ fontSize: 11, color: '#6b7280' }}>{f.mobile}</div>}
                                        </td>
                                        <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'monospace' }}>{f.ticket_id || '—'}</td>
                                        <td style={{ padding: '10px 12px', fontSize: 12 }}>{f.engineer_name || '—'}</td>
                                        <td style={{ padding: '10px 12px' }}><StarRating rating={f.rating} /></td>
                                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280', maxWidth: 250 }}>{f.comment || '—'}</td>
                                        <td style={{ padding: '10px 12px' }}>{f.google_review ? <span style={{ color: '#059669', fontSize: 13 }}>✅</span> : <span style={{ color: '#9ca3af' }}>—</span>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}