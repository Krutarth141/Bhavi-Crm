export interface TicketRevenue {
    id: string;
    assigned_name?: string;
    call_type?: string;
    status?: string;
    service_charges?: number;
    final_charges?: number;
    labor?: number;
    other_charge?: number;
    created_at?: string;
    spares?: { qty: number; price: number; requested?: boolean }[];
}

export interface EngineerRevenue {
    name: string;
    calls: number;
    closed: number;
    parts: number;
    service: number;
    total: number;
}

export interface MonthRevenue {
    month: string;
    calls: number;
    parts: number;
    service: number;
    total: number;
}

export const calcTicketRevenue = (t: TicketRevenue): number => {
    const fin = parseFloat(String(t.final_charges || 0));
    if (fin > 0) return fin;
    const svc = parseFloat(String(t.service_charges || 0));
    const lab = parseFloat(String(t.labor || 0));
    const oth = parseFloat(String(t.other_charge || 0));
    const parts = (t.spares || []).filter(s => !s.requested).reduce((a, s) => a + (s.qty || 0) * (s.price || 0), 0);
    return svc + lab + oth + parts;
};