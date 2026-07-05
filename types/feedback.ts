export interface CustomerFeedback {
    id: string;
    ticket_id?: string;
    customer_name?: string;
    mobile?: string;
    rating?: number;
    comment?: string;
    google_review?: boolean;
    engineer_name?: string;
    created_at?: string;
}

export interface FeedbackFilter {
    searchTerm?: string;
    rating?: number;
    googleOnly?: boolean;
}