import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!sbUrl || !sbKey) {
            return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });
        }

        const response = await fetch(`${sbUrl}/functions/v1/device-alert`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: sbKey,
                Authorization: `Bearer ${sbKey}`,
            },
            body: JSON.stringify(body),
        });
        const text = await response.text();
        return new NextResponse(text, {
            status: response.status,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
