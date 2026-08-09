import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!sbUrl || !sbKey) {
            return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 500 });
        }

        const resp = await fetch(`${sbUrl}/functions/v1/bright-action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: sbKey, Authorization: `Bearer ${sbKey}` },
            body: JSON.stringify(body),
        });

        const text = await resp.text();
        if (!resp.ok) {
            return NextResponse.json({ error: text || `Edge function error (${resp.status})` }, { status: resp.status });
        }
        return new NextResponse(text, { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e: any) {
        return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
    }
}