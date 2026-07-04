import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

type SessionState = {
    step: 'MAIN_MENU' | 'SERVICE_TYPE' | 'MODEL_NUMBER' | 'PROBLEM' | 'ADDRESS' | 'CONFIRM' | 'STATUS_CHECK';
    data: {
        serviceType?: string;
        model?: string;
        problem?: string;
        address?: string;
    };
};

const sessions = new Map<string, SessionState>();

function getSession(phone: string): SessionState {
    const existing = sessions.get(phone);
    if (existing) return existing;
    const created: SessionState = { step: 'MAIN_MENU', data: {} };
    sessions.set(phone, created);
    return created;
}

function resetSession(phone: string) {
    sessions.set(phone, { step: 'MAIN_MENU', data: {} });
}

function mainMenu() {
    return [
        '🙏 *Namaste! Bhavi Electronics ma aavkaar chhe!*',
        '',
        'Shu joiye chhe?',
        '',
        '1️⃣ Service Request',
        '2️⃣ Ticket Status Check',
        '3️⃣ Engineer saathe vaat',
        '',
        '_Number select karo (1, 2, ya 3)_',
    ].join('\n');
}

function confirmMessage(data: SessionState['data']) {
    const lines = [
        '📝 *Confirm Karo*',
        '────────────────────',
        '',
        `🔧 Service: ${data.serviceType || '-'}`,
        `📱 Model: ${data.model || '-'}`,
        `🔹 Problem: ${data.problem || '-'}`,
    ];

    if (data.address) {
        lines.push(`📍 Address: ${data.address}`);
    }

    lines.push('', 'Sahi chhe?', '1️⃣ Confirm', '2️⃣ Cancel');
    return lines.join('\n');
}

async function generateTicketId() {
    const year = new Date().getFullYear();
    const { data } = await supabaseAdmin
        .from('tickets')
        .select('id')
        .ilike('id', `BEA-${year}-%`)
        .order('id', { ascending: false })
        .limit(1);

    let nextNum = 1;
    if (data && data.length > 0) {
        const last = String(data[0].id || '');
        const match = last.match(/BEA-\d+-(\d+)/);
        if (match) nextNum = Number(match[1]) + 1;
    }

    return `BEA-${year}-${String(nextNum).padStart(3, '0')}`;
}

async function fetchTicketStatus(query: string) {
    let dbQuery = supabaseAdmin
        .from('tickets')
        .select('id,status,assigned_name,model,problem,created_at');

    if (query.startsWith('BEA-') || query.startsWith('bea-')) {
        dbQuery = dbQuery.ilike('id', query.trim());
    } else {
        const digits = query.replace(/\D/g, '');
        dbQuery = dbQuery
            .or(`mobile.ilike.%${digits}%,alt_mobile.ilike.%${digits}%`)
            .order('created_at', { ascending: false })
            .limit(3);
    }

    const { data, error } = await dbQuery;
    if (error) throw error;
    return data || [];
}

async function createServiceTicket(phone: string, data: SessionState['data']) {
    const ticketId = await generateTicketId();

    const ticket = {
        id: ticketId,
        job_sheet: ticketId,
        call_type: 'Other',
        service_type: data.serviceType || 'Carry In',
        status: 'Pending Allocation',
        brand_name: 'Bhavi Electronics',
        model: data.model || '',
        serial: '',
        cname: phone,
        mobile: phone,
        city: '',
        problem: data.problem || '',
        assigned_name: '',
        warranty_coverage: 'NA',
        service_charges: data.serviceType === 'On Site' ? 649 : 413,
        final_charges: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        address: data.address || '',
    };

    const { error } = await supabaseAdmin.from('tickets').insert([ticket]);
    if (error) throw error;

    return ticketId;
}

