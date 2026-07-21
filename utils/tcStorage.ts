export interface TCItem {
    text: string;
    isDefault: boolean;
}

export interface TCList {
    name: string;
    items: string[];
    savedAt: string;
}

const DEFAULT_TC: string[] = [
    'All above prices are supply only Ex-Ahmedabad. Prices are subject to exchange rate fluctuations.',
    'Warranty: The products offered carry warranty for a period of one year against all manufacturing defects as per our standard warranty clause.',
    'Payment: 100% with firm purchase order for ex-stock items. Otherwise 50% advance with order and balance 50% against proforma before despatch of material.',
    'Regulated and Stabilized Power should be available at the site and it is preferred to have a separate stabilized power for the above systems. All Electrical, Carpentry, Civil work will not be in our scope. You should provide required electrical powerpoints or cables at site/locations.',
    'Delivery Period: Ex-Stock and if not please consider delivery within 4 to 5 weeks from the date of order.',
    'Validity: 15 days from today.',
    'Installation charges are not included unless specifically mentioned in the quotation.',
    'Any additional cabling, conduit, or civil work required at site will be charged separately.',
    'This quotation is for the mentioned scope of work only. Any change in scope will require a revised quotation.',
    'All equipment remains the property of Bhavi Electronics & Automation until full payment is received.',
    'Technical support and AMC (Annual Maintenance Contract) available on request at additional cost.',
    'Remote configuration and commissioning charges will be billed separately if site visit is not feasible.',
];

const ITEMS_KEY = 'bhavi_tc_items';
const LISTS_KEY = 'bhavi_tc_lists';

export const getTCItems = (): TCItem[] => {
    try {
        const saved = localStorage.getItem(ITEMS_KEY);
        if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return DEFAULT_TC.map(text => ({ text, isDefault: true }));
};

export const saveTCItems = (items: TCItem[]) => {
    localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
};

export const getTCLists = (): TCList[] => {
    try {
        return JSON.parse(localStorage.getItem(LISTS_KEY) || '[]');
    } catch { return []; }
};

export const saveTCList = (list: TCList) => {
    const lists = getTCLists();
    const existingIdx = lists.findIndex(l => l.name === list.name);
    if (existingIdx >= 0) lists.splice(existingIdx, 1);
    lists.push(list);
    localStorage.setItem(LISTS_KEY, JSON.stringify(lists));
};

export const deleteTCListAt = (idx: number) => {
    const lists = getTCLists();
    lists.splice(idx, 1);
    localStorage.setItem(LISTS_KEY, JSON.stringify(lists));
};