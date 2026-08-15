export interface CustomerSession {
    mobile: string;
    name: string;
}

export interface AccountStats {
    tickets: number;
    orders: number;
    active: number;
}

export interface SignupCheckResult {
    exists: boolean;
    hasPin: boolean;
    cname?: string;
}