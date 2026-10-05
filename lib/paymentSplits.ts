export interface PaymentSplit {
    mode: string;
    amount: number;
}

// index.html:18834 — payment_mode stays a single readable string for
// backward compatibility with everywhere else that filters/displays on it:
// the mode name for the common single-split case, "Split (A + B)" once more
// than one mode is used.
export const summarizePaymentMode = (splits: PaymentSplit[]): string => {
    const named = splits.filter((s) => s.mode);
    if (named.length <= 1) return named[0]?.mode || '';
    return `Split (${named.map((s) => s.mode).join(' + ')})`;
};

// index.html:18825-18827 — every non-zero row needs a mode, and the rows
// must add up to the total. Returns an error message, or null when valid.
export const validatePaymentSplits = (splits: PaymentSplit[], total: number): string | null => {
    const real = splits.filter((s) => (Number(s.amount) || 0) > 0);
    if (!real.length) return 'Please enter at least one payment amount and mode.';
    if (real.some((s) => !s.mode)) return 'Please select a payment mode for every amount entered.';
    const sum = real.reduce((a, s) => a + (Number(s.amount) || 0), 0);
    if (Math.round(total - sum) !== 0) return 'The split amounts must add up to the Total Amount shown.';
    return null;
};
