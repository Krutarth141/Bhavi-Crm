export type CourierDirection = 'Inward' | 'Outward';
export type ProductWarranty = 'In Warranty' | 'Out of Warranty' | 'Other';

export interface CourierProduct {
  model: string;
  serial: string;
  call_id: string;
  warranty: ProductWarranty;
  accessories: string[];
  condition?: string[];        // shown for both directions at add-time
  condition_note?: string;     // shown for both directions at add-time
  faulty_part?: 'Yes' | 'No';       // Outward only
  invoice_avail?: 'Yes' | 'No';     // Outward only
  invoice_amount?: string;          // Outward only
}

export interface ReceiverSnapshot {
  name: string;
  address: string;
  city: string;
  state: string;
  pin: string;
  phone: string;
  dc_amount?: string;
}

export interface CourierEntry {
  id: string;
  direction: CourierDirection;
  entry_date: string;
  awb_no: string;
  agency: string;
  person_name?: string | null;
  sender_mobile?: string | null;
  place: string;
  receiver_id?: string | null;
  receiver_data?: ReceiverSnapshot | null;
  weight?: number | null;
  products: CourierProduct[];
  product_count: number;
  wc_id: string;
  wc_name: string;
  dc_no?: string | null;
  dc_amount?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface CourierReceiver {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pin: string;
  phone: string;
  created_at?: string;
}

export const ACCESSORIES_LIST = [
  'Body Cap', 'Lens Cap Front', 'Lens Cap Rear', 'Both Lens Caps',
  'Eye Cap', 'UV Filter', 'Neck Strip', 'Battery', 'Nill', 'Memory card',
];

export const CONDITION_LIST = ['Good', 'Scratched', 'Cracked', 'Physical Damage', 'Water Damage'];

export const emptyCourierProduct = (): CourierProduct => ({
  model: '', serial: '', call_id: '', warranty: 'In Warranty', accessories: [],
  condition: [], condition_note: '',
  faulty_part: 'No', invoice_avail: 'No', invoice_amount: '',
});