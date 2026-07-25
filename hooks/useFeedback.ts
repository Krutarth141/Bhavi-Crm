import { useState, useEffect } from 'react';
import { CustomerFeedback } from '@/types/feedback';
import { fetchFeedbackFiltered, fetchFeedbackEngineers, FeedbackEngineerOption } from '@/services/feedbackService';

export const useFeedback = () => {
    const [feedback, setFeedback] = useState<CustomerFeedback[]>([]);
    const [engineers, setEngineers] = useState<FeedbackEngineerOption[]>([]);
    const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
    const [engId, setEngId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadFeedback = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchFeedbackFiltered({ month: month || undefined, engId: engId || undefined });
            setFeedback(data);
        } catch (err) {
            setError((err as any).message || 'Failed to load feedback');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchFeedbackEngineers().then(setEngineers); }, []);
    useEffect(() => { loadFeedback(); }, [month, engId]);

    const avgRating = feedback.filter(f => f.rating).length
        ? feedback.filter(f => f.rating).reduce((s, f) => s + (f.rating || 0), 0) / feedback.filter(f => f.rating).length
        : 0;
    const googleReviews = feedback.filter(f => f.google_review).length;
    const fiveStars = feedback.filter(f => f.rating === 5).length;

    return {
        feedback, engineers, month, setMonth, engId, setEngId,
        loading, error,
        avgRating, googleReviews, fiveStars,
        refetch: loadFeedback,
    };
};