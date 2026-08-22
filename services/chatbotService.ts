import { supabase } from '@/lib/supabase';
import { createTicket } from '@/services/ticketService';
import { Ticket } from '@/types/tickets';
import { Lang } from '@/types/bookingPortal';
import { ChatFlowResult } from '@/types/chatbot';
import { t, fmt, SERVICE_CHARGES } from '@/lib/chatbotContent';

export const deviceBrand = (deviceLabel: string): string => {
    const d = (deviceLabel || '').toLowerCase();
    if (d.includes('panasonic')) return 'Panasonic';
    if (d.includes('fujifilm') || d.includes('instax')) return 'Fujifilm';
    if (d.includes('godox')) return 'Godox';
    if (d.includes('projector')) return 'Casio';
    if (d.includes('casio')) return 'Casio';
    if (d.includes('canon') || d.includes('scanner')) return 'Canon';
    return '';
};

export const checkOnsiteAvailability = async (serviceMode: string | undefined, model: string | undefined): Promise<boolean> => {
    if (serviceMode !== 'Onsite' || !model) return false;
    try {
        const { data } = await supabase.from('models').select('onsite_applicable').ilike('model_no', `%${model.trim()}%`).limit(1);
        if (data && data.length && (data[0] as any).onsite_applicable === false) return true;
    } catch { /* ignore */ }
    return false;
};

export const resolveCharge = async (serviceMode: string | undefined, model: string | undefined, device: string): Promise<{ amount: number | null }> => {
    if (model) {
        try {
            const { data } = await supabase.from('models').select('model_no, carry_in_charge, onsite_charge').ilike('model_no', `%${model.trim()}%`).limit(1);
            if (data && data.length) {
                const row = data[0] as any;
                const amount = serviceMode === 'Onsite' ? row.onsite_charge : row.carry_in_charge;
                if (amount != null) return { amount: Number(amount) };
            }
        } catch { /* ignore */ }
    }
    const rates = SERVICE_CHARGES[device];
    let amount: number | null = null;
    if (rates && serviceMode && rates[serviceMode as 'Onsite' | 'CarryIn'] !== undefined) {
        amount = rates[serviceMode as 'Onsite' | 'CarryIn'];
    }
    return { amount };
};

const createServiceTicket = async (a: Record<string, string>, ctx: Record<string, any>, chargeAmount: number): Promise<string> => {
    const isCarryIn = a.serviceMode ? a.serviceMode === 'CarryIn' : true;
    const serviceType = isCarryIn ? 'Carry In' : 'On Site';
    const callType = a.warrantyStatus === 'Warranty' ? 'Warranty' : 'Non-Warranty';
    const problemText = `${ctx.issue || ''}${a.problem ? ' — ' + a.problem : ''}`;
    const descLines = [
        'Booked via Bhavi AI Assistant (Customer Portal)',
        `Device: ${ctx.device || ''}`,
        `Issue: ${ctx.issue || ''}`,
    ];
    if (a.model) descLines.push(`Model: ${a.model}`);
    if (a.serial) descLines.push(`Serial: ${a.serial}`);
    if (a.problem) descLines.push(`Details: ${a.problem}`);
    descLines.push(`Photo: ${a.photo === 'Share Now' ? 'Customer will share now' : 'Will show at store visit'}`);
    if (a.warrantyStatus === 'Warranty') {
        descLines.push(`Warranty: Claimed${a.invoiceAvailable === 'Yes' ? ` (invoice available, date: ${a.invoiceDate || '-'})` : ' (no invoice)'}`);
    } else {
        descLines.push('Warranty: Non-Warranty / Chargeable');
    }
    if (a.date) descLines.push(`Preferred date/time: ${a.date}`);

    const result = await createTicket({
        call_type: callType,
        service_type: serviceType,
        status: isCarryIn ? 'Pending Customer Arrival' : 'Pending Allocation',
        brand_name: deviceBrand(ctx.device || ''),
        model: a.model || '',
        serial: a.serial || '',
        cname: a.name,
        mobile: a.mobile,
        alt_mobile: '',
        address: '',
        city: a.city || '',
        pin: '',
        state: '',
        area: '',
        problem: problemText,
        description: descLines.join('\n'),
        action: '',
        assigned_name: '',
        warranty_coverage: a.warrantyStatus === 'Warranty' ? null : 'NA',
        wc_type: 'CSP',
        service_charges: chargeAmount,
        timeline: [{ action: 'Complaint Registered', by: 'Customer (AI Assistant)', at: new Date().toISOString(), note: `Via Bhavi AI Assistant — ${ctx.device || ''} / ${ctx.issue || ''}` }],
    } as Partial<Ticket>);

    if (!result.success || !result.id) throw new Error(result.error || 'Failed to create ticket');
    return result.id;
};

export const bookServiceTicket = async (
    a: Record<string, string>, ctx: Record<string, any>, onsiteSwapped: boolean, chargeAmount: number, lang: Lang
): Promise<ChatFlowResult> => {
    const ticketId = await createServiceTicket(a, ctx, chargeAmount);
    const msg = (onsiteSwapped ? t(lang, 'msg_onsiteNotAvailable') + '\n\n' : '')
        + fmt(t(lang, 'msg_ticketCreated'), { ticketId, device: ctx.device || '', issue: ctx.issue || '' });
    return { message: msg, chips: [{ label: t(lang, 'chip_trackRepair'), action: { type: 'flow', id: 'trackRepair' } }] };
};

export const submitAutoInquiry = async (params: {
    inquiryType: string; name: string; mobile: string; city?: string; description: string;
}): Promise<void> => {
    try {
        await supabase.from('auto_inquiries').insert([{
            customer_name: params.name || '', mobile: params.mobile || '', address: params.city || '',
            inquiry_type: params.inquiryType, description: params.description,
            status: 'Open', created_by: 'Bhavi AI Assistant', updated_at: new Date().toISOString(),
        }]);
    } catch { /* best-effort */ }
};

export const trackLookup = async (ref: string): Promise<Ticket[]> => {
    const clean = (ref || '').trim();
    const digits = clean.replace(/\D/g, '');
    const isMobile = /^\d{10}$/.test(digits);
    if (isMobile) {
        const { data } = await supabase.from('tickets').select('*').eq('mobile', digits).order('created_at', { ascending: false }).limit(10);
        return data || [];
    }
    const { data } = await supabase.from('tickets').select('*').eq('id', clean.toUpperCase()).limit(1);
    return data || [];
};