export interface WorkLog {
  id: string;
  eng_id: string;
  eng_name: string;
  member_role: string;
  log_date: string;
  from_time: string;
  to_time: string;
  task_description: string;
  log_type?: string;
  /** Set only by the ticket auto-logging paths (Visit/Work/Hold/Close). */
  ticket_id?: string | null;
  /** Set only by the automation site-visit auto-logging paths. */
  site_visit_id?: number | null;
  created_at: string;
}

export interface PunchLog {
  id: string;
  eng_id: string;
  eng_name: string;
  punch_in_date?: string;
  punch_in_time?: string;
  punch_out_date?: string;
  punch_out_time?: string;
  start_meter?: number;
  end_meter?: number;
  status?: 'active' | 'verified' | 'late_pending' | 'done';
  is_late?: boolean;
  late_remark?: string;
  is_next_day?: boolean;
  admin_remark?: string;
  verified_by?: string;
  punch_in_photo?: string | null;
  punch_out_photo?: string | null;
  punch_in_lat?: number | null;
  punch_in_lng?: number | null;
  punch_out_lat?: number | null;
  punch_out_lng?: number | null;
  working_minutes?: number;
  overtime_minutes?: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
}