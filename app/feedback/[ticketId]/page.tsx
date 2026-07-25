'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchFeedbackByTicket, submitFeedback } from '@/services/feedbackService';

export default function PublicFeedbackPage() {
    const params = useParams();
    const ticketId = String(params.ticketId || '');
    const [rating, setRating] = useState(0);
    const [name, setName] = useState('');
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');
    const [alreadyRated, setAlreadyRated] = useState(false);

    useEffect(() => {
        if (!ticketId) return;
        fetchFeedbackByTicket(ticketId).then(existing => {
            if (existing) {
                setName(existing.customer_name || '');
                setComment(existing.comment || '');
                setRating(existing.rating || 0);
                setAlreadyRated(true);
            }
        });
    }, [ticketId]);

    const handleSubmit = async () => {
        if (!rating) { setError('Please select a star rating!'); return; }
        setError('');
        setSubmitting(true);
        const r = await submitFeedback({ ticketId, customerName: name.trim() || 'Customer', rating, comment: comment.trim() });
        setSubmitting(false);
        if (r.success) setDone(true);
        else setError('Error: ' + r.error);
    };

    if (done) {
        return (
            <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(135deg,#1e2a3a,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: '#fff', borderRadius: 16, padding: 40, textAlign: 'center', width: 340, maxWidth: '95vw' }}>
                    <div style={{ fontSize: 56 }}>🎉</div>
                    <h2 style={{ color: '#10b981', margin: '8px 0' }}>Thank You!</h2>
                    <p style={{ color: '#6b7280', fontSize: 13 }}>Your feedback has been saved. You can update it anytime by opening this link again.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(135deg,#1e2a3a,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 340, maxWidth: '95vw', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>⭐</div>
                <h2 style={{ margin: '0 0 6px', fontSize: 18 }}>Rate Your Experience</h2>
                <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>How was our service? Your feedback matters!</p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
                    {[1, 2, 3, 4, 5].map(n => (
                        <span key={n} onClick={() => setRating(n)} style={{ fontSize: 36, cursor: 'pointer' }}>
                            {n <= rating ? '⭐' : '☆'}
                        </span>
                    ))}
                </div>
                <input type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, marginBottom: 10, boxSizing: 'border-box' }} />
                <textarea placeholder="Any comments? (optional)" rows={3} value={comment} onChange={e => setComment(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, marginBottom: 10, boxSizing: 'border-box', resize: 'none' }} />
                <button onClick={handleSubmit} disabled={submitting} style={{ width: '100%', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: 11, fontSize: 15, fontWeight: 700, cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                    {submitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
                {alreadyRated && !error && <div style={{ marginTop: 10, fontSize: 13, color: '#7c3aed' }}>You have already rated this service — update your rating and submit again to change it.</div>}
                {error && <div style={{ marginTop: 10, fontSize: 13, color: 'red' }}>{error}</div>}
            </div>
        </div>
    );
}