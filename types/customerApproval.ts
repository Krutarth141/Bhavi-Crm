// Ticket in 'Pending Customer Approval' status
// Table: tickets

export interface ApprovalTicket {
    id: string;
    js_no?: string;
    cname?: string;
    mobile?: string;
    model?: string;
    serial?: string;
    brand_name?: string;
    problem?: string;
    call_type?: string;
    service_type?: string;
    assigned_name?: string;
    status?: string;
    service_charges?: number;
    labor?: number;
    final_charges?: number;
    spares?: ApprovalSpare[];
    timeline?: any[];
    created_at?: string;
    updated_at?: string;
}

export interface ApprovalSpare {
    name?: string;
    code?: string;
    qty?: number;
    price?: number;
    requested?: boolean;
}

export interface EstimateForm {
    labourAmt: string;
    partsDisc: string;
    labourDisc: string;
    remark: string;
}

export const emptyEstimateForm: EstimateForm = {
    labourAmt: '0',
    partsDisc: '0',
    labourDisc: '0',
    remark: '',
};

export const calcEstimate = (form: EstimateForm, spares: ApprovalSpare[]) => {
    const partsTotal = spares.filter(s => s.requested).reduce((s, sp) => s + (sp.qty || 0) * (sp.price || 0), 0);
    const partsAfterDisc = partsTotal * (1 - Number(form.partsDisc) / 100);
    const labourAfterDisc = Number(form.labourAmt) * (1 - Number(form.labourDisc) / 100);
    const final = partsAfterDisc + labourAfterDisc;
    const saved = (partsTotal - partsAfterDisc) + (Number(form.labourAmt) - labourAfterDisc);
    return { partsTotal, partsAfterDisc, labourAfterDisc, final, saved };
};