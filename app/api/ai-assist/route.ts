import { NextRequest, NextResponse } from 'next/server';

const GEMINI_URL = (key: string) =>
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;

const PROMPTS: Record<string, string> = {
    update: 'You are a field service engineer at Bhavi Electronics & Automation, a CCTV/camera and printer service center in Ahmedabad, India. Write a professional, concise service update remark based on the rough notes provided. Write in clear professional English. The remark should describe what work was done, current status, and next steps if any. Keep it 2-4 sentences. Be specific and professional. Do not use placeholder text.',
    feedback: 'You are writing on behalf of a customer who received service from Bhavi Electronics & Automation. Write a professional customer satisfaction feedback comment based on the rough notes provided. Write in clear professional English. The feedback should reflect the customer experience — mention service quality, engineer behavior, and resolution. Keep it 2-3 sentences. Make it sound genuine and natural.',
    worklog: 'You are a field service engineer at Bhavi Electronics & Automation, a CCTV/camera and printer service center in Ahmedabad, India. Write a professional work log entry describing the task completed, based on the rough notes provided. Write in clear professional English. Include what was done, any issues encountered, and outcome. Keep it 1-3 sentences. Be specific.',
    dailyreport: "You are a service engineer at Bhavi Electronics & Automation writing your daily activity report. Summarize the day's work professionally based on the rough notes provided. Write in clear professional English. Mention tickets handled, tasks completed, and any pending items. Keep it 3-5 sentences.",
    visit: 'You are a field service engineer at Bhavi Electronics & Automation writing a site visit report. Describe the work done at the customer site based on the rough notes provided. Write in clear professional English. Include observations, work performed, and recommendations. Keep it 2-4 sentences.',
    inquiry: 'You are a sales/service coordinator at Bhavi Electronics & Automation. Write a professional description for this service/product inquiry based on the rough notes provided. Write in clear professional English. Be clear about requirements and any special notes. Keep it 2-3 sentences.',
};

export async function POST(req: NextRequest) {
    try {
        const { roughText, type } = await req.json();
        const key = process.env.GEMINI_API_KEY;
        if (!key) {
            return NextResponse.json({ error: 'GEMINI_API_KEY not configured on the server.' }, { status: 500 });
        }
        if (!roughText || !String(roughText).trim()) {
            return NextResponse.json({ error: 'roughText is required.' }, { status: 400 });
        }

        const systemPrompt = PROMPTS[type] || PROMPTS.update;
        const fullPrompt = `${systemPrompt}\n\nHere are the rough notes:\n${roughText}\n\nPlease write the remark now.`;

        const resp = await fetch(GEMINI_URL(key), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: fullPrompt }] }],
                generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
            }),
        });

        if (!resp.ok) {
            const err = await resp.text();
            return NextResponse.json({ error: `Gemini API error: ${err}` }, { status: 502 });
        }

        const data = await resp.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        return NextResponse.json({ text: String(text).trim() });
    } catch (e: any) {
        return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
    }
}