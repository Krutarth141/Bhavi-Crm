// Special-access user IDs — mirrors HTML's window._isCspMgr check.
// session.user.email holds the login code (e.g. 'ENG001'), not a real email.
export const CSP_MANAGER_ID = 'ENG001';

export function isCspManager(session: any): boolean {
    return (session?.user as any)?.email === CSP_MANAGER_ID;
}

// Confirmed NOT needed as a separate check: ACCT001 (Accountant) has
// role_type='work_controller' in the DB (same as regular Work Controllers —
// see HTML's renderTickets(), which nests the ACCT001 check *inside* the
// role_type==='work_controller' branch). Next.js's fetchTicketsForUser()
// already fetches ALL tickets for role_type='work_controller' with no
// wc_type sub-filter (that ICP/CSP filtering was never ported), so ACCT001
// already gets "sees all tickets" + invoice-marking access for free via the
// existing work_controller checks. No accountant-specific code needed.