function replyXml(text: string) {
    const safe = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${safe}</Message></Response>`;
}

async function handleMessage(fromPhone: string, incomingMsg: string) {
    const msg = incomingMsg.trim();
    const msgLow = msg.toLowerCase();
    const session = getSession(fromPhone);

    if (['hi', 'hello', 'menu', 'start', 'hii', 'hey'].includes(msgLow)) {
        resetSession(fromPhone);
        return mainMenu();
    }

    if (session.step === 'MAIN_MENU') {
        if (msg === '1') {
            session.step = 'SERVICE_TYPE';
            return [
                '*Service Request* 🔧',
                '',
                'Keva prakar ni service joiye chhe?',
                '',
                '1️⃣ Carry In (Shop par lavo)',
                '2️⃣ On Site (Ghar par aaviye)',
                '',
                '_(Cancel mate "menu" likho)_',
            ].join('\n');
        }

        if (msg === '2') {
            session.step = 'STATUS_CHECK';
            return [
                '*Ticket Status* 📋',
                '',
                'Tamaro Ticket ID (BEA-2026-XXX) ya',
                'Registered Mobile Number aapvo:',
            ].join('\n');
        }

        if (msg === '3') {
            return [
                '*Engineer Support* 👨‍🔧',
                '',
                `Amara engineer saathe seedha vaat karo:`,
                '📞 +91 9574004969',
                '',
                '_(WhatsApp par message pan kari shako cho)_',
            ].join('\n');
        }

        return mainMenu();
    }

    if (session.step === 'SERVICE_TYPE') {
        if (msg === '1') session.data.serviceType = 'Carry In';
        else if (msg === '2') session.data.serviceType = 'On Site';
        else {
            return ['1 ya 2 select karo:', '1️⃣ Carry In', '2️⃣ On Site'].join('\n');
        }

        session.step = 'MODEL_NUMBER';
        return 'Tamara device no *Model Number* aapvo:\n_(Example: Samsung Galaxy A54, LG 1.5T AC, Sony TV 43")_';
    }

    if (session.step === 'MODEL_NUMBER') {
        session.data.model = msg;
        session.step = 'PROBLEM';
        return '*Problem describe karo*:\n_(Example: Screen touch nathi kaam karta, AC cooling nathi karta, TV start nathi thaato)_';
    }

    if (session.step === 'PROBLEM') {
        session.data.problem = msg;
        if (session.data.serviceType === 'On Site') {
            session.step = 'ADDRESS';
            return 'Tamaro *Address* aapvo (On Site service mate):';
        }

        session.step = 'CONFIRM';
        return confirmMessage(session.data);
    }

    if (session.step === 'ADDRESS') {
        session.data.address = msg;
        session.step = 'CONFIRM';
        return confirmMessage(session.data);
    }

    if (session.step === 'CONFIRM') {
        if (msg === '1' || msgLow === 'yes' || msgLow === 'ha') {
            try {
                const phone = fromPhone.replace('whatsapp:+', '');
                const ticketId = await createServiceTicket(phone, session.data);
                resetSession(fromPhone);
                return [
                    '✅ *Ticket Create Thayu!*',
                    '',
                    `🎫 Ticket ID: *${ticketId}*`,
                    '📱 Aa ID save karo — status check mate kaam aavse',
                    '',
                    '⏰ Amaro team 2-4 kalaak ma contact karse',
                    '',
                    'Aabhaar! Bhavi Electronics 🙏',
                    '',
                    '_(Biji madad mate "menu" likho)_',
                ].join('\n');
            } catch (err) {
                console.error('Ticket create error:', err);
                return '⚠️ System error aavyo. Thodi var bad try karo ya direct call karo:\n📞 +91 9574004969';
            }
        }

        if (msg === '2' || msgLow === 'no' || msgLow === 'na') {
            resetSession(fromPhone);
            return `Okay! Request cancel karyu.\n\n${mainMenu()}`;
        }

        return ['1 ya 2 aapvo:', '1️⃣ Confirm', '2️⃣ Cancel'].join('\n');
    }

    if (session.step === 'STATUS_CHECK') {
        try {
            const tickets = await fetchTicketStatus(msg);
            resetSession(fromPhone);

            if (!tickets.length) {
                return [
                    '❌ Koi ticket maldyu nahi.',
                    '',
                    'Bari check karo:',
                    '• Ticket ID: BEA-2026-XXX format ma hovo joiye',
                    '• Mobile: registered number aapvo',
                    '',
                    '_(Navi help mate "menu" likho)_',
                ].join('\n');
            }

            const statusEmojiMap: Record<string, string> = {
                Pending: '⏳',
                'In Progress': '🔧',
                Completed: '✅',
                Cancelled: '❌',
            };

            let response = `📋 *Ticket Status*\n${'─'.repeat(25)}\n\n`;
            tickets.forEach((ticket: any, index: number) => {
                const statusEmoji = statusEmojiMap[String(ticket.status)] || '📌';

                response += `*${index + 1}. ${ticket.id}*\n`;
                response += `📱 Model: ${ticket.model || '-'}\n`;
                response += `🔹 Problem: ${ticket.problem || '-'}\n`;
                response += `${statusEmoji} Status: *${ticket.status}*\n`;
                if (ticket.assigned_name) {
                    response += `👨‍🔧 Engineer: ${ticket.assigned_name}\n`;
                }
                response += `📅 Date: ${new Date(ticket.created_at).toLocaleDateString('en-IN')}\n\n`;
            });

            response += '_(Navi help mate "menu" likho)_';
            return response;
        } catch (err) {
            console.error('Status fetch error:', err);
            resetSession(fromPhone);
            return '⚠️ Status fetch karta error aavyo. Thodi var bad try karo.\n\n_(Menu mate "menu" likho)_';
        }
    }

    return mainMenu();
}

export async function POST(request: NextRequest) {
    try {
        const bodyText = await request.text();
        const params = new URLSearchParams(bodyText);
        const from = params.get('From') || '';
        const message = params.get('Body') || '';

        const replyText = await handleMessage(from, message);
        return new NextResponse(replyXml(replyText), {
            status: 200,
            headers: { 'Content-Type': 'text/xml; charset=utf-8' },
        });
    } catch (error) {
        console.error('Webhook error:', error);
        return new NextResponse(replyXml('⚠️ Technical issue. Thodi var bad try karo.'), {
            status: 200,
            headers: { 'Content-Type': 'text/xml; charset=utf-8' },
        });
    }
}