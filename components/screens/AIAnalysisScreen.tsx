'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// AI Analysis — shows auto-generated insights from ticket data
export default function AIAnalysisScreen() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await supabase
                    .from('tickets')
                    .select('status, call_type, assigned_name, service_type, created_at, service_charges, final_charges')
                    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

                if (data) {
                    const total = data.length;
                    const closed = data.filter(t => t.status === 'Closed').length;
                    const warranty = data.filter(t => t.call_type === 'Warranty').length;
                    const revenue = data.filter(t => t.call_type !== 'Warranty')
                        .reduce((s, t) => s + parseFloat(t.final_charges || t.service_charges || 0), 0);

                    // By engineer
                    const byEng: Record<string, number> = {};
                    data.forEach(t => { const k = t.assigned_name || 'Unassigned'; byEng[k] = (byEng[k] || 0) + 1; });
                    const topEng = Object.entries(byEng).sort((a, b) => b[1] - a[1])[0];

                    // By service type
                    const carryIn = data.filter(t => t.service_type === 'Carry In').length;
                    const onSite = data.filter(t => t.service_type === 'On Site').length;

                    setStats({ total, closed, warranty, revenue, topEng, carryIn, onSite, resRate: total ? Math.round(closed / total * 100) : 0, wPct: total ? Math.round(warranty / total * 100) : 0 });
                }
            } catch { }
            finally { setLoading(false); }
        };
        load();
    }, []);

    const insight = (icon: string, title: string, desc: string, color = '#185FA5') => (
        <div key={title} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 28 }}>{icon}</div>
                <div>
                    <div style={{ fontWeight: 600, color, marginBottom: 4 }}>{title}</div>
                    <div style={{ fontSize: 13, color: '#374151' }}>{desc}</div>
                </div>
            </div>
        </div>
    );

    return (
        <div style={{ padding: '20px 24px' }}>
            <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 700 }}>🤖 AI Analysis</h1>
            <p style={{ color: '#6b7280', margin: '0 0 24px', fontSize: 14 }}>Auto-generated insights from last 30 days of data</p>

            {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Analyzing data...</p> : stats ? (
                <div style={{ display: 'grid', gap: 12 }}>
                    {insight('📊', 'Overall Performance', `${stats.total} calls handled in last 30 days with ${stats.resRate}% resolution rate. ${stats.closed} calls successfully closed.`, '#185FA5')}
                    {insight('💰', 'Revenue Insight', `₹${stats.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} earned from non-warranty calls. ${stats.wPct}% of calls were warranty (free service).`, '#059669')}
                    {stats.topEng && insight('👷', 'Top Performer', `${stats.topEng[0]} handled the most calls (${stats.topEng[1]}) this month. Consider recognizing their contribution.`, '#7c3aed')}
                    {insight('🔧', 'Service Mix', `${stats.carryIn} carry-in calls vs ${stats.onSite} on-site calls. ${stats.carryIn > stats.onSite ? 'Carry-in dominates — office capacity may need attention.' : 'On-site dominant — field team is active.'}`, '#d97706')}
                    {stats.resRate < 70 && insight('⚠️', 'Resolution Alert', `Resolution rate is ${stats.resRate}% — below 70% target. Review pending tickets and clear backlogs.`, '#dc2626')}
                    {stats.wPct > 60 && insight('📝', 'Warranty Heavy', `${stats.wPct}% of calls are warranty — revenue potential is limited. Consider upselling AMC contracts to reduce warranty dependency.`, '#0369a1')}

                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 14, fontSize: 13, color: '#1e40af' }}>
                        💡 <strong>Advanced AI Analysis</strong> with predictive insights, anomaly detection, and natural language queries is planned for a future update.
                    </div>
                </div>
            ) : (
                <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>No data available for analysis</p>
            )}
        </div>
    );
}