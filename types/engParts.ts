// ─── Exact Supabase tables ────────────────────────────────────────────────────
// eng_stock:         id, owner (eng_name), part_id, qty
// eng_part_requests: id, action, part_id, eng_name, qty, ticket_id, note, status, created_at
// eng_parts:         parts catalog (if separate from inventory)

export interface EngStock {
  id: string;
  owner: string;       // engineer name
  part_id: string;
  qty: number;
}

export interface EngPartRequest {
  id: string;
  action: 'Issue' | 'Use' | 'Return' | 'Warranty Return' | 'Request' | 'Direct Warranty Issue';
  part_id: string;
  eng_name: string;
  qty: number;
  ticket_id?: string;
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at?: string;
}

// Keep EngStockLog as alias for backward compatibility with Kiro screens
export type EngStockLog = EngPartRequest;