export type WalkInProductType = 'Inward' | 'Outward' | 'Other' | 'Purchase' | 'For Checking Only';

export interface WalkInProduct {
  brand: string;
  model: string;
  type: WalkInProductType;
  warranty: string; // 'In Warranty' | 'Out of Warranty' | 'Other' | '' — blank for Purchase/For Checking Only
  subtype: string;  // purpose id (repair/eol/cleaning/delivery/purchase) or purchase-type/condition text
  remarks: string;
  serial: string;
}

export interface WalkInEntry {
  id: string;
  token_no: number;
  customer_name: string;
  mobile: string;
  visit_date: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pin?: string | null;
  area?: string | null;
  arrival_time: string;
  departure_time?: string | null;
  wc_id: string;
  wc_name: string;
  products: WalkInProduct[];
  product_count: number;
  job_id?: string | null;
  created_at: string;
  updated_at?: string;
}

export const SELF_CHECKIN_WC_IDS = {
  ICP: 'SELF_CHECKIN_ICP',
  CSP: 'SELF_CHECKIN_CSP',
  OTHER: 'SELF_CHECKIN_OTHER',
} as const;

export const isSelfCheckin = (wcId: string) => wcId.startsWith('SELF_CHECKIN_');

export const emptyWalkInProduct = (): WalkInProduct => ({
  brand: '', model: '', type: 'Inward', warranty: '', subtype: '', remarks: '', serial: '',
});