// Special-access user IDs — mirrors HTML's window._isCspMgr check.
// session.user.email holds the login code (e.g. 'ENG001'), not a real email.
export const CSP_MANAGER_ID = 'ENG001';

export function isCspManager(session: any): boolean {
    return (session?.user as any)?.email === CSP_MANAGER_ID;
}

// The Accountant (ACCT001) — a role_type='work_controller' account that, unlike
// regular WCs, gets manager-level access to Payment Collection. Mirrors HTML's
// window._isAcct (currentUser.user_id==='ACCT001').
export const ACCOUNTANT_ID = 'ACCT001';

export function isAccountant(session: any): boolean {
    return (session?.user as any)?.email === ACCOUNTANT_ID;
}