'use client';

import { useState } from 'react';
import { saveWCDailyReport } from '@/services/reportsService';
import AIWriteButton from '@/components/shared/AIWriteButton';

interface Props {
    wcId: string;
    wcName: string;
    onClose: () => void;
    onSaved: () => void;
}

interface ReviewRow { customer: string; stars: number; }

export default function WCDailyReportModal({ wcId, wcName, onClose, onSaved }: Props) {
    const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [inW, setInW] = useState('');
    const [inNW, setInNW] = useState('');
    const [inO, setInO] = useState('');
    const [outW, setOutW] = useState('');
    const [outNW, setOutNW] = useState('');
    const [outO, setOutO] = useState('');
    const [reviews, setReviews] = useState<ReviewRow[]>([]);
    const [remarks, setRemarks] = useState('');
    const [saving, setSaving] = useState(false);

    const n = (v: string) => parseInt(v, 10) || 0;
    const inTotal = n(inW) + n(inNW) + n(inO);
    const outTotal = n(outW) + n(outNW) + n(outO);
    const grandTotal = inTotal + outTotal;

    const addReview = () => {
        if (reviews.length >= 10) return;
        setReviews([...reviews, { customer: '', stars: 5 }]);
    };
    const updateReview = (i: number, patch: Partial<ReviewRow>) => {
        setReviews(reviews.map((r, idx) => idx === i ? { ...r, ...patch } : r));
    };
    const removeReview = (i: number) => setReviews(reviews.filter((_, idx) => idx !== i));

    const handleSave = async () => {
        if (!date) { alert('Please select a date'); return; }
        setSaving(true);
        const r = await saveWCDailyReport({
            wc_id: wcId, wc_name: wcName, report_date: date,
            inward: { warranty: n(inW), non_warranty: n(inNW), other: n(inO) },
            outward: { warranty: n(outW), non_warranty: n(outNW), other: n(outO) },
            reviews: reviews,
            remarks,
        });
        setSaving(false);
        if (r.success) {
            alert('✅ WC Daily Report submitted!');
            onSaved();
        } else {
            alert('Error: ' + r.error);
        }
    };

    const numInput = (val: string, setter: (v: string) => void) => (
        <input type="number" min={0} value={val} onChange={(e) => setter(e.target.value)} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box' }} />
    );

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: 17 }}>📋 WC Daily Report</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
                    <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div><b>{wcName}</b> <span style={{ fontSize: 12, color: '#6b7280' }}>Daily Report</span></div>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 10px', fontSize: 13 }} />
                    </div>

                    <div style={{ background: '#eff6ff', borderRadius: 10, padding: 14, marginBottom: 12, borderLeft: '4px solid #1d4ed8' }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1d4ed8', marginBottom: 10 }}>1. 📥 Inward Calls (Customers Received)</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                            <div><label style={{ fontSize: 12, fontWeight: 600 }}>Warranty *</label>{numInput(inW, setInW)}</div>
                            <div><label style={{ fontSize: 12, fontWeight: 600 }}>Non-Warranty *</label>{numInput(inNW, setInNW)}</div>
                            <div><label style={{ fontSize: 12, fontWeight: 600 }}>Other *</label>{numInput(inO, setInO)}</div>
                        </div>
                        <div style={{ background: '#fff', borderRadius: 8, padding: '8px 12px', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Inward Total:</span>
                            <span style={{ fontWeight: 700, color: '#1d4ed8' }}>{inTotal}</span>
                        </div>
                    </div>

                    <div style={{ background: '#fff7ed', borderRadius: 10, padding: 14, marginBottom: 12, borderLeft: '4px solid #ff9800' }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#d97706', marginBottom: 10 }}>2. 📤 Outward Calls (Customers Dispatched)</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                            <div><label style={{ fontSize: 12, fontWeight: 600 }}>Warranty *</label>{numInput(outW, setOutW)}</div>
                            <div><label style={{ fontSize: 12, fontWeight: 600 }}>Non-Warranty *</label>{numInput(outNW, setOutNW)}</div>
                            <div><label style={{ fontSize: 12, fontWeight: 600 }}>Other *</label>{numInput(outO, setOutO)}</div>
                        </div>
                        <div style={{ background: '#fff', borderRadius: 8, padding: '8px 12px', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Outward Total:</span>
                            <span style={{ fontWeight: 700, color: '#d97706' }}>{outTotal}</span>
                        </div>
                    </div>

                    <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '12px 14px', marginBottom: 12, borderLeft: '4px solid #0e9f6e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#065f46' }}>Total Calls (Auto)</span>
                        <span style={{ fontSize: 20, fontWeight: 700, color: '#065f46' }}>{grandTotal}</span>
                    </div>

                    <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 14, marginBottom: 12, borderLeft: '4px solid #0e9f6e' }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#065f46', marginBottom: 10 }}>3. Google Reviews Received</h3>
                        {reviews.map((rv, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                                <input type="text" placeholder="Customer Name" value={rv.customer} onChange={(e) => updateReview(i, { customer: e.target.value })} style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 13 }} />
                                <select value={rv.stars} onChange={(e) => updateReview(i, { stars: parseInt(e.target.value, 10) })} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 13 }}>
                                    {[5, 4, 3, 2, 1].map((s) => (<option key={s} value={s}>{'⭐'.repeat(s)} {s} Star</option>))}
                                </select>
                                <button onClick={() => removeReview(i)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 10px', cursor: 'pointer' }}>✕</button>
                            </div>
                        ))}
                        <button onClick={addReview} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 12px', fontSize: 13, cursor: 'pointer', marginTop: 4 }}>+ Add Review</button>
                        <div style={{ marginTop: 10, background: '#fff', borderRadius: 8, padding: 10, display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 700 }}>Total Reviews:</span>
                            <span style={{ fontWeight: 700, color: '#065f46' }}>{reviews.length}</span>
                        </div>
                    </div>

                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <label style={{ fontSize: 13, fontWeight: 500 }}>Remarks</label>
                            <AIWriteButton type="dailyreport" onInsert={(text) => setRemarks(text)} />
                        </div>
                        <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} placeholder="Any additional notes..." style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }} />
                    </div>
                </div>
                <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 10 }}>
                    <button onClick={onClose} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                    <button onClick={handleSave} disabled={saving} style={{ flex: 1, background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
                        {saving ? 'Saving...' : '💾 Submit Report'}
                    </button>
                </div>
            </div>
        </div>
    );
}