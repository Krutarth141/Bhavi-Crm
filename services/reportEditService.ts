import { supabase } from '@/lib/supabase';

export const CALL_TYPES = ['Warranty', 'Non-Warranty', 'AMC', 'Warranty Repeat', 'Non-Warranty Repeat', 'Other'];
export const SERVICE_TYPES = ['Carry In', 'On Site'];
export const IMPORT_STATUSES = [
    'Pending Allocation', 'Assigned', 'In Progress',
    'Pending Customer Approval', 'Pending Parts',
    'Pending Repair Carry In', 'Pending Repair On Site',
    'Closed', 'Call Cancel', 'Customer Reject',
];

export interface ImportRow {
    row: number;
    cname: string;
    mobile: string;
    model: string;
    serial: string;
    brand_name: string;
    problem: string;
    call_type: string;
    service_type: string;
    status: string;
    assigned_name: string;
    address: string;
    pin: string;
    remarks: string;
    errors: string[];
    valid: boolean;
}

export const validateRow = (r: any, rowNum: number): ImportRow => {
    const errors: string[] = [];
    const cname = String(r['Customer Name'] || '').trim();
    const mobile = String(r['Mobile'] || '').trim();
    const call_type = String(r['Call Type'] || '').trim();
    const service_type = String(r['Service Type'] || '').trim();
    const status = String(r['Status'] || 'Pending Allocation').trim();

    if (!cname) errors.push('Customer Name required');
    if (!mobile) errors.push('Mobile required');
    if (!CALL_TYPES.includes(call_type)) errors.push(`Invalid Call Type: "${call_type}"`);
    if (!SERVICE_TYPES.includes(service_type)) errors.push(`Invalid Service Type: "${service_type}"`);
    if (!IMPORT_STATUSES.includes(status)) errors.push(`Invalid Status: "${status}"`);

    return {
        row: rowNum,
        cname,
        mobile,
        model: String(r['Model'] || '').trim(),
        serial: String(r['Serial No'] || '').trim(),
        brand_name: String(r['Brand'] || '').trim(),
        problem: String(r['Problem'] || '').trim(),
        call_type,
        service_type,
        status,
        assigned_name: String(r['Engineer Name'] || '').trim(),
        address: String(r['Address'] || '').trim(),
        pin: String(r['PIN'] || '').trim(),
        remarks: String(r['Remarks'] || '').trim(),
        errors,
        valid: errors.length === 0,
    };
};

export const importTickets = async (
    rows: ImportRow[],
    createdBy: string,
    wcName: string
): Promise<{ success: number; errors: number }> => {
    let success = 0, errors = 0;
    for (const r of rows.filter(r => r.valid)) {
        try {
            const jsNo = 'IMP-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
            const { error } = await supabase.from('tickets').insert([{
                js_no: jsNo,
                cname: r.cname,
                mobile: r.mobile,
                model: r.model || null,
                serial: r.serial || null,
                brand_name: r.brand_name || null,
                problem: r.problem || null,
                call_type: r.call_type,
                service_type: r.service_type,
                status: r.status,
                assigned_name: r.assigned_name || null,
                address: r.address || null,
                pin: r.pin || null,
                remarks: r.remarks || null,
                created_by: createdBy,
                wc_name: wcName,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }]);
            if (error) { errors++; } else { success++; }
        } catch { errors++; }
    }
    return { success, errors };
};