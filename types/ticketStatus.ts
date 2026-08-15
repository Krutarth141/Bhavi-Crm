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

// Customer Reject counts as a CLOSED (done) call — the engineer visited and gave
// an estimate (with inspection charges), so it is real completed work, not a
// no-work cancel. Call Cancel stays cancelled (call dropped, no work done).
export const TICKET_DONE_STATUSES = ['Closed', 'Delivered', 'Repaired', 'Pending for Delivery', 'Resolved By Phone', 'Customer Reject'];
export const TICKET_CANCELLED_STATUSES = ['Call Cancel'];

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
                // Call Cancel is always available to the engineer directly — e.g.
                // customer not available at site, or charges not approved — no admin
                // approval needed, just a mandatory reason. Customer Reject: customer
                // had agreed earlier but backs out later — engineer sets it directly
                // with amount + remark, no admin approval hop needed.
                return isCarryIn
                    ? ['In Progress', 'Repaired', 'Sent to MSC', 'Customer Reject', 'Call Cancel']
                    : ['In Progress', 'Closed', 'Resolved By Phone', 'Customer Reject', 'Call Cancel'];

            case 'In Progress':
                if (isRepeat) return isCarryIn ? ['Closed', 'Customer Reject', 'Call Cancel'] : ['Closed', 'Resolved By Phone', 'Customer Reject', 'Call Cancel'];
                return isCarryIn
                    ? ['Repaired', 'Sent to MSC', 'Customer Reject', 'Call Cancel']
                    : ['Closed', 'Resolved By Phone', 'Customer Reject', 'Call Cancel'];

            case 'Pending Parts':
            case 'Pending Engineer Stock':
                // Waiting for parts/issue — engineer cannot change status manually,
                // except Customer Reject (customer can still back out while parts are pending).
                return ['Customer Reject'];

            case 'Pending Repair Carry In':
                return ['Repaired', 'Sent to MSC', 'Customer Reject', 'Call Cancel'];
            case 'Pending Repair On Site':
                return ['Closed', 'Sent to MSC', 'Customer Reject', 'Call Cancel'];

            case 'Customer Approved':
                return [];

            case 'Pending Customer Approval':
                // Engineer handles their own call's approval/rejection directly —
                // no need to wait on admin/WC.
                return ['Customer Approved', 'Customer Reject'];

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