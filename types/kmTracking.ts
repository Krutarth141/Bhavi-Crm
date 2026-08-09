export interface KmLog {
    id: number;
    eng_id: string;
    eng_name?: string;
    log_date: string;
    entry_type: 'opening' | 'arrival' | 'closing';
    ticket_id?: string | null;
    odometer_km: number;
    photo_url?: string | null;
    lat?: number | null;
    lng?: number | null;
    gps_accuracy?: number | null;
    captured_at: string;
    edit_remark?: string | null;
    corrected_by?: string | null;
    edited_at?: string | null;
    created_at?: string;
}

export interface KmReportEntry extends KmLog {
    area?: string;
    segmentKm?: number | null;
}

export interface KmDayGroup {
    eng_id: string;
    eng_name: string;
    date: string;
    dateLabel: string;
    entries: KmReportEntry[];
    opening: number | null;
    closing: number | null;
    totalKm: number;
    startLabel: string;
    startMapsUrl: string;
    endLabel: string;
    endMapsUrl: string;
}