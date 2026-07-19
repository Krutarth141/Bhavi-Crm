export const STATUS_FLOW = [
    'Pending Customer Arrival',
    'Pending Allocation',
    'Assigned',
    'In Progress',
    'Pending Repair Carry In',
    'Pending Repair On Site',
    'Pending Parts',
    'Pending Engineer Stock',
    'Pending Customer Approval',
    'Customer Approved',
    'Customer Reject',
    'Call Cancel',
    'Closed',
    'Repaired',
    'Sent to MSC',
    'Pending for Delivery',
    'Resolved By Phone',
];

export const TICKET_DONE_STATUSES = ['Closed', 'Delivered', 'Repaired', 'Pending for Delivery', 'Resolved By Phone'];
export const TICKET_CANCELLED_STATUSES = ['Call Cancel', 'Customer Reject'];

export const isTicketClosed = (status?: string) => TICKET_DONE_STATUSES.includes(status || '');
export const isTicketCancelled = (status?: string) => TICKET_CANCELLED_STATUSES.includes(status || '');
export const isTicketActive = (status?: string) => !isTicketClosed(status) && !isTicketCancelled(status);

export type TicketRole = 'admin' | 'work_controller' | 'engineer' | string;
export function getAllowedStatuses(
    current: string | undefined,
    role: TicketRole,
    serviceType?: string,
    callType?: string,
    warrantyStatus?: string
): string[] {
    const isEng = role === 'engineer';
    const isAdminOrWC = role === 'admin' || role === 'work_controller';
    const isRepeat = callType === 'Warranty Repeat' || callType === 'Non-Warranty Repeat';
    const isCarryIn = (serviceType || '').toLowerCase().includes('carry');

    if (['Closed', 'Customer Reject', 'Call Cancel', 'Delivered Not Approved', 'Delivered'].includes(current || '')) {
        return isAdminOrWC ? ['Assigned'] : [];
    }

    if (isAdminOrWC) {
        switch (current) {
            case 'Pending Customer Arrival': return ['Pending Allocation', 'Call Cancel'];
            case 'Pending Allocation': return ['Assigned', 'Pending Repair Carry In', 'Pending Repair On Site', 'Call Cancel'];
            case 'Pending Customer Approval': return ['Customer Approved', 'Customer Reject'];
            case 'Pending Engineer Stock': return ['In Progress', 'Assigned'];
            case 'Pending Parts': return ['In Progress', 'Assigned'];
            case 'Repaired': return ['Delivered', 'Sent to MSC'];
            case 'Sent to MSC': return [];
            case 'Pending for Delivery': return ['Delivered'];
            default: return [];
        }
    }

    if (isEng) {
        switch (current) {
            case 'Assigned':
                return isCarryIn
                    ? ['In Progress', 'Repaired', 'Sent to MSC', 'Call Cancel']
                    : ['In Progress', 'Closed', 'Resolved By Phone', 'Call Cancel'];

            case 'In Progress':
                if (isRepeat) return isCarryIn ? ['Closed', 'Call Cancel'] : ['Closed', 'Resolved By Phone', 'Call Cancel'];
                return isCarryIn
                    ? ['Repaired', 'Sent to MSC', 'Call Cancel']
                    : ['Closed', 'Resolved By Phone', 'Call Cancel'];

            case 'Pending Parts':
            case 'Pending Engineer Stock':
                return [];

            case 'Pending Repair Carry In':
                return ['Repaired', 'Sent to MSC', 'Call Cancel'];
            case 'Pending Repair On Site':
                return ['Closed', 'Sent to MSC', 'Call Cancel'];

            case 'Customer Approved':
            case 'Pending Customer Approval':
                return [];

            default:
                return [];
        }
    }

    return [];
}

export function validateStatusChangeReason(fromStatus: string | undefined, toStatus: string): string | null {
    if (['Closed', 'Customer Reject', 'Call Cancel'].includes(fromStatus || '')) {
        const reason = window.prompt('⚠️ Reopening closed ticket. Reason required:');
        return reason ? reason : null;
    }
    if (toStatus === 'Call Cancel') {
        const reason = window.prompt('Reason for cancellation:');
        return reason ? reason : null;
    }
    return '';
}