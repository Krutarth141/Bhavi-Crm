// ─── Exact Supabase tables ────────────────────────────────────────────────────
// eng_stock:     id, owner (eng_name), part_id, qty, updated_at
// eng_movements: id, created_at, type, part_id, qty, from_owner, to_owner,
//                job_sheet, warranty, notes, created_by

export interface EngStock {
  id: string;
  owner: string;       // engineer name
  part_id: string;
  qty: number;
  updated_at?: string;
}

export type EngMovementType = 'ISSUE' | 'USE' | 'ENG_RETURN' | 'WARRANTY_RETURN' | 'WARRANTY_DIRECT_IN' | 'ADJUST';

export interface EngMovement {
  id: string;
  created_at?: string;
  type: EngMovementType;
  part_id: string;
  qty: number;
  from_owner?: string | null;
  to_owner?: string | null;
  job_sheet?: string | null;
  warranty?: boolean;
  notes?: string | null;
  created_by?: string;
}