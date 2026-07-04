export interface WalkInProduct {
  type: 'Inward' | 'Outward' | 'For Checking Only';
  brand: string;
  model: string;
  serial: string;
  problem: string;
}

export interface WalkInEntry {
  id: string;
  token_no: number;
  customer_name: string;
  mobile: string;
  visit_date: string;
  arrival_time: string;
  departure_time?: string;
  wc_id: string;
  wc_name: string;
  products: WalkInProduct[];
  created_at: string;
}
