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
  created_at: string;
}

export interface PunchLog {
  id: string;
  eng_id: string;
  eng_name: string;
  log_date: string;
  punch_in_time?: string;
  start_meter?: number;
  punch_out_time?: string;
  end_meter?: number;
  notes?: string;
  created_at: string;
}
