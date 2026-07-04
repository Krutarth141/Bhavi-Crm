import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        status: 'Bhavi Electronics CRM running',
        time: new Date().toISOString(),
    });
}