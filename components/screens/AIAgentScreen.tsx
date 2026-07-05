'use client';

// AI Agent — future feature placeholder
// HTML CRM ma ae feature nahi hatu — NextJS ma placeholder rakhu chhu
export default function AIAgentScreen() {
    return (
        <div style={{ padding: '20px 24px' }}>
            <h1 style={{ margin: '0 0 24px', fontSize: 28, fontWeight: 700 }}>🤖 Virtual AI Agent</h1>
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: 48, textAlign: 'center', maxWidth: 500, margin: '0 auto' }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>🤖</div>
                <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>Coming Soon</h2>
                <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 20px', lineHeight: 1.6 }}>
                    The AI Agent feature will allow you to interact with your CRM data using natural language. Ask questions, get insights, and automate tasks through a conversational interface.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left', background: '#f9fafb', borderRadius: 8, padding: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Planned features:</div>
                    {[
                        '🔍 "Show me all pending tickets for engineer Shailesh"',
                        '📊 "How much revenue did we generate this month?"',
                        '📞 "Create a new ticket for customer Ramesh Shah"',
                        '⚠️ "Which tickets are overdue?"',
                    ].map(f => (
                        <div key={f} style={{ fontSize: 12, color: '#6b7280' }}>{f}</div>
                    ))}
                </div>
            </div>
        </div>
    );
}