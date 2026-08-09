// auto_msc_dispatch: id, ticket_id, msc_name, dispatch_date, courier_name,
//                    docket_no, received_date, dispatched_by, created_at, updated_at
export interface MSCDispatch {
    id?: number;
    ticket_id: string;
    msc_name?: string;
    dispatch_date?: string;
    courier_name?: string;
    docket_no?: string;
    received_date?: string;
    dispatched_by?: string;
    created_at?: string;
    updated_at?: string;
}