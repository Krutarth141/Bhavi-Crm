// engineer_targets: id (bigint), eng_id, eng_name, month (YYYY-MM),
// target_calls, target_amount, updated_at

export interface EngineerTarget {
    id: number;
    eng_id: string;
    eng_name: string;
    month: string; // YYYY-MM
    target_calls?: number;
    target_amount?: number;
    updated_at?: string;
}

export interface TargetFormData {
    eng_id: string;
    eng_name: string;
    month: string;
    target_calls: string;
    target_amount: string;
}

export const emptyTargetForm: TargetFormData = {
    eng_id: '', eng_name: '', month: '', target_calls: '', target_amount: '',
};

export const currentMonth = () => new Date().toISOString().slice(0, 7);