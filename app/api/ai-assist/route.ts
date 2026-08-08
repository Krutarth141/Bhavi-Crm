import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { roughText, type } = await req.json();
        const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!sbUrl || !sbKey) {
            return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 500 });
        }
        if (!roughText || !String(roughText).trim()) {
            return NextResponse.json({ error: 'roughText is required.' }, { status: 400 });
        }

        const resp = await fetch(`${sbUrl}/functions/v1/ai-assist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: sbKey, Authorization: `Bearer ${sbKey}` },
            body: JSON.stringify({ context: roughText, type }),
        });

        const data = await resp.json();
        if (!resp.ok || data.error) {
            return NextResponse.json({ error: data.error || `Edge function error (${resp.status})` }, { status: resp.status === 200 ? 502 : resp.status });
        }

        return NextResponse.json({ text: String(data.text || '').trim() });
    } catch (e: any) {
        return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
    }
}