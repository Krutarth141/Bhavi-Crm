export interface PunchLog {
    id: string;
    eng_name: string;
    punch_in_date: string;
    punch_in_time?: string;
    punch_out_time?: string;
    start_meter?: string;
    end_meter?: string;
    status: 'active' | 'late_pending' | 'verified';
    admin_remark?: string;
    verified_by?: string;
    meter_photo_url?: string;
    created_at?: string;
    updated_at?: string;
}

export interface AttendanceFilter {
    date?: string;
    engineer?: string;
    status?: string;
}