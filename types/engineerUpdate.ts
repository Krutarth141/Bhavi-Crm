import { TicketSpare } from '@/types/tickets';

// Exact tickets table columns used in engineer update
export interface EngineerTicket {
    id: string;
    job_sheet?: string;      // was js_no — correct column name
    cname?: string;
    mobile?: string;
    model?: string;
    serial?: string;
    brand_name?: string;
    problem?: string;
    call_type?: string;
    service_type?: string;
    warranty_coverage?: string; // needed by getAllowedStatuses
    assigned_name?: string;
    status?: string;
    service_charges?: number;
    labor?: number;
    address?: string;
    area?: string;
    city?: string;
    pin?: string;
    timeline?: any[];
    created_at?: string;
    updated_at?: string;
    warranty_claim_pending?: boolean;
    fault_code?: string;
    spares?: TicketSpare[];
    rerepair?: boolean;
    rerepair_foc?: boolean;
    visit_in?: string;
    visit_date?: string;
    visit_out?: string;
    meter_start?: string;
    meter_end?: string;
    se_call_id?: string;
    page_count?: number;
    other_charge?: number;
    wc_type?: string;
    work_done?: string;
    eng_remarks?: string;
    final_charges?: number;
    charges_note?: string;
    payment_mode?: string;
    jobsheet_photo?: string | null;
    attachments?: string[] | string | null;
    out_of_coverage?: boolean;
}

// One Attachments slot in the update modal: slot 0 = Job Sheet, slots 1-2 =
// extra photos. isNew separates a freshly-picked data: URL (still to be
// uploaded) from an already-stored public URL (index.html:7319-7322).
export interface PhotoSlot { url: string; isNew: boolean }

// Payment Confirmation popup result (index.html:16289 showPaymentConfirmation
// → confirmPayment).
export interface PaymentConfirmData {
    cname: string;
    payment_mode: string;
    service_charges: number;
    parts_cost: number;
    payment_notes: string;
}

export interface UpdateForm {
    newStatus: string;
    note: string;
    labour: string;
    faultCode: string;
    workDone?: string;
    seCallId?: string;
    pageCount?: string;
    pageCountSkip?: boolean;
    pageCountSkipReason?: string;
    otherCharge?: string;
    visitDate?: string;
    visitIn?: string;
    visitOut?: string;
    meterStart?: string;
    meterEnd?: string;
    mscCenter?: string;
}