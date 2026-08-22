import { supabase } from '@/lib/supabase';
import { createTicket } from '@/services/ticketService';
import { ServiceDef, ExistingCustomer } from '@/types/bookingPortal';

export const checkCustomerByMobile = async (mobile: string): Promise<ExistingCustomer | null> => {
    const { data } = await supabase.from('customers').select('*').eq('mobile', mobile).order('updated_at', { ascending: false }).limit(1);
    if (data && data.length) return data[0];
    return null;
};

export const saveCustomerRecord = async (params: {
    cname: string; mobile: string; altMobile: string; address: string; city: string; pin: string; state: string;
}): Promise<void> => {
    try {
        await supabase.from('customers').insert([{
            cname: params.cname, mobile: params.mobile, alt_mobile: params.altMobile || null,
            address: params.address, city: params.city, pin: params.pin, state: params.state,
            area: '', updated_at: new Date().toISOString(),
        }]);
    } catch { /* best-effort — ticket creation below is what matters */ }
};

export const submitRepairTicket = async (params: {
    svc: ServiceDef; repairType: 'onsite' | 'carry-in';
    custName: string; mobile: string; altMobile: string; address: string; city: string; pin: string; state: string;
    modelNo: string; serialNo: string; warrantyType: string; problem: string; remarks: string; signatureB64: string;
}): Promise<{ success: boolean; id?: string; error?: string }> => {
    const isCarryIn = params.repairType === 'carry-in';
    const svcCharges = isCarryIn ? 413 : 649;
    const svcTypeStr = isCarryIn
        ? (params.svc.repairCat === 'scanner' ? 'Scanner Carry In' : 'Printer Carry In')
        : (params.svc.repairCat === 'scanner' ? 'Scanner Onsite' : 'Printer Onsite');
    const desc = `Customer Complaint (Self-Service Portal)\nService Type: ${isCarryIn ? 'Carry In' : 'Onsite Visit'}\nModel: ${params.modelNo}${params.serialNo ? `\nSerial: ${params.serialNo}` : ''}\nWarranty: ${params.warrantyType === 'out_of_warranty' ? 'Out of Warranty' : 'Not Sure'}${params.remarks ? `\nRemarks: ${params.remarks}` : ''}`;

    return createTicket({
        call_type: params.warrantyType === 'out_of_warranty' ? 'Non-Warranty' : 'Other',
        service_type: svcTypeStr,
        status: isCarryIn ? 'Pending Customer Arrival' : 'Pending Allocation',
        brand_name: '',
        model: params.modelNo,
        serial: params.serialNo || '',
        cname: params.custName,
        mobile: params.mobile,
        alt_mobile: params.altMobile,
        address: params.address,
        city: params.city,
        pin: params.pin,
        state: params.state,
        area: '',
        problem: params.problem,
        description: desc,
        assigned_name: '',
        warranty_coverage: params.warrantyType === 'out_of_warranty' ? 'NA' : 'Other',
        wc_type: 'CSP',
        service_charges: svcCharges,
        customer_signature: params.signatureB64 || undefined,
        timeline: [{ action: 'Complaint Registered', by: 'Customer Self-Service', at: new Date().toISOString(), note: `Via service portal — ${params.svc.name} (${isCarryIn ? 'Carry In' : 'Onsite'})` }],
    } as any);
};

export const submitInquiry = async (params: {
    svc: ServiceDef; custName: string; mobile: string; address: string; city: string; state: string;
    fieldValues: Record<string, string>; remarks: string;
}): Promise<{ success: boolean; error?: string }> => {
    try {
        let inqDesc = `Inquiry via Service Portal — ${params.svc.name}\n`;
        Object.entries(params.fieldValues).forEach(([k, v]) => { if (v) inqDesc += `${k}: ${v}\n`; });
        if (params.remarks) inqDesc += `Remarks: ${params.remarks}\n`;
        inqDesc += `Address: ${params.address}${params.city ? `, ${params.city}` : ''}${params.state ? `, ${params.state}` : ''}`;

        const { error } = await supabase.from('auto_inquiries').insert([{
            customer_name: params.custName, mobile: params.mobile,
            address: `${params.address}${params.city ? `, ${params.city}` : ''}${params.state ? `, ${params.state}` : ''}`,
            inquiry_type: params.svc.inqType, description: inqDesc, status: 'Open',
            created_by: 'Customer Portal', updated_at: new Date().toISOString(),
        }]);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};