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
    remarks?: string;
    created_at?: string;
    updated_at?: string;
}

export interface ApprovalSpare {
    name?: string;
    code?: string;
    qty?: number;
    price?: number;
    gst_pct?: number;
    requested?: boolean;
    stock_deducted?: boolean;
    warranty_chargeable?: boolean;
}

// Mirrors HTML's estimate modal (index.html:6868-6874, calcApprovalTotal) —
// a single flat ₹ discount subtracted from parts+service, not two
// independent percentage discounts. `partsAmt` is auto-filled from the
// requested spares total but stays directly editable, same as HTML's
// #est-parts field.
export interface EstimateForm {
    partsAmt: string;
    labourAmt: string;
    discount: string;
    remark: string;
}

export const emptyEstimateForm: EstimateForm = {
    partsAmt: '0',
    labourAmt: '0',
    discount: '0',
    remark: '',
};

export const calcEstimate = (form: EstimateForm) => {
    const parts = Number(form.partsAmt) || 0;
    const labour = Number(form.labourAmt) || 0;
    const discount = Number(form.discount) || 0;
    const final = Math.max(0, parts + labour - discount);
    return { parts, labour, discount, final };
};