export interface PunchLog {
    id: string;
    eng_id?: string;
    eng_name: string;
    punch_in_date: string;
    punch_in_time?: string;
    punch_out_time?: string;
    punch_in_photo?: string;
    punch_out_photo?: string;
    punch_in_lat?: number;
    punch_in_lng?: number;
    punch_in_accuracy?: number;
    punch_out_lat?: number;
    punch_out_lng?: number;
    working_minutes?: number;
    overtime_minutes?: number;
    is_late?: boolean;
    pending_edit?: any;
    start_meter?: string;
    end_meter?: string;
    status: 'active' | 'late_pending' | 'verified';
    admin_remark?: string;
    verified_by?: string;
    meter_photo_url?: string;
    created_at?: string;
    updated_at?: string;
}

// Roster-mode placeholder for an employee with no punch row on the selected day.
export interface RosterRow {
    notPunched: true;
    eng_id: string;
    eng_name: string;
    punch_in_date: string;
}

// Office/reception logins that never punch in/out — excluded from the
// Attendance Report entirely (matches HTML's ATT_EXCLUDED_IDS).
export const ATT_EXCLUDED_IDS = ['WC001', 'WC002', 'ENG008'];