export interface TicketSpareLite {
    qty?: number;
    price?: number;
}

export interface PaymentTicket {
    id: string;
    cname?: string;
    mobile?: string;
    area?: string;
    model?: string;
    payment_mode?: string;
    service_charges?: number;
    final_charges?: number;
    labor?: number;
    other_charge?: number;
    spares?: TicketSpareLite[];
    updated_at?: string;
    assigned_to?: string;
    assigned_name?: string;
    payment_received?: boolean;
    payment_received_at?: string | null;
    payment_received_by?: string | null;
    payment_collected_by?: string | null;
    payment_collected_by_id?: string | null;
    invoice_done?: boolean;
    invoice_no?: string | null;
    timeline?: any[];
    // index.html:11780-11802 — "Other Work" (field_tasks) rows that collected
    // payment in the field get merged into this same list, tagged FT-<id>.
    _isFt?: boolean;
    _ftRealId?: number;
    payment_splits?: { mode: string; amount: number }[] | null;
}

export interface PcBreakdown {
    parts: number;
    labor: number;
    other: number;
    total: number;
}

export interface PcEngineerGroup {
    name: string;
    pendingRows: PaymentTicket[];
    receivedRows: PaymentTicket[];
    pending: number;
    received: number;
}