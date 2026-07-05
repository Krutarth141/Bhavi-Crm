// Exact Supabase schema:
// id (bigint), customer_name, mobile, product, serial_no,
// amc_start (date), amc_end (date), amc_amount, amc_type,
// visits_included, address, notes, created_by, updated_at, created_at

export interface AMCContract {
    id: number;
    customer_name: string;
    mobile?: string;
    product?: string;
    serial_no?: string;
    amc_start?: string;
    amc_end?: string;
    amc_amount?: number;
    amc_type?: string;
    visits_included?: number;
    address?: string;
    notes?: string;
    created_by?: string;
    created_at?: string;
    updated_at?: string;
}

export interface AMCFormData {
    customer_name: string;
    mobile: string;
    product: string;
    serial_no: string;
    amc_start: string;
    amc_end: string;
    amc_amount: string;
    amc_type: string;
    visits_included: string;
    address: string;
    notes: string;
}

export const emptyAMCForm: AMCFormData = {
    customer_name: '', mobile: '', product: '', serial_no: '',
    amc_start: '', amc_end: '', amc_amount: '',
    amc_type: 'Comprehensive', visits_included: '',
    address: '', notes: '',
};

export const AMC_TYPES = ['Comprehensive', 'Non-Comprehensive', 'Labour Only', 'Parts Only'];

export type AMCStatus = 'active' | 'expiring' | 'expired';

export const todayStr = () => new Date().toLocaleDateString('en-CA');
export const isExpired = (d?: string) => !!d && d < todayStr();
export const isExpiringSoon = (d?: string) => {
    if (!d) return false;
    const diff = (new Date(d).getTime() - Date.now()) / 86400000;
    return diff >= 0 && diff <= 30;
};