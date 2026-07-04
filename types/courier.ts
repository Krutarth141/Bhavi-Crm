export interface CourierReceiver {
  id: string;
  name: string;
  address: string;
  mobile: string;
}

export interface CourierEntry {
  id: string;
  entry_date: string;
  type: 'Inward' | 'Outward';
  awb_no: string;
  agency: string;
  sender_name?: string;
  from_place?: string;
  to_place?: string;
  receiver_id?: string;
  weight?: number;
  description?: string;
  status: 'pending' | 'received' | 'dispatched';
  wc_id: string;
  wc_name: string;
  created_at: string;
}
